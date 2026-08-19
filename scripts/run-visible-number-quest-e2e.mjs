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
const smokeRun = process.env.NUMBER_QUEST_SMOKE === '1';
const modelMode = process.env.NUMBER_QUEST_MODEL || 'qwen';
const model = process.env.NUMBER_QUEST_MODEL_ID || 'qwen/qwen3.5-9b';
const inferenceTimeout = Number(process.env.E2E_INFERENCE_TIMEOUT_MS || process.env.NUMBER_QUEST_TIMEOUT_MS || 1_800_000);
const creatorContextCharacterLimit = Number(process.env.E2E_CREATOR_CONTEXT_CHARACTER_LIMIT || 12_000);
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
assert.equal(modelMode, 'qwen', `Unsupported NUMBER_QUEST_MODEL=${modelMode}. Number Quest is locked to the local Qwen runtime.`);
assert.equal(model, 'qwen/qwen3.5-9b', `Unsupported NUMBER_QUEST_MODEL_ID=${model}. Number Quest is locked to qwen/qwen3.5-9b.`);
assert(Number.isFinite(creatorContextCharacterLimit) && creatorContextCharacterLimit >= 2_000, 'E2E_CREATOR_CONTEXT_CHARACTER_LIMIT must be a finite number of at least 2000 characters.');
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

const waitForHealthyEndpoint = async (url, label, validate = async () => true) => {
  let lastError = 'endpoint did not respond';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = `${response.status} ${response.statusText}`;
      } else if (await validate(response)) {
        return;
      } else {
        lastError = 'response did not satisfy the expected contract';
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(500);
  }
  throw new Error(`${label} did not become healthy: ${lastError}`);
};

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
  const workflowError = async () => page.locator('[data-testid="workflow-error"]').innerText().catch(() => '');
  const progressState = async () => page.locator('[data-testid="generation-progress"]').evaluate(element => ({
    stage: element.dataset.stage,
    substage: element.dataset.substage,
    progress: element.dataset.progress,
    completed: element.dataset.completed,
    total: element.dataset.total,
    currentItem: element.dataset.currentItem,
    activitySequence: element.dataset.activitySequence,
  })).catch(() => null);
  if (title === 'Generate MVP Feature Specs') {
    await page.waitForFunction(() => {
      const progress = document.querySelector('[data-testid="generation-progress"]');
      return progress?.getAttribute('data-stage') === 'tdd_specs';
    }, null, { timeout: 30_000 });
    const startedProgress = await progressState();
    assert.equal(startedProgress?.stage, 'tdd_specs', 'MVP Feature Specs progress modal must enter the tdd_specs stage before generation continues.');
    await writeFile(path.join(runDirectory, 'feature-specs-started.json'), JSON.stringify({
      title,
      beforeClick,
      startedAt: new Date().toISOString(),
      progress: startedProgress,
    }, null, 2));
  }
  const clickRegistered = async () => {
    const error = await workflowError();
    if (error.trim()) throw new Error(`${title} failed in the application: ${error.trim()}`);
    const disabled = await button.isDisabled().catch(() => false);
    const progress = await page.locator('[data-testid="generation-progress"]').evaluate(element => ({ stage: element.dataset.stage, progress: element.dataset.progress })).catch(() => null);
    return Boolean(disabled || (progress && progress.stage !== beforeClick?.stage) || (progress && progress.progress !== beforeClick?.progress));
  };
  await page.waitForTimeout(1_000);
  if (!await clickRegistered()) {
    await button.click();
    await page.waitForTimeout(500);
  }
  const registered = await clickRegistered();
  await writeFile(path.join(runDirectory, `${String(recordButtons.index).padStart(2, '0')}-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-click.json`), JSON.stringify({ title, beforeClick, registered, timestamp: new Date().toISOString() }, null, 2));
  assert.equal(registered, true, `${title} click did not register in the application.`);
  await page.waitForFunction(expectedTitle => {
    const progress = document.querySelector('[data-testid="generation-progress"]');
    return progress?.getAttribute('data-stage') === (expectedTitle === 'Generate MVP Feature Specs' ? 'tdd_specs' : expectedTitle === 'Assemble Final TDD' ? 'tdd_doc' : null);
  }, title, { timeout: 15_000 }).catch(() => {
    if (title === 'Generate MVP Feature Specs') throw new Error(`${title} click registered visually, but the application did not enter the tdd_specs progress stage.`);
  });
  const started = Date.now();
  let lastProgressSnapshot = 0;
  while (Date.now() - started < timeout) {
    if (await page.locator('[data-testid="workflow-error"]').count()) throw new Error(await page.locator('[data-testid="workflow-error"]').innerText());
    if (title === 'Generate MVP Feature Specs' && Date.now() - lastProgressSnapshot >= 15_000) {
      const progress = await progressState();
      await writeFile(path.join(runDirectory, `feature-specs-progress-${String(Math.floor((Date.now() - started) / 15_000)).padStart(3, '0')}.json`), JSON.stringify({ capturedAt: new Date().toISOString(), elapsedMs: Date.now() - started, progress }, null, 2));
      lastProgressSnapshot = Date.now();
    }
    if (await button.locator('h4').getAttribute('class').then(value => value?.includes('text-green-400')).catch(() => false)) return recordButtons(page, `${title}-complete`);
    await page.waitForTimeout(1_000);
  }
  throw new Error(`${title} did not complete within timeout.`);
};

