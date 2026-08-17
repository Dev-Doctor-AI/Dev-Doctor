import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import pako from 'pako';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const runId = `duck-wars-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const runDirectory = path.join(root, 'Output Files', 'Duck_Wars_Manual_Run', runId);
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const humanClick = async (page, locator) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert(box, 'Target button must have a visible bounding box.');
  const x = box.x + box.width * 0.52;
  const y = box.y + box.height * 0.52;
  await page.mouse.move(x - 18, y - 12, { steps: 8 });
  await sleep(180);
  await page.mouse.move(x, y, { steps: 6 });
  await sleep(120);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
};

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
  throw new Error('No available port for Duck Wars visible run.');
}

const questions = [
  'Which platforms and input methods must the first release support?',
  'What is the smallest playable core loop for one Duck Wars match?',
  'Which multiplayer, content, or production constraints must the team protect?',
];
const answers = [
  'PC first with keyboard and controller support; the architecture should leave room for Steam Deck later.',
  'Players choose a duck commander, collect eggs, build temporary defenses, and use slapstick waterfowl weapons to capture the opposing pond before the round timer ends.',
  'The first release must support four players locally or through a lightweight peer-hosted match, one pond arena, four duck commanders, no live-service backend, and a small art team.',
];
const conversation = [
  { sender: 'ai', text: 'Welcome to Dev Doctor AI. What is the official name for this project?' },
  { sender: 'user', text: 'Duck Wars.' },
  { sender: 'ai', text: 'Duck Wars sounds wonderfully chaotic. What is the fantasy and player experience?' },
  { sender: 'user', text: 'A bright tactical comedy game where rival duck commanders fight over a pond using eggs, water balloons, bread cannons, and improvised defenses. It should feel easy to learn, funny to watch, and strategically surprising for families and friends.' },
  { sender: 'ai', text: 'Who is the game for and what should a first match feel like?' },
  { sender: 'user', text: 'Families, friends, and casual strategy players on PC. A first match should be playable in ten minutes, with readable chaos and funny reversals rather than grim combat.' },
  { sender: 'ai', text: 'What is the core loop and launch scope?' },
  { sender: 'user', text: 'Players choose a duck commander, collect eggs, build temporary defenses, and use slapstick waterfowl weapons to capture the opposing pond before the round timer ends. PC first, keyboard/controller, one arena, four commanders, four-player local or peer-hosted play, no live-service backend.' },
];
const critique = { summary: 'Duck Wars has a strong readable multiplayer comedy hook, but its first release must protect match scope, local/peer-hosted networking complexity, and the number of commanders, weapons, and arena systems.', questions, answers, completed: true, source: 'technical-analyst' };
const project = {
  id: `duck-wars-manual-${Date.now()}`,
  projectName: 'Duck Wars', lastModified: Date.now(), workflowState: 3, projectType: 'GAME', chatHistory: conversation,
  critiqueData: { summary: critique.summary, questions }, critiqueAnswers: answers, critiqueRecord: critique,
  transcriptRecord: { messages: conversation, preservedInFull: true, updatedAt: Date.now() },
  memoryEntries: [
    { id: 'duck-identity', kind: 'fact', text: 'Duck Wars is a bright tactical comedy game about rival duck commanders fighting over a pond.', status: 'confirmed', sourceReferences: ['conversation'] },
    { id: 'duck-audience', kind: 'fact', text: 'The audience is families, friends, and casual strategy players on PC.', status: 'confirmed', sourceReferences: ['conversation'] },
    { id: 'duck-core-loop', kind: 'decision', text: 'Players choose a duck commander, collect eggs, build temporary defenses, and capture the opposing pond before the round timer ends.', status: 'accepted', sourceReferences: ['conversation'] },
    { id: 'duck-constraints', kind: 'constraint', text: 'First release is PC-first, one pond arena, four commanders, four-player local or peer-hosted play, and no live-service backend.', status: 'active', sourceReferences: ['conversation'] },
  ],
  conciergeMode: 'completion-gate', expandedText: '', gddContent: [], pitchDeckContent: [], generatedImages: {}, mvpDefinition: null,
  mvpFeatureSpecs: null, mvpFeatureSpecValidation: [], tddContent: null, technicalDesignDocument: null, modularBreakdown: null,
  assetList: null, productionBriefs: null, assetMetadata: null, visualPromptContracts: null, scopeReviewContent: null, scopeReviewLens: 'indie',
  gddGenerated: false, pitchDeckGenerated: false, mvpGenerated: false, tddSpecsGenerated: false, tddDocGenerated: false,
  assetListGenerated: false, scopeReviewGenerated: false, modularBreakdownGenerated: false, costUSD: 0,
};

const recordButtons = async (page, label) => {
  const buttons = await page.locator('aside button').evaluateAll(elements => elements.map(button => ({
    title: button.querySelector('h4')?.textContent?.trim() || button.textContent?.trim() || '',
    disabled: button.disabled,
    generated: button.querySelector('h4')?.className.includes('text-green-400') || false,
    className: button.className,
  })));
  const headings = await page.locator('main h2, main h3').allTextContents();
  const progress = await page.locator('[data-testid="generation-progress"]').evaluate(element => ({ stage: element.dataset.stage, substage: element.dataset.substage, progress: element.dataset.progress, item: element.dataset.currentItem })).catch(() => null);
  const snapshot = { label, timestamp: new Date().toISOString(), buttons, headings, progress };
  await writeFile(path.join(runDirectory, `${String(recordButtons.index++).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`), JSON.stringify(snapshot, null, 2));
  await page.screenshot({ path: path.join(runDirectory, `${String(recordButtons.index).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`), fullPage: true });
  snapshot.visualArtifact = `${String(recordButtons.index).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  await writeFile(path.join(runDirectory, `${String(recordButtons.index).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`), JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify(snapshot));
  return snapshot;
};
recordButtons.index = 0;

const waitForButtonGenerated = async (page, title, timeout = 900_000) => {
  const button = page.getByRole('button', { name: new RegExp(title, 'i') }).first();
  await button.waitFor({ state: 'visible', timeout: 60_000 });
  assert.equal(await button.isDisabled(), false, `${title} should be enabled by its gate.`);
  await humanClick(page, button);
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await page.locator('[data-testid="workflow-error"]').count()) throw new Error(await page.locator('[data-testid="workflow-error"]').innerText());
    if (await button.locator('h4').getAttribute('class').then(value => value?.includes('text-green-400')).catch(() => false)) return recordButtons(page, `${title}-complete`);
    await page.waitForTimeout(1_000);
  }
  throw new Error(`${title} did not complete within timeout.`);
};

