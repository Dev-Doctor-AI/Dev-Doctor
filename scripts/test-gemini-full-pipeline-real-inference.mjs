import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import pako from 'pako';
import { writeFile, mkdir } from 'node:fs/promises';

const timeoutMs = Number(process.env.E2E_PIPELINE_TIMEOUT_MS || 1_800_000);
const questions = ['Which platform is required?', 'What is the core loop?', 'What is the delivery constraint?'];
const project = {
  id: 'gemini-full-pipeline-session', projectName: 'Garden Quest', lastModified: Date.now(), workflowState: 3, projectType: 'GAME',
  chatHistory: [{ sender: 'ai', text: 'Garden Quest is an offline family tablet gardening game.' }, { sender: 'user', text: 'The player plants, grows, and harvests magical crops with family members.' }],
  critiqueData: { summary: 'Technical review completed.', questions }, critiqueAnswers: ['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'],
  critiqueRecord: { summary: 'Technical review completed.', questions, answers: ['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'], completed: true, source: 'technical-analyst' },
  transcriptRecord: { messages: [], preservedInFull: true, updatedAt: Date.now() }, memoryEntries: [{ id: 'garden-fact', kind: 'fact', text: 'Garden Quest is an offline family tablet gardening game.', status: 'confirmed', sourceReferences: ['discovery'] }], conciergeMode: 'completion-gate',
  expandedText: '', gddContent: [], pitchDeckContent: [], generatedImages: {}, mvpDefinition: null, mvpFeatureSpecs: null, mvpFeatureSpecValidation: [], tddContent: null, technicalDesignDocument: null, modularBreakdown: null, assetList: null, productionBriefs: null, assetMetadata: null, visualPromptContracts: null, scopeReviewContent: null, scopeReviewLens: 'indie',
  gddGenerated: false, pitchDeckGenerated: false, mvpGenerated: false, tddSpecsGenerated: false, tddDocGenerated: false, assetListGenerated: false, scopeReviewGenerated: false, modularBreakdownGenerated: false, costUSD: 0,
};
const value = Buffer.from(pako.deflate(JSON.stringify([project]))).toString('base64');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await context.addInitScript(({ value }) => localStorage.setItem('devDoctorAiProjectHistories', value), { value });
const page = await context.newPage();
const errors = []; const failures = []; const responses = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('requestfailed', request => failures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'unknown'}`));
page.on('response', response => { if (/generativelanguage|chat\/completions/.test(response.url())) responses.push({ provider: response.url().split('?')[0], status: response.status() }); });

const started = Date.now();
try {
  console.log('gemini-pipeline: opening existing app');
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  console.log('gemini-pipeline: app loaded');
  await page.getByRole('button', { name: 'AI provider settings' }).click();
  console.log('gemini-pipeline: provider settings opened');
  await page.locator('input[type="radio"]').nth(1).check();
  await page.locator('select').filter({ has: page.locator('option[value="gemini"]') }).selectOption('gemini');
  console.log('gemini-pipeline: Gemini selected');
  await page.waitForTimeout(2_000);
  await page.locator('select').filter({ has: page.locator('option[value="gemini-3.7-flash"]') }).selectOption('gemini-3.7-flash');
  await page.waitForTimeout(2_500);
  const body = await page.locator('body').innerText();
  console.log(`gemini-pipeline: credential status=${body.includes('Credential loaded from macOS Keychain') ? 'loaded' : body.includes('Keychain credential unavailable') ? 'unavailable' : 'unknown'}`);
  assert(body.includes('Credential loaded from macOS Keychain'), 'Gemini credential did not load from Keychain.');
  const pipelineButton = page.getByRole('button', { name: 'Run Full Recovery Pipeline' });
  await pipelineButton.waitFor({ state: 'visible', timeout: 60_000 });
  assert.equal(await pipelineButton.isDisabled(), false);
  console.log('gemini-pipeline: pipeline button ready; starting generation');
  await pipelineButton.click();
  let persisted;
  while (Date.now() - started < timeoutMs) {
    const saved = await page.evaluate(() => localStorage.getItem('devDoctorAiProjectHistories'));
    if (saved) {
      persisted = JSON.parse(pako.inflate(Buffer.from(saved, 'base64'), { to: 'string' })).find(candidate => candidate.id === project.id);
      if (persisted?.generationMetadata?.stages?.some(stage => stage.stage === 'scope' && stage.status === 'completed')) break;
    }
    if (await page.locator('[data-testid="workflow-error"]').count()) throw new Error(await page.locator('[data-testid="workflow-error"]').innerText());
    await page.waitForTimeout(1_000);
  }
  if (!persisted?.generationMetadata?.stages?.some(stage => stage.stage === 'scope' && stage.status === 'completed')) {
    console.error(JSON.stringify({ pipelineTimedOut: true, persistedKeys: persisted ? Object.keys(persisted) : [], progressText: await page.locator('body').innerText().then(text => text.slice(-1200)).catch(() => ''), errors, failures, responseCount: responses.length, responseStatuses: responses.map(response => response.status) }, null, 2));
  }
  assert(persisted, 'Gemini pipeline did not persist project state.');
  const required = ['gddContent', 'mvpFeatureSpecs', 'tddContent', 'technicalDesignDocument', 'modularBreakdown', 'assetMetadata', 'visualPromptContracts', 'pitchDeckContent', 'scopeReviewContent'];
  const missing = required.filter(key => !Array.isArray(persisted[key]) || !persisted[key].length);
  assert.deepEqual(missing, [], `Gemini pipeline missing: ${missing.join(', ')}`);
  assert.equal(persisted.generationMetadata.stages.at(-1).stage, 'scope');
  await mkdir('model-behaviour', { recursive: true });
  const report = `# MODEL_BEHAVIOUR — Gemini full pipeline observation\n\nProvider: Google Gemini\nModel: gemini-3.7-flash\nRuntime: running Dev Doctor UI with macOS Keychain credential bridge\nDate: ${new Date().toISOString()}\n\n## Observed result\n\n- Provider credential loaded: true\n- Pipeline completed: true\n- Duration seconds: ${Math.round((Date.now() - started) / 1000)}\n- Stage order: ${persisted.generationMetadata.stages.map(stage => stage.stage).join(' → ')}\n- Provider responses observed: ${responses.length}\n- Browser errors: ${errors.length}\n- Request failures: ${failures.length}\n- Required artifacts: ${required.join(', ')}\n\nGlobal-rule impact: NONE.\n`;
  await writeFile(`model-behaviour/gemini-3.7-flash-full-pipeline-${new Date().toISOString().replace(/[:.]/g, '-')}.md`, report);
  console.log(JSON.stringify({ provider: 'gemini', model: 'gemini-3.7-flash', durationSeconds: Math.round((Date.now() - started) / 1000), stages: persisted.generationMetadata.stages.map(stage => stage.stage), responses: responses.length }, null, 2));
} finally {
  await browser.close();
}