const normalizeReply = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isInterviewerStyleReply = (reply, latestConciergeMessage, priorCreatorReplies) => {
  const normalizedReply = normalizeReply(reply);
  const normalizedQuestion = normalizeReply(latestConciergeMessage);
  const interviewerLead = /^(?:that is|that sounds|to help|could you|can you|what (?:specific|happens)|how does)/i.test(reply.trim());
  const echoesQuestion = normalizedReply.length > 30 && (normalizedQuestion.includes(normalizedReply) || normalizedReply.includes(normalizedQuestion));
  const repeatsCreator = priorCreatorReplies.some(previous => {
    const normalizedPrevious = normalizeReply(previous);
    return normalizedReply.length > 40 && normalizedPrevious.length > 40 && (normalizedReply.includes(normalizedPrevious) || normalizedPrevious.includes(normalizedReply));
  });
  return interviewerLead || echoesQuestion || repeatsCreator;
};

const requestAdaptiveUserReply = async (transcript, latestConciergeMessage, priorCreatorReplies) => {
  let lastReply = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), inferenceTimeout);
    let response;
    try {
      response = await fetch('http://127.0.0.1:1235/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: 'You are the human creator, not the Concierge interviewer. Reply directly to the Concierge question using first-person project decisions. Never praise, summarize, repeat, or ask a question back to the Concierge. Do not use interviewer phrases such as "That is wonderful", "That sounds", or "To help us". Use only the supplied raw brief and make a concrete bounded decision when details are missing. Return only the creator answer.' },
            { role: 'user', content: `Raw project brief:\n${rawBrief}\n\nRecent role-labelled conversation:\n${transcript}\n\nConcierge question to answer (and only this question):\n${latestConciergeMessage}\n\n${attempt === 0 ? 'Write the creator answer now.' : 'Your prior draft sounded like the Concierge or repeated a prior creator answer. Correct the role error and write only a new concrete creator answer now.'}` },
          ],
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error(`Adaptive creator reply timed out after ${inferenceTimeout}ms.`);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error(`Adaptive creator reply failed (${response.status}).`);
    const payload = await response.json();
    const reply = payload.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      const reasoningCharacters = payload.choices?.[0]?.message?.reasoning_content?.length || 0;
      const finishReason = payload.choices?.[0]?.finish_reason || 'unknown';
      throw new Error(`Adaptive creator reply had no visible content (finish_reason=${finishReason}, reasoning_characters=${reasoningCharacters}).`);
    }
    lastReply = reply;
    if (!isInterviewerStyleReply(reply, latestConciergeMessage, priorCreatorReplies)) return reply;
  }
  throw new Error(`Adaptive creator reply remained interviewer-style after correction: ${lastReply.slice(0, 160)}`);
};

