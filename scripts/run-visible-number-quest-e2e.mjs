import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import pako from 'pako';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const runId = `number-quest-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const runDirectory = path.join(root, 'Output Files', 'Number_Quest_E2E', runId);
const seededRun = process.env.NUMBER_QUEST_SEEDED === '1';
const modelMode = process.env.NUMBER_QUEST_MODEL || 'mistral';
const model = process.env.NUMBER_QUEST_MODEL_ID || (modelMode === 'mistral' ? 'mistralai/mistral-7b-instruct-v0.3' : 'gpt-5.6-luna');
const isLuna = modelMode !== 'mistral';
const inferenceTimeout = Number(process.env.E2E_INFERENCE_TIMEOUT_MS || process.env.NUMBER_QUEST_TIMEOUT_MS || 1_800_000);
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
  throw new Error('No available port for Number Quest E2E run.');
}

const questions = [
  'Which platforms, age range, and accessibility needs must the first release support?',
  'What is the smallest playable learning loop for one Number Quest session?',
  'Which safety, educational, content, and production constraints must the team protect?',
];
const conversation = [
  { sender: 'ai', text: 'Welcome to Dev Doctor AI. What is the official name for this project?' },
  { sender: 'user', text: 'Number Quest.' },
  { sender: 'ai', text: 'Number Quest sounds like a friendly learning adventure. What is the fantasy and player experience?' },
  { sender: 'user', text: 'A colorful educational adventure for children ages 7–10. Players explore floating islands with a friendly animal guide and solve interactive math challenges to restore power to a central observatory. It should feel playful, encouraging, and more like an adventure than a worksheet.' },
  { sender: 'ai', text: 'Who is the game for and what should a first session feel like?' },
  { sender: 'user', text: 'Children ages 7–10 playing on tablets or in a browser, with parents and teachers interested in progress. A first session should be safe, readable, encouraging, and achievable in about ten minutes without stressful timers or public competition.' },
  { sender: 'ai', text: 'What is the core loop and launch scope?' },
  { sender: 'user', text: 'Players choose an animal guide, travel between themed islands, repair bridges by solving equations, sort quantities, match visual fractions, and complete multiplication-grid or word-problem puzzles. Correct answers unlock badges and cosmetics; incorrect answers provide hints. Launch with one observatory hub, three islands, core arithmetic through simple fractions, adaptive difficulty, optional audio, and a private parent/teacher progress view. No ads, purchases, open chat, or user-generated content.' },
];
const rawBrief = conversation.filter(message => message.sender === 'user').slice(1).map(message => message.text).join('\n\n');
const critique = { summary: 'Number Quest has a clear child-friendly learning loop, but its first release must protect age-appropriate scope, accessibility, privacy, modest educational claims, and a non-punitive difficulty model.', questions, answers: [], completed: false, source: 'technical-analyst' };
const project = {
  id: `number-quest-e2e-${Date.now()}`,
  projectName: 'Number Quest', lastModified: Date.now(), workflowState: 3, projectType: 'GAME', chatHistory: conversation,
  critiqueData: null, critiqueAnswers: [], critiqueRecord: undefined,
  transcriptRecord: { messages: conversation, preservedInFull: true, updatedAt: Date.now() },
  memoryEntries: [
    { id: 'number-quest-identity', kind: 'fact', text: 'Number Quest is a colorful educational adventure where children solve interactive math challenges to restore an observatory.', status: 'confirmed', sourceReferences: ['conversation'] },
    { id: 'number-quest-audience', kind: 'fact', text: 'The audience is children ages 7–10 on tablets or browser, with parent and teacher progress visibility.', status: 'confirmed', sourceReferences: ['conversation'] },
    { id: 'number-quest-core-loop', kind: 'decision', text: 'Players choose an animal guide, explore islands, solve math challenges, receive hints, and earn badges or cosmetics.', status: 'accepted', sourceReferences: ['conversation'] },
    { id: 'number-quest-constraints', kind: 'constraint', text: 'First release avoids ads, purchases, open chat, user-generated content, stressful timers, and public competition; it includes accessibility and modest adaptive difficulty.', status: 'active', sourceReferences: ['conversation'] },
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

const waitForButtonGenerated = async (page, title, timeout = inferenceTimeout) => {
  const button = page.getByRole('button', { name: new RegExp(title, 'i') }).first();
  await button.waitFor({ state: 'visible', timeout: 60_000 });
  assert.equal(await button.isDisabled(), false, `${title} should be enabled by its gate.`);
  const beforeClick = await page.locator('[data-testid="generation-progress"]').evaluate(element => ({ stage: element.dataset.stage, progress: element.dataset.progress })).catch(() => null);
  await humanClick(page, button);
  const clickRegistered = async () => {
    const disabled = await button.isDisabled().catch(() => false);
    const progress = await page.locator('[data-testid="generation-progress"]').evaluate(element => ({ stage: element.dataset.stage, progress: element.dataset.progress })).catch(() => null);
    return disabled || (progress && progress.stage !== beforeClick?.stage) || (progress && progress.progress !== beforeClick?.progress);
  };
  await page.waitForTimeout(1_000);
  if (!await clickRegistered()) {
    await button.click();
    await page.waitForTimeout(500);
  }
  await writeFile(path.join(runDirectory, `${String(recordButtons.index).padStart(2, '0')}-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-click.json`), JSON.stringify({ title, beforeClick, registered: await clickRegistered(), timestamp: new Date().toISOString() }, null, 2));
  assert.equal(await clickRegistered(), true, `${title} click did not register in the application.`);
  await page.waitForFunction(expectedTitle => {
    const progress = document.querySelector('[data-testid="generation-progress"]');
    return progress?.getAttribute('data-stage') === (expectedTitle === 'Generate MVP Feature Specs' ? 'tdd_specs' : expectedTitle === 'Assemble Final TDD' ? 'tdd_doc' : null);
  }, title, { timeout: 15_000 }).catch(() => {
    if (title === 'Generate MVP Feature Specs') throw new Error(`${title} click registered visually, but the application did not enter the tdd_specs progress stage.`);
  });
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await page.locator('[data-testid="workflow-error"]').count()) throw new Error(await page.locator('[data-testid="workflow-error"]').innerText());
    if (await button.locator('h4').getAttribute('class').then(value => value?.includes('text-green-400')).catch(() => false)) return recordButtons(page, `${title}-complete`);
    await page.waitForTimeout(1_000);
  }
  throw new Error(`${title} did not complete within timeout.`);
};

const requestAdaptiveUserReply = async (transcript, latestConciergeMessage) => {
  const response = await fetch('http://127.0.0.1:1235/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: 'You are simulating the creator of a children\'s game in a realistic discovery interview. Answer the Concierge\'s latest question directly as the creator. Use only the supplied raw brief, make sensible bounded decisions when details are missing, and do not ask a new question. If the Concierge asks whether to compile or begin the formal critique, clearly confirm readiness.' },
        { role: 'user', content: `Raw project brief:\n${rawBrief}\n\nConversation so far:\n${transcript}\n\nLatest Concierge message:\n${latestConciergeMessage}\n\nReturn only the creator's next answer.` },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Adaptive creator reply failed (${response.status}).`);
  const payload = await response.json();
  const reply = payload.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('Adaptive creator reply was empty.');
  return reply;
};

