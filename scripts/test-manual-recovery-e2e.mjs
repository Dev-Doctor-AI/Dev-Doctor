import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import pako from 'pako';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const timeout = Number(process.env.E2E_MANUAL_TIMEOUT_MS || 900_000);
const questions = ['Which platform is required?', 'What is the core loop?', 'What is the delivery constraint?'];
const project = {
  id: 'manual-recovery-e2e', projectName: 'Garden Quest', lastModified: Date.now(), workflowState: 3, projectType: 'GAME',
  chatHistory: [{ sender: 'ai', text: 'Garden Quest is an offline family tablet gardening game.' }, { sender: 'user', text: 'The player plants, grows, and harvests magical crops with family members.' }],
  critiqueData: { summary: 'Technical review completed.', questions }, critiqueAnswers: ['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'],
  critiqueRecord: { summary: 'Technical review completed.', questions, answers: ['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'], completed: true, source: 'technical-analyst' },
  transcriptRecord: { messages: [], preservedInFull: true, updatedAt: Date.now() }, memoryEntries: [{ id: 'garden-fact', kind: 'fact', text: 'Garden Quest is an offline family tablet gardening game.', status: 'confirmed', sourceReferences: ['discovery'] }], conciergeMode: 'completion-gate',
  expandedText: '', gddContent: [], pitchDeckContent: [], generatedImages: {}, mvpDefinition: null, mvpFeatureSpecs: null, mvpFeatureSpecValidation: [], tddContent: null, technicalDesignDocument: null, modularBreakdown: null, assetList: null, productionBriefs: null, assetMetadata: null, visualPromptContracts: null, scopeReviewContent: null, scopeReviewLens: 'indie',
  gddGenerated: false, pitchDeckGenerated: false, mvpGenerated: false, tddSpecsGenerated: false, tddDocGenerated: false, assetListGenerated: false, scopeReviewGenerated: false, modularBreakdownGenerated: false, costUSD: 0,
};

const browser = await chromium.launch({ headless: process.env.E2E_HEADLESS !== 'false' });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
await context.addInitScript(({ value }) => localStorage.setItem('devDoctorAiProjectHistories', value), { value: Buffer.from(pako.deflate(JSON.stringify([project]))).toString('base64') });
const page = await context.newPage();
const errors = []; const failures = []; const snapshots = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('requestfailed', request => failures.push(`${request.method()} ${request.url().split('?')[0]}: ${request.failure()?.errorText || 'unknown'}`));

const gateSnapshot = async label => {
  const buttons = await page.locator('aside button').evaluateAll(elements => elements.map(button => ({ title: button.querySelector('h4')?.textContent?.trim() || '', disabled: button.disabled, generated: button.querySelector('h4')?.className.includes('text-green-400') || false })));
  const headings = await page.locator('main h2, main h3').allTextContents();
  const progress = await page.locator('[data-testid="generation-progress"]').evaluate(element => ({ stage: element.dataset.stage, substage: element.dataset.substage, progress: element.dataset.progress, item: element.dataset.currentItem })).catch(() => null);
  const snapshot = { label, buttons, headings, progress };
  snapshots.push(snapshot); console.log(JSON.stringify(snapshot));
  return snapshot;
};

const waitGenerated = async (title, stage) => {
  const button = page.getByRole('button', { name: new RegExp(title, 'i') }).first();
  await button.waitFor({ state: 'visible', timeout: 60_000 });
  assert.equal(await button.isDisabled(), false, `${title} was not unlocked.`);
  await button.click();
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await page.locator('[data-testid="workflow-error"]').count()) throw new Error(await page.locator('[data-testid="workflow-error"]').innerText());
    const generated = await button.locator('h4').getAttribute('class').then(value => value?.includes('text-green-400')).catch(() => false);
    if (generated) { await gateSnapshot(`${title}:complete`); return; }
    await page.waitForTimeout(1_000);
  }
  throw new Error(`${title} did not complete within the timeout.`);
};