const readVisibleMessages = async page => page.locator('[aria-live="polite"] > div').evaluateAll(rows => rows.map(row => {
  if (row.textContent?.trim() === 'Thinking...') return null;
  const sender = row.classList.contains('justify-end') ? 'creator' : 'concierge';
  const bubble = Array.from(row.querySelectorAll('div')).find(element => element.classList.contains('max-w-xl'));
  return bubble?.textContent?.trim() ? { sender, text: bubble.textContent.trim() } : null;
}).filter(Boolean));

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
    const visibleMessages = await readVisibleMessages(page);
    const latestConciergeMessage = [...visibleMessages].reverse().find(message => message.sender === 'concierge')?.text;
    assert(latestConciergeMessage, `Conversation turn ${turn + 1} did not expose a latest Concierge message.`);
    const roleLabelledTranscript = visibleMessages.map(message => `${message.sender}: ${message.text}`).join('\n\n');
    const boundedTranscript = roleLabelledTranscript.length <= creatorContextCharacterLimit
      ? roleLabelledTranscript
      : `${roleLabelledTranscript.slice(0, 1_000)}\n\n[Earlier conversation omitted for the creator helper context]\n\n${roleLabelledTranscript.slice(-(creatorContextCharacterLimit - 1_080))}`;
    const priorCreatorReplies = visibleMessages.filter(message => message.sender === 'creator').map(message => message.text);
    if (smokeRun) {
      const adaptiveReply = await requestAdaptiveUserReply(boundedTranscript, latestConciergeMessage, priorCreatorReplies);
      await writeFile(path.join(runDirectory, 'smoke-summary.json'), JSON.stringify({
        mode: 'real-first-turn-adaptive-smoke',
        provider: 'lmstudio',
        model,
        typedCreatorMessage: message,
        latestConciergeMessage,
        adaptiveCreatorReply: adaptiveReply,
        visibleMessageCount: visibleMessages.length,
        creatorContextCharacters: boundedTranscript.length,
        assertions: ['provider-selection', 'visible-concierge-response', 'adaptive-creator-reply', 'interviewer-loop-rejection'],
      }, null, 2));
      return true;
    }
    const newTranscript = latestConciergeMessage;
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
      await writeFile(path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-completion-confirmation-typed.txt`), confirmation);
      await humanClick(page, send);
      await page.waitForFunction(() => {
        const field = document.querySelector('textarea[aria-label="Your response"]');
        const thinking = Array.from(document.querySelectorAll('[aria-live="polite"] *')).some(element => element.textContent?.trim() === 'Thinking...');
        return field instanceof HTMLTextAreaElement && !field.disabled && !thinking;
      }, null, { timeout: inferenceTimeout });
      const confirmationAfter = await conversationPane.innerText();
      await writeFile(path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-completion-confirmation-visible.txt`), confirmationAfter);
      assert.notEqual(confirmationAfter, confirmationBefore, 'Completion-gate confirmation did not produce a Concierge response.');
      assert(!confirmationAfter.includes("I'm sorry, I encountered an error."), 'Completion-gate confirmation returned an assistant error response.');
      const confirmationMessages = await readVisibleMessages(page);
      const confirmedConciergeMessage = [...confirmationMessages].reverse().find(message => message.sender === 'concierge')?.text;
      assert(confirmedConciergeMessage, 'Completion-gate confirmation did not expose a Concierge response bubble.');
      await writeFile(path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-completion-confirmation.json`), JSON.stringify({ confirmation, confirmedConciergeMessage }, null, 2));
      await page.screenshot({ path: path.join(runDirectory, `conversation-${String(turn + 1).padStart(2, '0')}-completion-confirmation.png`), fullPage: true });
      await writeFile(path.join(runDirectory, 'completion-handoff-released.json'), JSON.stringify({ releasedAt: new Date().toISOString(), turn: turn + 1, latestConciergeMessage: confirmedConciergeMessage, releaseRule: 'single explicit creator confirmation acknowledged by the Concierge; proceed to Generate GDD / PRD' }, null, 2));
      return true;
    }
    message = await requestAdaptiveUserReply(boundedTranscript, latestConciergeMessage, priorCreatorReplies);
    await writeFile(path.join(runDirectory, `conversation-${String(turn + 2).padStart(2, '0')}-adaptive-reply.json`), JSON.stringify({ latestConciergeMessage, creatorReply: message, creatorContextCharacters: boundedTranscript.length, priorCreatorReplyCount: priorCreatorReplies.length }, null, 2));
    turn += 1;
  }
};

await mkdir(runDirectory, { recursive: true });
const historyValue = Buffer.from(pako.deflate(JSON.stringify(seededRun ? [project] : []))).toString('base64');
const port = await availablePort(3000);
const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, env: { ...process.env, VITE_MVP_FEATURE_SPEC_TIMEOUT_MS: process.env.MVP_FEATURE_SPEC_TIMEOUT_MS || '300000' }, stdio: ['ignore', 'pipe', 'pipe'] });
const auth = spawn('npm', ['run', 'start-auth'], { cwd: root, env: { ...process.env, AUTH_SERVER_PORT: '1236', DEV_DOCTOR_ALLOWED_ORIGINS: `http://127.0.0.1:${port},http://localhost:${port}` }, stdio: ['ignore', 'pipe', 'pipe'] });
const lmProxy = spawn('node', ['scripts/lm-proxy.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
lmProxy.stdout?.on('data', chunk => process.stdout.write(`[lm-proxy] ${chunk}`));
lmProxy.stderr?.on('data', chunk => process.stderr.write(`[lm-proxy] ${chunk}`));
let browser;
let context;
let recordedPage;
const errors = []; const failures = [];

try {
  await waitForHealthyEndpoint(`http://127.0.0.1:${port}/`, 'Vite');
  await waitForHealthyEndpoint('http://127.0.0.1:1236/health', 'auth server');
  await waitForHealthyEndpoint('http://127.0.0.1:1235/v1/models', 'LM Studio proxy', async response => {
    const payload = await response.json();
    return Array.isArray(payload.data) && payload.data.some(candidate => candidate.id === model);
  });
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
  const modelOption = page.locator(`option[value="${model}"]`);
  if (await modelOption.count()) {
    await modelOption.locator('..').selectOption(model);
  } else {
    const modelInput = page.locator('input[placeholder="Enter any supported model ID"]');
    await modelInput.fill(model);
  }
  assert.equal(await page.locator('input[name="providerType"]').first().isChecked(), true, 'Qwen run must use Local (LM Studio).');
  const localProviderRadio = page.locator('input[name="providerType"]').first();
  const cloudProviderRadio = page.locator('input[name="providerType"]').nth(1);
  const selectedModel = page.locator('select').filter({ has: page.locator(`option[value="${model}"]`) });
  assert.equal(await localProviderRadio.isChecked(), true, 'Provider preflight expected Local (LM Studio).');
  assert.equal(await cloudProviderRadio.isChecked(), false, 'Qwen run must not select a cloud provider.');
  assert.equal(await selectedModel.inputValue(), model, `Provider preflight selected model did not match ${model}.`);
  assert.equal(await page.locator('input[type="password"]').count(), 0, 'Local provider preflight must not expose a cloud API-key field.');
  await writeFile(path.join(runDirectory, 'provider-selection.json'), JSON.stringify({ provider: 'lmstudio', model, localProviderSelected: await localProviderRadio.isChecked(), cloudProviderSelected: await cloudProviderRadio.isChecked(), cloudApiKeyFieldVisible: await page.locator('input[type="password"]').count() > 0 }, null, 2));
  await page.waitForTimeout(500);
  await humanClick(page, page.getByRole('button', { name: 'Close provider settings' }));
  if (!seededRun) {
    const completionGateConfirmed = await typeConversation(page);
    assert.equal(completionGateConfirmed, true, 'The runner must observe and confirm the Concierge completion gate before generating the GDD.');
    await writeFile(path.join(runDirectory, 'conversation-mode.txt'), `typed-user-mode\nprovider=lmstudio\nmodel=${model}\n`);
  } else {
    await writeFile(path.join(runDirectory, 'conversation-mode.txt'), `seeded-recovery-mode\nprovider=lmstudio\nmodel=${model}\n`);
  }
  if (smokeRun) {
    console.log(`Number Quest local adaptive smoke passed using ${model}. Evidence is in ${runDirectory}`);
  } else {
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
  const persistedGateFlags = {
    gddGenerated: persistedProject.gddGenerated,
    mvpGenerated: persistedProject.mvpGenerated,
    tddSpecsGenerated: persistedProject.tddSpecsGenerated,
    tddDocGenerated: persistedProject.tddDocGenerated,
    modularBreakdownGenerated: persistedProject.modularBreakdownGenerated,
    assetListGenerated: persistedProject.assetListGenerated,
    pitchDeckGenerated: persistedProject.pitchDeckGenerated,
    scopeReviewGenerated: persistedProject.scopeReviewGenerated,
  };
  assert.equal(Object.values(persistedGateFlags).every(Boolean), true, `Persisted project did not record all eight gates: ${JSON.stringify(persistedGateFlags)}`);
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
  assert.equal(exportedFiles.length, downloadFormats.length, 'All four full-package export formats must be saved.');
  await writeFile(path.join(runDirectory, 'run-summary.json'), JSON.stringify({ project: 'Number Quest', provider: 'lmstudio', model, errors, failures, completedGates: ['GDD', 'MVP', 'MVP Feature Specs', 'Final TDD', 'Freelance Briefs', 'Assets', 'Pitch Deck', 'Scope Critique'], persistedGateFlags, outputs: ['provider-selection.json', 'number-quest-project-package.json', 'visible-page-text.txt', ...exportedFiles], note: 'Full typed-user local Qwen run.' }, null, 2));
  console.log(`Number Quest visible ${seededRun ? 'seeded' : 'typed'} full run complete using ${model}. Package, exports, video, and snapshots are in ${runDirectory}`);
  }
  await page.waitForTimeout(10_000);
} catch (error) {
  await writeFile(path.join(runDirectory, 'run-failure.json'), JSON.stringify({
    project: 'Number Quest',
    provider: 'lmstudio',
    model,
    message: error instanceof Error ? error.message : String(error),
    errors,
    failures,
    failedAt: new Date().toISOString(),
  }, null, 2));
  throw error;
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