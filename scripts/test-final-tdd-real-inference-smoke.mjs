import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pako from 'pako';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsUrl = 'http://127.0.0.1:1234/v1/models';
const proxyUrl = 'http://127.0.0.1:1235/v1/models';
const exactQwenModel = 'qwen/qwen3.5-9b';
const fixture = JSON.parse(readFileSync(path.join(root, 'Output Files/Gemini3.7Flash/Space_Marines_Project_Package.json'), 'utf8'));
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function availablePort(preferred = 3010) {
  for (let port = preferred; port < preferred + 20; port += 1) {
    const available = await new Promise(resolve => {
      const probe = net.createServer();
      probe.once('error', () => resolve(false));
      probe.once('listening', () => probe.close(() => resolve(true)));
      probe.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error('No Vite port is available for the Final TDD smoke test.');
}

async function waitForUrl(url, message) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await sleep(500);
  }
  throw new Error(message);
}

const project = {
  id: 'final-tdd-real-inference', projectName: 'Space Marines Final TDD', lastModified: Date.now(), workflowState: 3, projectType: 'GAME',
  chatHistory: fixture.chatHistory, critiqueData: { summary: fixture.critiqueQA.summary, questions: fixture.critiqueQA.questions }, critiqueAnswers: fixture.critiqueQA.answers,
  critiqueRecord: fixture.critiqueRecord, expandedText: fixture.expandedText, gddContent: fixture.gddContent, pitchDeckContent: fixture.pitchDeckContent,
  generatedImages: fixture.generatedImages || {}, mvpDefinition: fixture.mvpDefinition, mvpFeatureSpecs: fixture.mvpFeatureSpecs,
  mvpFeatureSpecValidation: fixture.mvpFeatureSpecValidation || [], tddContent: fixture.tddContent, technicalDesignDocument: null,
  assetList: fixture.assetList, scopeReviewContent: fixture.scopeReviewContent, scopeReviewLens: null, modularBreakdown: null,
  gddGenerated: true, pitchDeckGenerated: true, mvpGenerated: true, tddSpecsGenerated: true, tddDocGenerated: false,
  assetListGenerated: Boolean(fixture.assetList), scopeReviewGenerated: Boolean(fixture.scopeReviewContent), modularBreakdownGenerated: false, costUSD: 0,
};
const historyValue = Buffer.from(pako.deflate(JSON.stringify([project]))).toString('base64');

const modelsResponse = await fetch(modelsUrl).catch(() => null);
if (!modelsResponse?.ok) throw new Error(`LM Studio is unavailable at ${modelsUrl}.`);
const exactQwenLoaded = (await modelsResponse.json()).data?.some(model => model.id === exactQwenModel);
if (!exactQwenLoaded) throw new Error(`The configured exact Qwen model ${exactQwenModel} was not reported by LM Studio.`);
console.log(`Running isolated Final TDD smoke with ${exactQwenModel}.`);

const port = await availablePort(Number(process.env.E2E_FINAL_TDD_SMOKE_PORT || 3010));
const appUrl = `http://127.0.0.1:${port}/`;
const server = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], { cwd: root, env: { ...process.env, VITE_MVP_FEATURE_SPEC_TIMEOUT_MS: process.env.MVP_FEATURE_SPEC_TIMEOUT_MS || '300000' }, shell: true, stdio: 'pipe' });
const proxy = spawn('node', ['scripts/lm-proxy.js'], { cwd: root, stdio: 'pipe' });
server.stdout?.on('data', chunk => process.stdout.write(`[vite] ${chunk}`));
server.stderr?.on('data', chunk => process.stderr.write(`[vite] ${chunk}`));
proxy.stdout?.on('data', chunk => process.stdout.write(`[lm-proxy] ${chunk}`));
proxy.stderr?.on('data', chunk => process.stderr.write(`[lm-proxy] ${chunk}`));

let browser;
try {
  await Promise.all([waitForUrl(appUrl, `Vite did not start at ${appUrl}.`), waitForUrl(proxyUrl, `Proxy did not start at ${proxyUrl}.`)]);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addInitScript(({ value }) => localStorage.setItem('devDoctorAiProjectHistories', value), { value: historyValue });
  const page = await context.newPage();
  const browserErrors = [];
  const requestFailures = [];
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('requestfailed', request => requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'unknown failure'}`));
  await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.getByRole('button', { name: 'AI provider settings' }).click();
  await page.locator('input[name="providerType"]').first().check();
  const qwenOption = page.locator(`option[value="${exactQwenModel}"]`);
  assert.equal(await qwenOption.count(), 1, `The exact Qwen model ${exactQwenModel} must be present in the local provider UI.`);
  await qwenOption.locator('..').selectOption(exactQwenModel);
  assert.equal(await page.locator('input[name="providerType"]').first().isChecked(), true, 'Final TDD smoke must use Local (LM Studio).');
  assert.equal(await page.locator('input[name="providerType"]').nth(1).isChecked(), false, 'Final TDD smoke must not use a cloud provider.');
  assert.equal(await qwenOption.locator('..').inputValue(), exactQwenModel, `Final TDD smoke must use ${exactQwenModel} exactly.`);
  await page.getByRole('button', { name: 'Close provider settings' }).click();
  await page.locator('h2:has-text("Rich project package")').waitFor({ timeout: 60_000 });
  const button = page.locator('button:has-text("Assemble Final TDD")').first();
  await button.click();
  const deadline = Date.now() + Number(process.env.E2E_FINAL_TDD_TIMEOUT_MS || 600_000);
  while (Date.now() < deadline) {
    const workflowError = await page.locator('[data-testid="workflow-error"]').innerText().catch(() => '');
    const error = workflowError.trim() || browserErrors.find(message => /Failed to generate TDD Doc|invalid technical design document|process is not defined/i.test(message));
    if (error) throw new Error(`Final TDD failed in the browser: ${error}`);
    if (Boolean((await button.locator('h4').getAttribute('class').catch(() => ''))?.includes('text-green-400'))) break;
    await sleep(500);
  }
  if (!Boolean((await button.locator('h4').getAttribute('class').catch(() => ''))?.includes('text-green-400'))) throw new Error('Final TDD did not complete before its isolated timeout.');
  if (requestFailures.length) throw new Error(`Browser request failures occurred: ${requestFailures.join(' | ')}`);

  let generated = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const saved = await page.evaluate(() => localStorage.getItem('devDoctorAiProjectHistories'));
    if (saved) {
      const histories = JSON.parse(pako.inflate(Buffer.from(saved, 'base64'), { to: 'string' }));
      generated = histories.find(candidate => candidate.id === project.id);
      if (generated?.technicalDesignDocument?.length) break;
    }
    await sleep(500);
  }
  if (!generated?.technicalDesignDocument?.length) throw new Error('The generated Final TDD was not persisted.');
  if (generated.technicalDesignDocument.some(section => !section.title?.trim() || !section.content?.trim())) throw new Error('The persisted Final TDD contains an empty section.');
  console.log(`Isolated Final TDD smoke passed with ${generated.technicalDesignDocument.length} sections.`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  proxy.kill('SIGTERM');
}