const typeConversation = async page => {
  const input = page.getByRole('textbox', { name: 'Your response' });
  const send = page.getByRole('button', { name: 'Send message' });
  const conversationPane = page.locator('[aria-live="polite"]');
  let turn = 0;
  let message = 'Number Quest.';
  while (true) {
    await input.waitFor({ state: 'visible', timeout: 60_000 });
    const beforeTranscript = await conversationPane.innerText();
    await input.click();
    await input.pressSequentially(message, { delay: 8 });
    await writeFile(path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-typed.txt`), message);
    await humanClick(page, send);
    await page.waitForFunction(() => {
      const field = document.querySelector('textarea[aria-label="Your response"]');
      const thinking = Array.from(document.querySelectorAll('[aria-live="polite"] *')).some(element => element.textContent?.trim() === 'Thinking...');
      return field instanceof HTMLTextAreaElement && !field.disabled && !thinking;
    }, null, { timeout: inferenceTimeout });
    const afterTranscript = await conversationPane.innerText();
    await writeFile(path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-visible.txt`), afterTranscript);
    assert.notEqual(afterTranscript, beforeTranscript, `Conversation turn ${turn + 1} did not produce a visible assistant response.`);
    assert(!afterTranscript.includes("I'm sorry, I encountered an error."), `Conversation turn ${turn + 1} returned an assistant error response.`);
    await page.screenshot({ path: path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-complete.png`), fullPage: true });
    const critiqueFormVisible = await page.locator('textarea[id^="critique-q-"]').first().isVisible().catch(() => false);
    if (critiqueFormVisible) break;
    const newTranscript = afterTranscript.startsWith(beforeTranscript)
      ? afterTranscript.slice(beforeTranscript.length)
      : afterTranscript;
    const completionGateDetected = /(?:ready|shall|should|want|proceed)\b[^\n]{0,220}\b(?:compile|formal(?:\s+design)?\s+critique)|\b(?:compile|formal(?:\s+design)?\s+critique)\b[^\n]{0,220}\b(?:ready|proceed|begin|start)|formal(?:\s+design)?\s+critique/i.test(newTranscript);
    if (completionGateDetected) {
      const confirmation = 'Yes, please compile the project and begin the formal design critique.';
      await writeFile(path.join(runDirectory, 'completion-gate-detected.json'), JSON.stringify({
        detectedAt: new Date().toISOString(),
        turn: turn + 1,
        newTranscript,
        confirmation,
        nextAction: 'send confirmation, return from conversation loop, click Generate GDD / PRD',
      }, null, 2));
      await input.waitFor({ state: 'visible', timeout: 60_000 });
      const confirmationBefore = await conversationPane.innerText();
      await input.click();
      await input.pressSequentially(confirmation, { delay: 8 });
      await writeFile(path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-typed.txt`), confirmation);
      await humanClick(page, send);
      await page.waitForFunction(() => {
        const field = document.querySelector('textarea[aria-label="Your response"]');
        const thinking = Array.from(document.querySelectorAll('[aria-live="polite"] *')).some(element => element.textContent?.trim() === 'Thinking...');
        return field instanceof HTMLTextAreaElement && !field.disabled && !thinking;
      }, null, { timeout: inferenceTimeout });
      const confirmationAfter = await conversationPane.innerText();
      await writeFile(path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-visible.txt`), confirmationAfter);
      assert.notEqual(confirmationAfter, confirmationBefore, 'Completion-gate confirmation did not produce a Concierge response.');
      assert(!confirmationAfter.includes("I'm sorry, I encountered an error."), 'Completion-gate confirmation returned an assistant error response.');
      await page.screenshot({ path: path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-complete.png`), fullPage: true });
      return true;
    }
    message = await requestAdaptiveUserReply(afterTranscript, newTranscript);
    turn += 1;
  }
};

