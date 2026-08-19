import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pako from 'pako';
import { waitForProgressAwareCompletion } from './e2e-progress-waiter.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsUrl = 'http://127.0.0.1:1234/v1/models';
const proxyUrl = 'http://127.0.0.1:1235/v1/models';
const featureNames = [
  'Squad ready check before mission launch',
  'Downed marine revival under alien pressure',
];
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
  throw new Error('No Vite port is available for the bounded MVP smoke test.');
}

async function waitForUrl(url, message) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await sleep(500);
  }
  throw new Error(message);
}

const project = {
  id: 'bounded-mvp-real-inference',
  projectName: 'Space Marines Bounded MVP',
  lastModified: Date.now(),
  workflowState: 3,
  projectType: 'GAME',
  chatHistory: fixture.chatHistory,
  critiqueData: { summary: fixture.critiqueQA.summary, questions: fixture.critiqueQA.questions },
  critiqueAnswers: fixture.critiqueQA.answers,
  critiqueRecord: fixture.critiqueRecord,
  expandedText: fixture.expandedText,
  gddContent: fixture.gddContent,
  pitchDeckContent: fixture.pitchDeckContent,
  generatedImages: fixture.generatedImages || {},
  mvpDefinition: { summary: 'A bounded real-inference test of two cooperative squad systems.', inScope: featureNames, outOfScope: ['Additional missions and progression'] },
  mvpFeatureSpecs: null,
  mvpFeatureSpecValidation: [],
  tddContent: null,
  technicalDesignDocument: null,
  assetList: fixture.assetList,
  scopeReviewContent: fixture.scopeReviewContent,
  scopeReviewLens: null,
  modularBreakdown: null,
  gddGenerated: true,
  pitchDeckGenerated: true,
  mvpGenerated: true,
  tddSpecsGenerated: false,
  tddDocGenerated: false,
  assetListGenerated: Boolean(fixture.assetList),
  scopeReviewGenerated: Boolean(fixture.scopeReviewContent),
  modularBreakdownGenerated: false,
  costUSD: 0,
};
const compressed = pako.deflate(JSON.stringify([project]));
const historyValue = Buffer.from(compressed).toString('base64');

const modelsResponse = await fetch(modelsUrl).catch(() => null);
if (!modelsResponse?.ok) throw new Error(`LM Studio is unavailable at ${modelsUrl}. Start LM Studio before running this real-inference smoke test.`);
const exactQwenModel = (await modelsResponse.json()).data?.some(model => model.id === 'qwen/qwen3.5-9b');
if (!exactQwenModel) throw new Error('The configured exact Qwen model qwen/qwen3.5-9b was not reported by LM Studio.');
console.log('Running bounded two-feature MVP smoke with the configured Qwen model.');

const port = await availablePort(Number(process.env.E2E_MVP_SMOKE_PORT || 3010));
const appUrl = `http://127.0.0.1:${port}/`;
const server = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], { cwd: root, env: { ...process.env, VITE_MVP_FEATURE_SPEC_TIMEOUT_MS: process.env.MVP_FEATURE_SPEC_TIMEOUT_MS || '300000' }, shell: true, stdio: 'pipe' });
const proxy = spawn('node', ['scripts/lm-proxy.js'], { cwd: root, stdio: 'pipe' });
server.stdout?.on('data', chunk => process.stdout.write(`[vite] ${chunk}`));
server.stderr?.on('data', chunk => process.stderr.write(`[vite] ${chunk}`));
proxy.stdout?.on('data', chunk => process.stdout.write(`[lm-proxy] ${chunk}`));
proxy.stderr?.on('data', chunk => process.stderr.write(`[lm-proxy] ${chunk}`));

