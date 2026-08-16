import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pako from 'pako';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appUrl = 'http://127.0.0.1:3000/';
const fixture = JSON.parse(readFileSync(path.join(root, 'Output Files/Gemini3.7Flash/Space_Marines_Project_Package.json'), 'utf8'));
const project = {
  id: 'm74-smoke-project', projectName: fixture.meta.projectName, lastModified: Date.now(), workflowState: 3,
  projectType: 'GAME', chatHistory: fixture.chatHistory, critiqueData: { summary: fixture.critiqueQA.summary, questions: fixture.critiqueQA.questions },
  critiqueAnswers: fixture.critiqueQA.answers, expandedText: fixture.expandedText, gddContent: fixture.gddContent,
  pitchDeckContent: fixture.pitchDeckContent, generatedImages: { ...fixture.generatedImages, smoke_image: 'data:image/png;base64,abc' }, mvpDefinition: fixture.mvpDefinition,
  mvpFeatureSpecs: fixture.mvpFeatureSpecs, tddContent: fixture.tddContent, technicalDesignDocument: fixture.technicalDesignDocument,
  generationDiagnostic: { stage: 'mvp-feature-specs', message: 'Technical specification validation failed in a prior attempt.', validationOutcomes: [{ requestedFeature: 'Squad movement', valid: false, errors: ['Technical specification was missing.'], warnings: [], parseErrors: [], repaired: true }] },
  conciergeMode: 'completion-gate',
  memoryEntries: [{ id: 'memory-smoke', kind: 'fact', text: 'The project is offline-first.', status: 'confirmed', sourceReferences: ['smoke-chat'] }],
  userProxy: { perspective: 'A player who wants fast onboarding.', priorities: ['Fast onboarding'], concerns: ['Complex setup'], sourceReferences: ['smoke-chat'] },
  riskCritique: { risks: [{ id: 'risk-smoke', risk: 'Scope growth', consequence: 'Longer delivery', decision: 'Keep the MVP focused', questions: [], severity: 'Medium', sourceReferences: ['smoke-chat'] }] },
  synthesis: { summary: 'The project is ready for focused implementation.', acceptedDecisions: ['Keep the MVP offline-first.'], unresolvedQuestions: ['Which platform ships first?'], outputReferences: ['gdd'] },
  transcriptRecord: { messages: fixture.chatHistory, preservedInFull: true, updatedAt: Date.now() },
  assetList: fixture.assetList, scopeReviewContent: fixture.scopeReviewContent, scopeReviewLens: null, modularBreakdown: fixture.modularBreakdown,
  gddGenerated: true, pitchDeckGenerated: true, mvpGenerated: true, tddSpecsGenerated: true, tddDocGenerated: true,
  assetListGenerated: true, scopeReviewGenerated: true, modularBreakdownGenerated: true, costUSD: 0,
};
const compressed = pako.deflate(JSON.stringify([project]));
let binary = '';
for (const byte of compressed) binary += String.fromCharCode(byte);
const historyValue = Buffer.from(binary, 'binary').toString('base64');
const appExportFixture = readFileSync(path.join(root, 'Output Files/Gemini3.7Flash/Space_Marines_Project_Package.html'), 'utf8');
assert.match(appExportFixture, /<nav\b[^>]*id=["']toc["'][^>]*>/i, 'active App HTML export should expose TOC navigation');
assert.match(appExportFixture, /<a\b[^>]*href=["']#section-[^"']+["']/i, 'active App HTML export should link to sections');
assert.match(appExportFixture, /<details\b[^>]*>/i, 'active App HTML export should expose collapsible sections');
assert.match(appExportFixture, /<main\b[^>]*>/i, 'active App HTML export should expose a main content region');

const server = spawn('npm', ['run', 'dev', '--', '--port', '3000', '--host', '127.0.0.1'], { cwd: root, shell: true, stdio: 'pipe' });
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(appUrl)).ok) break; } catch {}
    await sleep(500);
    if (attempt === 59) throw new Error('Vite did not start for presentation smoke test.');
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(({ value }) => localStorage.setItem('devDoctorAiProjectHistories', value), { value: historyValue });
    const page = await context.newPage();
    await page.goto(appUrl, { waitUntil: 'networkidle' });
    await page.locator('h2:has-text("Rich project package")').waitFor();
    const preview = page.locator('iframe[title="Space Marines rich package preview"]');
    await preview.waitFor();
    const frame = page.frames().find(candidate => candidate !== page.mainFrame() && candidate.url() === 'about:srcdoc');
    assert.ok(frame, 'rich preview iframe should load its srcDoc');
    await frame.locator('nav.toc').waitFor();
    assert.ok(await frame.locator('details.package-section').count() >= 2, 'rich package should expose collapsible sections');
    assert.ok(await frame.locator('img[src*="data:image"]').count() > 0, 'rich package should render generated images');
    assert.ok(await frame.getByText('MVP Feature Specifications — Generation Diagnostic').count() > 0, 'rich package should retain the MVP failure diagnostic');
    assert.ok(await frame.getByText('Asset List', { exact: true }).count() > 0, 'asset list should remain visible after an MVP diagnostic');
    assert.ok(await frame.getByText('Scope Review', { exact: true }).count() > 0, 'scope review should remain visible after an MVP diagnostic');
    await frame.locator('details.package-section').first().locator('summary').click();
    assert.equal(await frame.locator('details.package-section').first().getAttribute('open'), null, 'section should collapse');

    await page.getByRole('button', { name: 'Show sections' }).click();
    await page.locator('h3:has-text("Design Document (GDD/PRD)")').waitFor();
    assert.ok(await page.locator('h3:has-text("Pitch Deck")').count() > 0, 'legacy viewers should remain accessible');

    await page.getByRole('button', { name: 'Memory & Persona Records' }).click();
    const personaViewer = page.locator('[data-testid="persona-records-viewer"]');
    await personaViewer.waitFor();
    assert.ok(await personaViewer.getByText('Concierge mode').count() > 0, 'persona viewer should expose Concierge mode');
    assert.ok(await personaViewer.getByText('Structured memory').count() > 0, 'persona viewer should expose structured memory');
    assert.ok(await personaViewer.getByText('User Proxy').count() > 0, 'persona viewer should expose User Proxy');
    assert.ok(await personaViewer.getByText('Senior Technical Analyst risks').count() > 0, 'persona viewer should expose risk critique');
    assert.ok(await personaViewer.getByText('Synthesis').count() > 0, 'persona viewer should expose synthesis');
    assert.ok(await personaViewer.getByText('Full transcript status').count() > 0, 'persona viewer should expose transcript status');

    const shareData = { ...fixture, projectName: fixture.meta.projectName, projectType: 'GAME' };
    await page.route('**/api/get-share/smoke-share', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(shareData) }));
    await page.goto(`${appUrl}#share_id=smoke-share`, { waitUntil: 'networkidle' });
    await page.locator('text=Rich shared package:').waitFor();
    await page.locator('iframe[title="Space Marines rich package preview"]').waitFor();
    assert.equal(await page.locator('button:has-text("Create Your Own Project")').count(), 1, 'rich share landing should render its header');
    console.log('Rich presentation browser smoke assertions passed.');
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGTERM');
}