try {
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: 'AI provider settings' }).click();
  await page.locator('input[type="radio"]').nth(1).check();
  await page.locator('select').filter({ has: page.locator('option[value="gemini"]') }).selectOption('gemini');
  await page.waitForTimeout(2_000);
  await page.locator('select').filter({ has: page.locator('option[value="gemini-3.7-flash"]') }).selectOption('gemini-3.7-flash');
  await page.waitForTimeout(2_000);
  assert((await page.locator('body').innerText()).includes('Credential loaded from macOS Keychain'));
  await page.getByRole('button', { name: 'Close provider settings' }).click();
  await gateSnapshot('initial');
  await page.getByRole('button', { name: /Generate GDD \/ PRD/i }).click();
  await page.locator('textarea[id^="critique-q-"]').first().waitFor({ state: 'visible', timeout });
  const critiqueFields = page.locator('textarea[id^="critique-q-"]');
  for (let index = 0; index < await critiqueFields.count(); index += 1) await critiqueFields.nth(index).fill(['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'][index] || 'Keep the first release bounded.');
  await page.getByRole('button', { name: /Incorporate Feedback & Generate Document/i }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Rich project package'), null, { timeout });
  await gateSnapshot('gdd-and-core-brief:complete');
  await waitGenerated('Define MVP', 'mvp');
  await waitGenerated('Generate MVP Feature Specs', 'tdd_specs');
  await waitGenerated('Assemble Final TDD', 'tdd_doc');
  await waitGenerated('Generate Freelance Briefs', 'modular');
  await waitGenerated('Generate Asset List', 'assets');
  await waitGenerated('Generate Pitch Deck', 'pitch');
  await page.getByRole('button', { name: /Run Scope Critique/i }).click();
  await page.getByRole('button', { name: /Indie Lens/i }).click();
  await waitGenerated('Run Scope Critique', 'scope');
  const rich = page.locator(`iframe[title="${project.projectName} rich package preview"]`);
  await rich.waitFor({ state: 'visible', timeout: 60_000 });
  const frame = page.frames().find(candidate => candidate !== page.mainFrame() && candidate.url() === 'about:srcdoc');
  assert(frame, 'Rich package iframe did not load.');
  const richText = await frame.locator('body').innerText();
  for (const marker of ['Design Document (GDD/PRD)', 'Pitch Deck', 'MVP Definition', 'MVP Feature Specifications', 'Technical Design Document (TDD)', 'Asset List', 'Freelance Briefs', 'Scope Critical Review']) assert(richText.includes(marker), `Rich view omitted ${marker}.`);
  const downloads = {};
  const menu = page.getByRole('button', { name: /Download Full Project/i });
  for (const label of ['HTML Format', 'Markdown Format', 'Plain Text Format', 'JSON Package']) {
    if (!await page.getByRole('button', { name: label, exact: true }).isVisible()) await menu.click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()]);
    downloads[label] = await download.createReadStream().then(async stream => { const chunks=[]; for await (const chunk of stream) chunks.push(chunk); return Buffer.concat(chunks).toString('utf8'); });
  }
  assert(downloads['HTML Format'].includes('Technical Design Document'));
  assert(downloads['Markdown Format'].includes('## Technical Design Document'));
  assert(downloads['Plain Text Format'].includes('TECHNICAL DESIGN DOCUMENT'));
  const json = JSON.parse(downloads['JSON Package']);
  for (const key of ['gddContent', 'mvpFeatureSpecs', 'tddContent', 'technicalDesignDocument', 'modularBreakdown', 'assetList', 'pitchDeckContent', 'scopeReviewContent']) assert(Array.isArray(json[key]) && json[key].length, `JSON export omitted ${key}.`);
  await mkdir('model-behaviour', { recursive: true });
  await writeFile(`model-behaviour/gemini-manual-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}.md`, `# MODEL_BEHAVIOUR — Gemini manual E2E observation\n\nProvider: Google Gemini\nModel: gemini-3.7-flash\nObserved UI gates: ${snapshots.length}\nBrowser errors: ${errors.length}\nRequest failures: ${failures.length}\nRich view markers: verified\nAll four exports: verified\n\nGlobal-rule impact: NONE.\n`);
  console.log(JSON.stringify({ snapshots: snapshots.length, richView: 'complete', exports: Object.keys(downloads), errors: errors.length, failures: failures.length }, null, 2));
} finally { await browser.close(); }