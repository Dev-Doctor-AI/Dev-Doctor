import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { waitForProgressAwareCompletion } from './e2e-progress-waiter.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(rootDirectory, 'Output Files');
let applicationUrl = '';
const modelsUrl = 'http://127.0.0.1:1234/v1/models';
const proxyUrl = 'http://127.0.0.1:1235/v1/models';
// Local LM Studio runs are intentionally long: sequential feature generation and
// schema-repair requests can each take several minutes. Override this only when
// deliberately running a shorter smoke test.
const inferenceTimeout = Number(process.env.E2E_INFERENCE_TIMEOUT_MS || 600000);
const titles = ['The Picky Pet', 'Space Miner', 'Bluetooth Content Share', 'Tiny Garden', 'Nimbus Runner'];
const titleIndex = Number(process.env.E2E_TITLE_INDEX || Math.floor(Date.now() / 1000) % titles.length) % titles.length;
const projectTitle = titles[titleIndex];
let activeBrowserErrors = [];

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function waitFor(check, message, timeout = inferenceTimeout) {
  for (let elapsed = 0; elapsed < timeout; elapsed += 500) {
    if (await check()) return;
    await sleep(500);
  }
  throw new Error(message);
}

async function getAvailablePort(preferredPort = 3000) {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    const available = await new Promise(resolve => {
      const probe = net.createServer();
      probe.once('error', () => resolve(false));
      probe.once('listening', () => probe.close(() => resolve(true)));
      probe.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error(`No available local Vite port found near ${preferredPort}.`);
}

async function startServer() {
  const port = await getAvailablePort(Number(process.env.E2E_APP_PORT || 3000));
  applicationUrl = `http://127.0.0.1:${port}/`;
  const server = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
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
    headers: { Origin: applicationUrl.replace(/\/$/, ''), 'Access-Control-Request-Method': 'POST' },
  });
  if (preflight.status !== 204 || preflight.headers.get('access-control-allow-origin') !== applicationUrl.replace(/\/$/, '')) {
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
    const previous = await field.inputValue();
    await helper.click();
    await waitFor(async () => {
      const value = await field.inputValue();
      return value.trim().length > 0 && value !== previous;
    }, `Critique helper ${index + 1} did not populate a non-empty answer.`);
  }
}