let browser;
try {
  await Promise.all([
    waitForUrl(appUrl, `Vite did not start at ${appUrl}.`),
    waitForUrl(proxyUrl, `The LM Studio proxy did not start at ${proxyUrl}.`),
  ]);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addInitScript(({ value }) => localStorage.setItem('devDoctorAiProjectHistories', value), { value: historyValue });
  const page = await context.newPage();
  const browserErrors = [];
  const requestFailures = [];
  page.on('console', async message => {
    if (message.type() === 'error') browserErrors.push(message.text());
    if (message.text().includes('mvp_feature_spec_repair_diagnostic')) {
      const values = await Promise.all(message.args().map(argument => argument.jsonValue().catch(() => argument.toString())));
      console.log(`[browser diagnostic] ${JSON.stringify(values)}`);
    }
  });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('requestfailed', request => requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'unknown failure'}`));

  await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.getByRole('button', { name: 'AI provider settings' }).click();
  await page.locator('input[name="providerType"]').first().check();
  const qwenOption = page.locator('option[value="qwen/qwen3.5-9b"]');
  assert.equal(await qwenOption.count(), 1, 'The exact Qwen model option must be present in the local provider UI.');
  await qwenOption.locator('..').selectOption('qwen/qwen3.5-9b');
  assert.equal(await page.locator('input[name="providerType"]').first().isChecked(), true, 'MVP smoke must use Local (LM Studio).');
  assert.equal(await page.locator('input[name="providerType"]').nth(1).isChecked(), false, 'MVP smoke must not use a cloud provider.');
  assert.equal(await qwenOption.locator('..').inputValue(), 'qwen/qwen3.5-9b', 'MVP smoke must use qwen/qwen3.5-9b exactly.');
  await page.getByRole('button', { name: 'Close provider settings' }).click();
  await page.locator('h2:has-text("Rich project package")').waitFor({ state: 'visible', timeout: 60_000 });
  const button = page.locator('button:has-text("Generate MVP Feature Specs")').first();
  await button.waitFor({ state: 'visible' });
  await button.click();

  await waitForProgressAwareCompletion({
    page,
    label: 'Bounded MVP feature-spec stage',
    expectedStage: 'tdd_specs',
    inactivityTimeoutMs: Number(process.env.E2E_PROGRESS_INACTIVITY_MS || 420_000),
    hardTimeoutMs: Number(process.env.E2E_MVP_SMOKE_HARD_TIMEOUT_MS || 1_800_000),
    completed: async () => Boolean((await button.locator('h4').getAttribute('class').catch(() => ''))?.includes('text-green-400')),
    getError: async () => {
      const workflowError = await page.locator('[data-testid="workflow-error"]').innerText().catch(() => '');
      return workflowError.trim() || browserErrors.find(message => /Failed to generate|returned an invalid|generation failed|process is not defined/i.test(message)) || null;
    },
  });

  if (requestFailures.length) throw new Error(`Browser request failures occurred: ${requestFailures.join(' | ')}`);
  let saved = null;
  let generated = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    saved = await page.evaluate(() => localStorage.getItem('devDoctorAiProjectHistories'));
    if (saved) {
      const histories = JSON.parse(pako.inflate(Buffer.from(saved, 'base64'), { to: 'string' }));
      generated = histories.find(candidate => candidate.id === 'bounded-mvp-real-inference');
      if (generated?.mvpFeatureSpecs?.length === featureNames.length && generated?.tddContent?.length === featureNames.length) break;
    }
    await sleep(500);
  }
  if (!saved) throw new Error('The bounded generated project was not persisted.');
  if (generated?.mvpFeatureSpecs?.length !== featureNames.length || generated?.tddContent?.length !== featureNames.length) {
    throw new Error(`Expected ${featureNames.length} persisted MVP specs and TDD features; received ${generated?.mvpFeatureSpecs?.length || 0} and ${generated?.tddContent?.length || 0}.`);
  }
  if (generated.mvpFeatureSpecValidation?.some(outcome => !outcome.valid)) throw new Error('A persisted bounded MVP feature failed validation.');
  console.log(`Bounded real-inference MVP smoke passed with ${generated.mvpFeatureSpecs.length} validated feature specifications.`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  proxy.kill('SIGTERM');
}