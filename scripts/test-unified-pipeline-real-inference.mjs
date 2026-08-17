import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import pako from 'pako';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const timeoutMs = Number(process.env.E2E_PIPELINE_TIMEOUT_MS || 1_800_000);

async function port(preferred) {
  for (let value = preferred; value < preferred + 20; value += 1) {
    const available = await new Promise(resolve => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(value, '127.0.0.1');
    });
    if (available) return value;
  }
  throw new Error('No available port for unified pipeline smoke.');
}

async function waitForUrl(url, label) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await sleep(500);
  }
  throw new Error(`${label} unavailable at ${url}.`);
}

const questions = ['Which platform is required?', 'What is the core loop?', 'What is the delivery constraint?'];
const project = {
  id: 'full-unified-pipeline-real-inference', projectName: 'Garden Quest', lastModified: Date.now(), workflowState: 3, projectType: 'GAME',
  chatHistory: [{ sender: 'ai', text: 'Garden Quest is an offline family tablet gardening game.' }, { sender: 'user', text: 'The player plants, grows, and harvests magical crops with family members.' }],
  critiqueData: { summary: 'Technical review completed.', questions },
  critiqueAnswers: ['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'],
  critiqueRecord: { summary: 'Technical review completed.', questions, answers: ['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'], completed: true, source: 'technical-analyst' },
  transcriptRecord: { messages: [], preservedInFull: true, updatedAt: Date.now() },
  memoryEntries: [{ id: 'garden-fact', kind: 'fact', text: 'Garden Quest is an offline family tablet gardening game.', status: 'confirmed', sourceReferences: ['discovery'] }], conciergeMode: 'completion-gate',
  expandedText: '', gddContent: [], pitchDeckContent: [], generatedImages: {}, mvpDefinition: null, mvpFeatureSpecs: null, mvpFeatureSpecValidation: [], tddContent: null, technicalDesignDocument: null, modularBreakdown: null, assetList: null, productionBriefs: null, assetMetadata: null, visualPromptContracts: null, scopeReviewContent: null, scopeReviewLens: 'indie',
  gddGenerated: false, pitchDeckGenerated: false, mvpGenerated: false, tddSpecsGenerated: false, tddDocGenerated: false, assetListGenerated: false, scopeReviewGenerated: false, modularBreakdownGenerated: false, costUSD: 0,
};
const historyValue = Buffer.from(pako.deflate(JSON.stringify([project]))).toString('base64');
const proxy = spawn('npm', ['run', 'start-proxy'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const appPort = await port(3070);
const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await Promise.all([waitForUrl('http://127.0.0.1:1235/v1/models', 'LM Studio proxy'), waitForUrl(`http://127.0.0.1:${appPort}/`, 'Vite')]);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.addInitScript(({ value }) => localStorage.setItem('devDoctorAiProjectHistories', value), { value: historyValue });
  const page = await context.newPage();
  const errors = [];
  const failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => failures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'unknown'}`));
  await page.goto(`http://127.0.0.1:${appPort}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const button = page.getByRole('button', { name: 'Run Full Recovery Pipeline' });
  await button.waitFor({ state: 'visible', timeout: 60_000 });
  assert.equal(await button.isDisabled(), false, 'Completed critique should unlock the unified pipeline.');
  await button.click();
  const started = Date.now();
  let persisted;
  while (Date.now() - started < timeoutMs) {
    const saved = await page.evaluate(() => localStorage.getItem('devDoctorAiProjectHistories'));
    if (saved) {
      persisted = JSON.parse(pako.inflate(Buffer.from(saved, 'base64'), { to: 'string' })).find(candidate => candidate.id === project.id);
      if (persisted?.generationMetadata?.stages?.some(stage => stage.stage === 'scope' && stage.status === 'completed')) break;
    }
    if ((await page.locator('[data-testid="workflow-error"]').count()) > 0) throw new Error(await page.locator('[data-testid="workflow-error"]').innerText());
    await sleep(1000);
  }
  assert(persisted, 'The unified pipeline did not persist a project package.');
  const required = ['gddContent', 'mvpFeatureSpecs', 'tddContent', 'technicalDesignDocument', 'modularBreakdown', 'assetMetadata', 'visualPromptContracts', 'pitchDeckContent', 'scopeReviewContent'];
  const missing = required.filter(key => !Array.isArray(persisted[key]) || persisted[key].length === 0);
  assert.deepEqual(missing, [], `Unified pipeline package is missing: ${missing.join(', ')}`);
  assert.equal(persisted.generationMetadata.stages.at(-1).stage, 'scope');
  assert.equal(persisted.generationMetadata.stages.at(-1).status, 'completed');
  assert.equal(errors.length, 0, `Browser errors: ${errors.join(' | ')}`);
  assert.equal(failures.length, 0, `Request failures: ${failures.join(' | ')}`);
  console.log(JSON.stringify({ model: 'mistralai/mistral-7b-instruct-v0.3', durationSeconds: Math.round((Date.now() - started) / 1000), stages: persisted.generationMetadata.stages.map(stage => stage.stage), artifacts: required }, null, 2));
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
  proxy.kill('SIGTERM');
}