async function waitForGenerated(button, label, timeout) {
  await waitFor(async () => {
    const generationError = activeBrowserErrors.find(message => /Failed to generate|LM Studio returned an invalid|generation failed/i.test(message));
    if (generationError) throw new Error(`${label} failed in the browser: ${generationError}`);
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

async function runProgressAwareGenerationStep(page, label, selector, expectedStage) {
  const button = page.locator(selector).first();
  await button.waitFor({ state: 'visible', timeout: inferenceTimeout });
  await waitFor(() => button.isEnabled(), `${label} never became available.`);
  await button.click();
  await waitForProgressAwareCompletion({
    page,
    label,
    expectedStage,
    inactivityTimeoutMs: Number(process.env.E2E_PROGRESS_INACTIVITY_MS || inferenceTimeout),
    hardTimeoutMs: Number(process.env.E2E_MVP_HARD_TIMEOUT_MS || 3_600_000),
    completed: async () => Boolean((await button.locator('h4').first().getAttribute('class').catch(() => ''))?.includes('text-green-400')),
    getError: async () => activeBrowserErrors.find(message => /Failed to generate|LM Studio returned an invalid|generation failed/i.test(message)) || null,
  });
}

async function verifyRichResultsPresentation(page) {
  const preview = page.locator(`iframe[title="${projectTitle} rich package preview"]`);
  await preview.waitFor({ state: 'visible', timeout: inferenceTimeout });
  const frame = page.frames().find(candidate => candidate !== page.mainFrame() && candidate.url() === 'about:srcdoc');
  if (!frame) throw new Error('The generated rich package preview iframe did not load its srcDoc.');

  await frame.locator('nav.toc').waitFor({ state: 'visible', timeout: inferenceTimeout });
  const tocLinks = frame.locator('nav.toc a[href^="#"]');
  const tocCount = await tocLinks.count();
  if (!tocCount) throw new Error('The generated rich package has no navigation links.');
  for (let index = 0; index < Math.min(tocCount, 8); index += 1) {
    const target = await tocLinks.nth(index).getAttribute('href');
    if (!target || await frame.locator(target).count() === 0) throw new Error(`Rich package navigation target is missing: ${target}`);
  }

  const panels = frame.locator('details.package-section');
  const panelCount = await panels.count();
  if (panelCount < 2) throw new Error(`Expected at least two collapsible rich package sections, found ${panelCount}.`);
  const firstPanel = panels.first();
  await firstPanel.locator('summary').click();
  if (await firstPanel.getAttribute('open') !== null) throw new Error('Rich package section did not collapse.');
  await firstPanel.locator('summary').click();
  if (await firstPanel.getAttribute('open') === null) throw new Error('Rich package section did not reopen.');

  const imageSources = await frame.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src') || ''));
  if (imageSources.some(source => source.includes('Image generation coming soon'))) {
    throw new Error('Image placeholder text was incorrectly emitted as an image source.');
  }
  console.log(`  ✓ Rich preview: ${tocCount} navigation links, ${panelCount} collapsible sections, ${imageSources.length} rendered images.`);

  await page.getByRole('button', { name: 'Show sections' }).click();
  await page.locator('h3:has-text("Design Document (GDD/PRD)")').waitFor({ state: 'visible', timeout: inferenceTimeout });
  if (!await page.locator('h3:has-text("Pitch Deck")').count()) throw new Error('Legacy section viewers are not accessible from results.');
  console.log('  ✓ Legacy section viewers remain accessible.');
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
      console.log(`  ✓ JSON package contains ${projectPackage.gddContent.length} GDD sections, ${projectPackage.mvpFeatureSpecs.length} MVP specs, ${projectPackage.tddContent.length} TDD features.`);
    }
    if (extension === 'html') {
      const richMarkers = [
        [/<nav\b[^>]*(?:id=["']toc["']|class=["'][^"']*\btoc\b[^"']*["'])[^>]*>/i, 'table-of-contents navigation'],
        [/<a\b[^>]*href=["']#section-[^"']+["']/i, 'section navigation link'],
        [/<details\b[^>]*>/i, 'collapsible section'],
        [/<main\b[^>]*>/i, 'main content region'],
      ];
      for (const [pattern, label] of richMarkers) {
        if (!pattern.test(content)) throw new Error(`HTML export is missing rich presentation marker: ${label}`);
      }
      console.log('  ✓ HTML package contains rich navigation and collapsible sections.');
    }
    if (extension === 'md' && !content.includes('## Conversation and Critique')) {
      throw new Error('Markdown export is missing the discovery chat and critique section.');
    }
    if (extension === 'txt' && !content.includes('DESIGN DOCUMENT')) {
      throw new Error('Plain text export is missing the design document section.');
    }
  }
}

async function run() {
  const modelsResponse = await fetch(modelsUrl);
  if (!modelsResponse.ok) throw new Error(`LM Studio is unavailable at ${modelsUrl}.`);
  const models = (await modelsResponse.json()).data?.map(model => model.id).filter(Boolean) || [];
  if (!models.length) throw new Error('LM Studio has no loaded models.');
  console.log(`Running real LM Studio E2E for "${projectTitle}" with available models: ${models.join(', ')}`);

  const server = await startServer();
  const proxy = await startProxy();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const requestFailures = [];
    let successfulInferenceResponses = 0;
    activeBrowserErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        activeBrowserErrors.push(message.text());
        console.error(`[browser console] ${message.text()}`);
      }
    });
    page.on('pageerror', error => {
      activeBrowserErrors.push(error.message);
      console.error(`[browser] ${error.message}`);
    });
    page.on('requestfailed', request => {
      const failure = request.failure()?.errorText || 'unknown request failure';
      requestFailures.push(`${request.method()} ${request.url()}: ${failure}`);
      console.error(`[request failed] ${request.method()} ${request.url()}: ${failure}`);
    });
    page.on('response', response => {
      if (response.ok() && /\/v1\/chat\/completions(?:\?|$)/.test(response.url())) successfulInferenceResponses += 1;
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
    const richPackageHeading = page.locator('h2:has-text("Rich project package")');
    await waitForProgressAwareCompletion({
      page,
      label: 'Core document compile',
      expectedStage: 'gdd',
      inactivityTimeoutMs: Number(process.env.E2E_PROGRESS_INACTIVITY_MS || inferenceTimeout),
      hardTimeoutMs: Number(process.env.E2E_COMPILE_HARD_TIMEOUT_MS || 3_600_000),
      completed: () => richPackageHeading.isVisible().catch(() => false),
      getActivitySequence: () => successfulInferenceResponses,
      getError: async () => activeBrowserErrors.find(message => /Failed to generate GDD|LM Studio returned an invalid|generation failed/i.test(message)) || null,
    });

    await runGenerationStep(page, 'Pitch Deck', 'button:has-text("Generate Pitch Deck")');
    await runGenerationStep(page, 'Asset List', 'button:has-text("Generate Asset List")');
    await runGenerationStep(page, 'Scope Review', 'button:has-text("Run Scope Critique"), button:has-text("Run Scope")', async () => {
      await page.locator('button:has-text("Indie Lens")').click();
    });
    const closeScopeReview = page.locator('button:has-text("Close")').last();
    await closeScopeReview.waitFor({ state: 'visible', timeout: inferenceTimeout });
    await closeScopeReview.click();
    await runGenerationStep(page, 'MVP', 'button:has-text("Define MVP")');
    await runProgressAwareGenerationStep(page, 'MVP Feature Specs', 'button:has-text("Generate MVP Feature Specs")', 'tdd_specs');
    await runGenerationStep(page, 'Final TDD', 'button:has-text("Assemble Final TDD")');
    await runGenerationStep(page, 'Freelance Briefs', 'button:has-text("Generate Freelance Briefs")');
    if (requestFailures.length) throw new Error(`Browser request failures occurred: ${requestFailures.join(' | ')}`);
    await verifyRichResultsPresentation(page);
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