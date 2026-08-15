import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(rootDirectory, 'Output Files');
const applicationUrl = 'http://127.0.0.1:3000/';
const modelsUrl = 'http://127.0.0.1:1234/v1/models';
const proxyUrl = 'http://127.0.0.1:1235/v1/models';
const inferenceTimeout = Number(process.env.E2E_INFERENCE_TIMEOUT_MS || 180000);
const titles = ['The Picky Pet', 'Space Miner', 'Bluetooth Content Share', 'Tiny Garden', 'Nimbus Runner'];
const titleIndex = Number(process.env.E2E_TITLE_INDEX || Math.floor(Date.now() / 1000) % titles.length) % titles.length;
const projectTitle = titles[titleIndex];

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function waitFor(check, message, timeout = inferenceTimeout) {
  for (let elapsed = 0; elapsed < timeout; elapsed += 500) {
    if (await check()) return;
    await sleep(500);
  }
  throw new Error(message);
}

async function startServer() {
  const server = spawn('npm', ['run', 'dev', '--', '--port', '3000', '--host', '127.0.0.1'], {
    cwd: rootDirectory,
    shell: true,
    stdio: 'pipe',
  });
  server.stdout?.on('data', chunk => process.stdout.write(`[vite] ${chunk}`));
  server.stderr?.on('data', chunk => process.stderr.write(`[vite] ${chunk}`));
  await waitFor(async () => {
    try { return (await fetch(applicationUrl)).ok; } catch { return false; }
  }, `Vite did not start at ${applicationUrl}.`);
  return server;
}

async function startProxy() {
  const proxy = spawn('node', ['scripts/lm-proxy.js'], {
    cwd: rootDirectory,
    stdio: 'pipe',
  });
  proxy.stdout?.on('data', chunk => process.stdout.write(`[lm-proxy] ${chunk}`));
  proxy.stderr?.on('data', chunk => process.stderr.write(`[lm-proxy] ${chunk}`));
  await waitFor(async () => {
    try { return (await fetch(proxyUrl)).ok; } catch { return false; }
  }, `The LM Studio CORS proxy did not start at ${proxyUrl}.`);
  const preflight = await fetch('http://127.0.0.1:1235/v1/chat/completions', {
    method: 'OPTIONS',
    headers: { Origin: 'http://127.0.0.1:3000', 'Access-Control-Request-Method': 'POST' },
  });
  if (preflight.status !== 204 || preflight.headers.get('access-control-allow-origin') !== 'http://127.0.0.1:3000') {
    proxy.kill('SIGTERM');
    throw new Error('The LM Studio proxy did not return the required CORS preflight headers.');
  }
  return proxy;
}

async function clickChatHelper(page) {
  const input = page.locator('textarea').first();
  const helper = page.locator('button[aria-label="Get AI suggestion"]');
  const previous = await input.inputValue();
  await helper.click();
  await waitFor(async () => {
    const value = await input.inputValue();
    return value.trim().length >= 20 && value !== previous;
  }, 'The conversation helper did not populate a meaningful response.');
  await input.press('Enter');
}

async function reachCritique(page) {
  const generate = page.locator('button:has-text("Generate GDD / PRD")').first();
  for (let turn = 0; turn < 6; turn += 1) {
    if (await generate.isVisible() && await generate.isEnabled()) {
      await generate.click();
      return;
    }
    await clickChatHelper(page);
  }
  throw new Error('The helper-driven discovery flow did not reach the critique handoff.');
}

async function fillCritiqueWithHelpers(page) {
  const fields = page.locator('textarea[id^="critique-q-"]');
  await fields.first().waitFor({ state: 'visible', timeout: inferenceTimeout });
  const count = await fields.count();
  if (!count) throw new Error('The critique returned no questions.');
  for (let index = 0; index < count; index += 1) {
    const field = fields.nth(index);
    const helper = page.locator(`button[aria-label="Get AI suggestion for question ${index + 1}"]`);
    await helper.click();
    await waitFor(async () => (await field.inputValue()).trim().length >= 20, `Critique helper ${index + 1} did not populate a meaningful answer.`);
  }
}

async function waitForGenerated(button, label, timeout) {
  await waitFor(async () => {
    const className = await button.locator('h4').first().getAttribute('class').catch(() => '');
    return Boolean(className?.includes('text-green-400'));
  }, `${label} did not complete.`, timeout);
}