await mkdir(runDirectory, { recursive: true });
const historyValue = Buffer.from(pako.deflate(JSON.stringify([project]))).toString('base64');
const port = await availablePort(3000);
const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const auth = spawn('npm', ['run', 'start-auth'], { cwd: root, env: { ...process.env, AUTH_SERVER_PORT: '1236', DEV_DOCTOR_ALLOWED_ORIGINS: `http://127.0.0.1:${port},http://localhost:${port}` }, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
let context;
let recordedPage;
const errors = []; const failures = [];

try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break; } catch {}
    await sleep(500);
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch('http://127.0.0.1:1236/health')).ok) break; } catch {}
    await sleep(500);
  }
  browser = await chromium.launch({ headless: false, slowMo: 35 });
  context = await browser.newContext({ viewport: { width: 1440, height: 950 }, recordVideo: { dir: runDirectory, size: { width: 1440, height: 950 } } });
  await context.addInitScript(({ value }) => localStorage.setItem('devDoctorAiProjectHistories', value), { value: historyValue });
  const page = await context.newPage();
  recordedPage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => failures.push(`${request.method()} ${request.url().split('?')[0]}: ${request.failure()?.errorText || 'unknown'}`));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await humanClick(page, page.getByRole('button', { name: 'AI provider settings' }));
  await page.locator('input[type="radio"]').nth(1).check();
  await page.locator('select').filter({ has: page.locator('option[value="gemini"]') }).selectOption('gemini');
  await page.waitForTimeout(2_000);
  await page.locator('select').filter({ has: page.locator('option[value="gemini-3.7-flash"]') }).selectOption('gemini-3.7-flash');
  await page.waitForTimeout(2_000);
  assert((await page.locator('body').innerText()).includes('Credential loaded from macOS Keychain'));
  await humanClick(page, page.getByRole('button', { name: 'Close provider settings' }));
  await recordButtons(page, 'initial');
  await humanClick(page, page.getByRole('button', { name: /Generate GDD \/ PRD/i }));
  await page.locator('textarea[id^="critique-q-"]').first().waitFor({ state: 'visible', timeout: 60_000 });
  await humanClick(page, page.getByRole('button', { name: /Incorporate Feedback & Generate Document/i }));
  await page.waitForFunction(() => document.body.innerText.includes('Rich project package'), null, { timeout: 900_000 });
  await recordButtons(page, 'gdd-core-complete');
  await waitForButtonGenerated(page, 'Define MVP');
  await waitForButtonGenerated(page, 'Generate MVP Feature Specs');
  const persisted = await page.evaluate(() => localStorage.getItem('devDoctorAiProjectHistories'));
  const persistedProject = persisted ? JSON.parse(pako.inflate(Buffer.from(persisted, 'base64'), { to: 'string' })).find(candidate => candidate.projectName === 'Duck Wars') : null;
  await writeFile(path.join(runDirectory, 'duck-wars-project-package.json'), JSON.stringify(persistedProject, null, 2));
  await writeFile(path.join(runDirectory, 'visible-page-text.txt'), await page.locator('body').innerText());
  await writeFile(path.join(runDirectory, 'run-summary.json'), JSON.stringify({ project: 'Duck Wars', errors, failures, stoppedBefore: 'Final TDD', outputs: ['duck-wars-project-package.json', 'visible-page-text.txt'], note: 'TDD intentionally deferred for next run.' }, null, 2));
  console.log(`Duck Wars visible run complete through MVP Feature Specs. Video and snapshots are in ${runDirectory}`);
  await page.waitForTimeout(10_000);
} finally {
  await context?.close();
  if (recordedPage) {
    const videoPath = await recordedPage.video()?.path().catch(() => null);
    if (videoPath) await writeFile(path.join(runDirectory, 'video-path.txt'), `${videoPath}\n`);
  }
  await browser?.close();
  vite.kill('SIGTERM');
  auth.kill('SIGTERM');
}