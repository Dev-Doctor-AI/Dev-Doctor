import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import pako from 'pako';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function availablePort(preferred) {
  for (let port = preferred; port < preferred + 20; port += 1) {
    const available = await new Promise(resolve => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error('No available port found for critique smoke test.');
}

async function waitForUrl(url, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await sleep(500);
  }
  throw new Error(`${label} was not available at ${url}.`);
}

const questions = [
  'Which platform is required for the first release?',
  'What is the smallest testable core loop?',
  'What constraint must the team protect during delivery?',
];
const project = {
  id: 'critique-loop-contract-smoke',
  projectName: 'Garden Quest',
  lastModified: Date.now(),
  workflowState: 1,
  projectType: 'GAME',
  chatHistory: [{ sender: 'ai', text: 'The project is Garden Quest, a cozy family gardening game.' }],
  critiqueData: { summary: 'The project needs technical clarification before design generation.', questions },
  critiqueAnswers: ['', '', ''],
  critiqueRecord: { summary: 'The project needs technical clarification before design generation.', questions, answers: [], completed: false, source: 'technical-analyst' },
  transcriptRecord: { messages: [{ sender: 'ai', text: 'The project is Garden Quest, a cozy family gardening game.' }], preservedInFull: true, updatedAt: Date.now() },
  memoryEntries: [],
  conciergeMode: 'information-gatherer',
  expandedText: '', gddContent: [], pitchDeckContent: [], generatedImages: {},
  mvpDefinition: null, mvpFeatureSpecs: null, mvpFeatureSpecValidation: [], tddContent: null,
  technicalDesignDocument: null, assetList: null, scopeReviewContent: null, scopeReviewLens: null,
  modularBreakdown: null, gddGenerated: false, pitchDeckGenerated: false, mvpGenerated: false,
  tddSpecsGenerated: false, tddDocGenerated: false, assetListGenerated: false,
  scopeReviewGenerated: false, modularBreakdownGenerated: false, costUSD: 0,
};
const compressed = pako.deflate(JSON.stringify([project]));
const historyValue = Buffer.from(compressed).toString('base64');

const proxy = spawn('npm', ['run', 'start-proxy'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await availablePort(3050);
const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;

try {
  await Promise.all([
    waitForUrl('http://127.0.0.1:1235/v1/models', 'LM Studio proxy'),
    waitForUrl(`http://127.0.0.1:${port}/`, 'Vite'),
  ]);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(value => localStorage.setItem('devDoctorAiProjectHistories', value), historyValue);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  const submit = page.getByRole('button', { name: 'Incorporate Feedback & Generate Document' });
  await submit.waitFor({ state: 'visible', timeout: 30_000 });
  assert.equal(await submit.isDisabled(), true, 'Incomplete critique answers should keep submission disabled.');

  const fields = page.locator('textarea[id^="critique-q-"]');
  assert.equal(await fields.count(), questions.length, 'Critique question count did not render correctly.');
  for (let index = 0; index < questions.length; index += 1) await fields.nth(index).fill(['Tablet first.', 'Plant, grow, harvest.', 'Keep the offline scope bounded.'][index]);
  assert.equal(await submit.isDisabled(), false, 'Completed critique answers should enable submission.');
  await submit.click();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const body = await page.locator('body').innerText();
    if (body.includes('Completing Persona Review') || body.includes('Generating Core Document')) break;
    await sleep(500);
  }

  let persisted;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const saved = await page.evaluate(() => localStorage.getItem('devDoctorAiProjectHistories'));
    if (saved) {
      persisted = JSON.parse(pako.inflate(Buffer.from(saved, 'base64'), { to: 'string' })).find(candidate => candidate.id === project.id);
      if (persisted?.critiqueRecord?.completed && persisted.memoryEntries?.filter(entry => entry.kind === 'decision' && entry.status === 'accepted').length === questions.length) break;
    }
    await sleep(500);
  }
  assert(persisted, 'Critique project was not found in persisted history.');
  assert.equal(persisted.critiqueRecord?.completed, true, 'Completed critique record was not persisted.');
  assert.equal(persisted.critiqueRecord?.answers.length, questions.length, 'Completed critique answers were not persisted.');
  assert.equal(persisted.memoryEntries?.filter(entry => entry.kind === 'decision' && entry.status === 'accepted').length, questions.length, 'Critique answers were not persisted as accepted decisions.');
  assert.equal(errors.length, 0, `Browser errors occurred: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ checks: ['blank-answer gate', 'all answers enable submission', 'completed critique persisted', 'accepted decisions persisted', 'no browser errors'] }, null, 2));
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
  proxy.kill('SIGTERM');
}