async function runGenerationStep(page, label, selector, afterClick, timeout = inferenceTimeout) {
  const button = page.locator(selector).first();
  await button.waitFor({ state: 'visible', timeout: inferenceTimeout });
  await waitFor(() => button.isEnabled(), `${label} never became available.`);
  await button.click();
  if (afterClick) await afterClick();
  await waitForGenerated(button, label, timeout);
}

async function downloadAndVerify(page) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const menu = page.locator('button:has-text("Download Full Project")').first();
  const formats = [['HTML Format', 'html'], ['Markdown Format', 'md'], ['Plain Text Format', 'txt'], ['JSON Package', 'json']];
  for (const [label, extension] of formats) {
    const option = page.locator(`button:has-text("${label}")`).first();
    if (!await option.isVisible()) await menu.click();
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), option.click()]);
    const destination = path.join(outputDirectory, await download.suggestedFilename());
    await download.saveAs(destination);
    const content = fs.readFileSync(destination, 'utf8');
    if (!content.includes(projectTitle)) throw new Error(`${extension} export does not contain the active project title.`);
    if (/Define the project overview|Content could not be generated|No specific concern was identified/i.test(content)) {
      throw new Error(`${extension} export contains forbidden placeholder content.`);
    }
    if (extension === 'json') {
      const projectPackage = JSON.parse(content);
      const requiredCollections = ['gddContent', 'pitchDeckContent', 'mvpFeatureSpecs', 'tddContent', 'technicalDesignDocument', 'modularBreakdown', 'scopeReviewContent'];
      const missing = requiredCollections.filter(key => !Array.isArray(projectPackage[key]) || projectPackage[key].length === 0);
      if (!projectPackage.mvpDefinition || !projectPackage.assetList || missing.length) throw new Error(`JSON export is incomplete: ${missing.join(', ')}`);
    }
  }
}

async function run() {
  const modelsResponse = await fetch(modelsUrl);
  if (!modelsResponse.ok) throw new Error(`LM Studio is unavailable at ${modelsUrl}.`);
  const models = (await modelsResponse.json()).data?.map(model => model.id).filter(Boolean) || [];
  if (!models.length) throw new Error('LM Studio has no loaded models.');
  console.log(`Running real LM Studio E2E for "${projectTitle}" with available models: ${models.join(', ')}`);

  const proxy = await startProxy();
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const requestFailures = [];
    page.on('console', message => {
      if (message.type() === 'error') console.error(`[browser console] ${message.text()}`);
    });
    page.on('pageerror', error => console.error(`[browser] ${error.message}`));
    page.on('requestfailed', request => {
      const failure = request.failure()?.errorText || 'unknown request failure';
      requestFailures.push(`${request.method()} ${request.url()}: ${failure}`);
      console.error(`[request failed] ${request.method()} ${request.url()}: ${failure}`);
    });
    await page.goto(applicationUrl, { waitUntil: 'networkidle', timeout: 60000 });
    const input = page.locator('textarea').first();
    await input.fill(projectTitle);
    await input.press('Enter');
    await reachCritique(page);
    await fillCritiqueWithHelpers(page);
    const compile = page.locator('button:has-text("Incorporate Feedback & Generate Document")');
    await waitFor(() => compile.isEnabled(), 'The critique compile button never became available.');
    await compile.click();
    await page.locator('h3:has-text("Design Document (GDD/PRD)")').waitFor({ state: 'visible', timeout: inferenceTimeout });

    await runGenerationStep(page, 'Pitch Deck', 'button:has-text("Generate Pitch Deck")', undefined, 360000);
    await runGenerationStep(page, 'Asset List', 'button:has-text("Generate Asset List")');
    await runGenerationStep(page, 'Scope Review', 'button:has-text("Run Scope Critique"), button:has-text("Run Scope")', async () => {
      await page.locator('button:has-text("Indie Lens")').click();
    });
    const closeScopeReview = page.locator('button:has-text("Close")').last();
    await closeScopeReview.waitFor({ state: 'visible', timeout: inferenceTimeout });
    await closeScopeReview.click();
    await runGenerationStep(page, 'MVP', 'button:has-text("Define MVP")');
    await runGenerationStep(page, 'MVP Feature Specs', 'button:has-text("Generate MVP Feature Specs")');
    await runGenerationStep(page, 'Final TDD', 'button:has-text("Assemble Final TDD")');
    await runGenerationStep(page, 'Freelance Briefs', 'button:has-text("Generate Freelance Briefs")');
    if (requestFailures.length) throw new Error(`Browser request failures occurred: ${requestFailures.join(' | ')}`);
    await downloadAndVerify(page);
    console.log('Real LM Studio helper-driven E2E passed.');
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
    proxy.kill('SIGTERM');
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});