await mkdir(runDirectory, { recursive: true });
const historyValue = Buffer.from(pako.deflate(JSON.stringify(seededRun ? [project] : []))).toString('base64');
const port = await availablePort(3000);
const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const auth = spawn('npm', ['run', 'start-auth'], { cwd: root, env: { ...process.env, AUTH_SERVER_PORT: '1236', DEV_DOCTOR_ALLOWED_ORIGINS: `http://127.0.0.1:${port},http://localhost:${port}` }, stdio: ['ignore', 'pipe', 'pipe'] });
const lmProxy = spawn('node', ['scripts/lm-proxy.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
lmProxy.stdout?.on('data', chunk => process.stdout.write(`[lm-proxy] ${chunk}`));
lmProxy.stderr?.on('data', chunk => process.stderr.write(`[lm-proxy] ${chunk}`));
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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch('http://127.0.0.1:1235/v1/models')).ok) break; } catch {}
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
  await page.locator('input[type="radio"]').first().check();
  if (isLuna) {
    await page.locator('input[type="radio"]').nth(1).check();
    await page.locator('select').filter({ has: page.locator('option[value="openai"]') }).selectOption('openai');
  } else {
    await page.locator('input[type="radio"]').first().check();
  }
  const modelOption = page.locator(`option[value="${model}"]`);
  if (await modelOption.count()) {
    await modelOption.locator('..').selectOption(model);
  } else {
    const modelInput = page.locator('input[placeholder="Enter any supported model ID"]');
    await modelInput.fill(model);
  }
  if (isLuna) {
    await page.waitForFunction(() => Array.from(document.querySelectorAll('input[type="password"]')).some(input => input.value.trim().length > 0), null, { timeout: 30_000 });
  }
  await page.waitForTimeout(500);
  await humanClick(page, page.getByRole('button', { name: 'Close provider settings' }));
  if (!seededRun) {
    const completionGateConfirmed = await typeConversation(page);
    assert.equal(completionGateConfirmed, true, 'The runner must observe and confirm the Concierge completion gate before generating the GDD.');
    await writeFile(path.join(runDirectory, 'conversation-mode.txt'), `typed-user-mode\nprovider=${isLuna ? 'openai' : 'lmstudio'}\nmodel=${model}\n`);
  } else {
    await writeFile(path.join(runDirectory, 'conversation-mode.txt'), `seeded-recovery-mode\nprovider=${isLuna ? 'openai' : 'lmstudio'}\nmodel=${model}\n`);
  }
  await recordButtons(page, 'initial');
  await humanClick(page, page.getByRole('button', { name: /Generate GDD \/ PRD/i }));
  const critiqueFields = page.locator('textarea[id^="critique-q-"]');
  await page.waitForFunction(() => {
    const error = document.querySelector('[data-testid="workflow-error"]');
    if (error?.textContent?.trim()) throw new Error(error.textContent.trim());
    return Boolean(document.querySelector('textarea[id^="critique-q-"]'));
  }, null, { timeout: inferenceTimeout });
  await critiqueFields.first().waitFor({ state: 'visible', timeout: inferenceTimeout });
  const critiqueCount = await critiqueFields.count();
  const critiqueQuestions = await page.locator('label[for^="critique-q-"]').allTextContents();
  const critiqueAnswers = [];
  for (let index = 0; index < critiqueCount; index += 1) {
    const field = critiqueFields.nth(index);
    const helper = page.getByRole('button', { name: `Get AI suggestion for question ${index + 1}` });
    const previous = await field.inputValue();
    await humanClick(page, helper);
    await page.waitForFunction(({ selector, previousValue }) => {
      const field = document.querySelector(selector);
      return field instanceof HTMLTextAreaElement && field.value.trim().length > 0 && field.value !== previousValue;
    }, { selector: `#critique-q-${index}`, previousValue: previous }, { timeout: inferenceTimeout });
    critiqueAnswers.push(await field.inputValue());
  }
  const critiqueSnapshot = await page.locator('main').innerText();
  await writeFile(path.join(runDirectory, 'critique-questions-and-answers.json'), JSON.stringify({ questionCount: critiqueCount, questions: critiqueQuestions, answers: critiqueAnswers, visibleText: critiqueSnapshot, source: 'per-question-production-AI-helper' }, null, 2));
  assert.equal(await critiqueFields.evaluateAll(fields => fields.every(field => field.value.trim().length > 0)), true, 'Every critique question must have a typed answer before submission.');
  const incorporateButton = page.getByRole('button', { name: /Incorporate Feedback & Generate Document/i });
  assert.equal(await incorporateButton.isDisabled(), false, 'Critique submission must be enabled after all answers are typed.');
  await humanClick(page, incorporateButton);
  await page.waitForFunction(() => document.body.innerText.includes('Rich project package'), null, { timeout: inferenceTimeout });
  await recordButtons(page, 'gdd-core-complete');
  await waitForButtonGenerated(page, 'Define MVP');
  await waitForButtonGenerated(page, 'Generate MVP Feature Specs');
  await waitForButtonGenerated(page, 'Assemble Final TDD');
  await waitForButtonGenerated(page, 'Generate Freelance Briefs');
  await waitForButtonGenerated(page, 'Generate Asset List');
  await waitForButtonGenerated(page, 'Generate Pitch Deck');
  await waitForButtonGenerated(page, 'Run Scope Critique');
  const persisted = await page.evaluate(() => localStorage.getItem('devDoctorAiProjectHistories'));
  const persistedProject = persisted ? JSON.parse(pako.inflate(Buffer.from(persisted, 'base64'), { to: 'string' })).find(candidate => candidate.projectName === 'Number Quest') : null;
  assert(persistedProject, 'Number Quest project package must be persisted.');
  await writeFile(path.join(runDirectory, 'number-quest-project-package.json'), JSON.stringify(persistedProject, null, 2));
  await writeFile(path.join(runDirectory, 'visible-page-text.txt'), await page.locator('body').innerText());
  const downloadMenu = page.getByRole('button', { name: /Download Full Project/i }).first();
  const downloadFormats = [['HTML Format', 'html'], ['Markdown Format', 'md'], ['Plain Text Format', 'txt'], ['JSON Package', 'json']];
  const exportedFiles = [];
  for (const [label, extension] of downloadFormats) {
    await humanClick(page, downloadMenu);
    const option = page.getByRole('button', { name: label }).last();
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), option.click()]);
    const destination = path.join(runDirectory, await download.suggestedFilename());
    await download.saveAs(destination);
    const content = await readFile(destination, 'utf8');
    assert(content.includes('Number Quest'), `${extension} export must contain the project title.`);
    exportedFiles.push(destination);
  }
  await writeFile(path.join(runDirectory, 'run-summary.json'), JSON.stringify({ project: 'Number Quest', provider: isLuna ? 'openai' : 'lmstudio', model, errors, failures, completedGates: ['GDD', 'MVP', 'MVP Feature Specs', 'Final TDD', 'Freelance Briefs', 'Assets', 'Pitch Deck', 'Scope Critique'], outputs: ['number-quest-project-package.json', 'visible-page-text.txt', ...exportedFiles], note: `Full typed-user ${isLuna ? 'Luna' : 'Mistral'} run.` }, null, 2));
  console.log(`Number Quest visible ${seededRun ? 'seeded' : 'typed'} full run complete using ${model}. Package, exports, video, and snapshots are in ${runDirectory}`);
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
  lmProxy.kill('SIGTERM');
}