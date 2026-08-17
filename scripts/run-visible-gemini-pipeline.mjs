import { chromium } from 'playwright';
import pako from 'pako';

const questions = ['Which platform is required?', 'What is the core loop?', 'What is the delivery constraint?'];
const project = {
  id: 'visible-gemini-full-pipeline', projectName: 'Garden Quest', lastModified: Date.now(), workflowState: 3, projectType: 'GAME',
  chatHistory: [{ sender: 'ai', text: 'Garden Quest is an offline family tablet gardening game.' }, { sender: 'user', text: 'The player plants, grows, and harvests magical crops with family members.' }],
  critiqueData: { summary: 'Technical review completed.', questions },
  critiqueAnswers: ['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'],
  critiqueRecord: { summary: 'Technical review completed.', questions, answers: ['Tablet first.', 'Plant, grow, harvest.', 'Offline and one garden zone for launch.'], completed: true, source: 'technical-analyst' },
  transcriptRecord: { messages: [], preservedInFull: true, updatedAt: Date.now() },
  memoryEntries: [{ id: 'garden-fact', kind: 'fact', text: 'Garden Quest is an offline family tablet gardening game.', status: 'confirmed', sourceReferences: ['discovery'] }],
  conciergeMode: 'completion-gate', expandedText: '', gddContent: [], pitchDeckContent: [], generatedImages: {},
  mvpDefinition: null, mvpFeatureSpecs: null, mvpFeatureSpecValidation: [], tddContent: null, technicalDesignDocument: null,
  modularBreakdown: null, assetList: null, productionBriefs: null, assetMetadata: null, visualPromptContracts: null,
  scopeReviewContent: null, scopeReviewLens: 'indie', gddGenerated: false, pitchDeckGenerated: false, mvpGenerated: false,
  tddSpecsGenerated: false, tddDocGenerated: false, assetListGenerated: false, scopeReviewGenerated: false,
  modularBreakdownGenerated: false, costUSD: 0,
};

const historyValue = Buffer.from(pako.deflate(JSON.stringify([project]))).toString('base64');
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await context.addInitScript(({ value }) => localStorage.setItem('devDoctorAiProjectHistories', value), { value: historyValue });
const page = await context.newPage();
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(error.message));

await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.getByRole('button', { name: 'AI provider settings' }).click();
await page.locator('input[type="radio"]').nth(1).check();
await page.locator('select').filter({ has: page.locator('option[value="gemini"]') }).selectOption('gemini');
await page.waitForTimeout(2_000);
await page.locator('select').filter({ has: page.locator('option[value="gemini-3.7-flash"]') }).selectOption('gemini-3.7-flash');
await page.waitForTimeout(2_500);
if (!(await page.locator('body').innerText()).includes('Credential loaded from macOS Keychain')) throw new Error('Gemini credential did not load.');
await page.getByRole('button', { name: 'Close provider settings' }).click();
const button = page.getByRole('button', { name: 'Run Full Recovery Pipeline' });
await button.waitFor({ state: 'visible', timeout: 60_000 });
if (await button.isDisabled()) throw new Error('Completed critique did not unlock the pipeline.');
await button.click();
console.log('Visible Gemini pipeline started. Watch http://127.0.0.1:3000/');
console.log('The browser window will remain open after completion for inspection.');
let lastProgress = '';
for (;;) {
  const body = await page.locator('body').innerText();
  const progress = body.slice(-600);
  if (progress !== lastProgress) { console.log(progress.replace(/\n/g, ' | ')); lastProgress = progress; }
  if (body.includes('Pipeline complete!')) { console.log('Visible Gemini pipeline complete.'); break; }
  if (await page.locator('[data-testid="workflow-error"]').count()) { console.error(await page.locator('[data-testid="workflow-error"]').innerText()); break; }
  await page.waitForTimeout(2_000);
}
console.log(`Browser errors captured: ${errors.length}`);
await new Promise(() => {});