import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-rich-coverage-'));
const fixturePaths = [
  join(root, 'Output Files/Gemini3.7Flash/Space_Marines_Project_Package.json'),
  join(root, 'Output Files/Mistral/Bluetooth_Content_Share_Project_Package.json'),
];

try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck',
    '--outDir', output, join(root, 'types.ts'), join(root, 'services/packageExporter.ts'), join(root, 'services/sharePackage.ts'),
  ], { stdio: 'inherit' });
  symlinkSync(join(root, 'node_modules'), join(output, 'node_modules'), 'dir');
  const { exportMarkdown, exportHTML } = await import(pathToFileURL(join(output, 'services/packageExporter.js')).href);
  const { isRichSharePackage, createSharePayload } = await import(pathToFileURL(join(output, 'services/sharePackage.js')).href);

  for (const fixturePath of fixturePaths) {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    assert.equal(isRichSharePackage(fixture), true, `${fixture.meta.projectName} should remain a rich-compatible package`);
    assert.ok(fixture.gddContent.length > 0);
    assert.ok(fixture.pitchDeckContent.length > 0);
    assert.ok(fixture.mvpFeatureSpecs.length > 0);
    assert.ok(fixture.technicalDesignDocument.length > 0);
    assert.ok(fixture.modularBreakdown.length > 0);
    assert.ok(Object.keys(fixture.assetList).length > 0);
    assert.ok(fixture.scopeReviewContent.length > 0);
    assert.ok(Object.keys(fixture.generatedImages).length > 0);

    const html = exportHTML(fixture);
    assert.match(html, /<nav class="toc">/);
    assert.match(html, /MVP Feature Specifications \(BDD\)/);
    assert.match(html, /Technical Design Document/);
    assert.match(html, /Freelance Briefs/);
    assert.match(html, /Asset List/);
    assert.match(html, /Scope Review/);
  }

  const base = JSON.parse(readFileSync(fixturePaths[0], 'utf8'));
  const enriched = {
    ...base,
    transcriptRecord: { messages: base.chatHistory, preservedInFull: true, updatedAt: 0 },
    generationMetadata: { runId: 'coverage-run', provider: 'fixture', model: 'fixture-model', stages: [] },
    memoryEntries: [{ id: 'memory-1', kind: 'fact', text: 'Squad survival is the core loop.', status: 'confirmed', sourceReferences: ['chat-1'] }],
    userProxy: { perspective: 'A co-op player', priorities: ['Readable combat'], concerns: ['Overwhelming swarms'], sourceReferences: ['chat-1'] },
    riskCritique: { risks: [{ id: 'risk-1', risk: 'Enemy density', consequence: 'Performance degradation', severity: 'High', questions: [], sourceReferences: ['gdd'] }] },
    synthesis: { summary: 'Keep the first slice focused.', acceptedDecisions: ['Four-player co-op'], unresolvedQuestions: ['Final enemy budget'], outputReferences: ['gdd'] },
    mvpFeatureSpecValidation: [{ requestedFeature: 'Squad movement', featureId: 'feature-1', valid: true, errors: [], warnings: [], parseErrors: [], repaired: false }],
    productionBriefs: [{ id: 'brief-1', title: 'Combat UI brief', role: 'UI designer', category: 'design', taskOverview: 'Define squad combat readability.', scopeOfWork: ['HUD'], deliverables: ['HUD mockup'], acceptanceCriteria: ['Readable at 1080p'], dependencies: [], relatedBriefs: [], constraints: [], outOfScope: [] }],
    assetMetadata: [{ id: 'asset-1', category: 'UI', name: 'Squad HUD', purpose: 'Show squad status.', dependencies: [], ownerRole: 'UI designer', acceptanceCriteria: ['Readable at 1080p'] }],
    visualPromptContracts: [{ assetId: 'asset-1', prompt: 'Industrial military HUD.', aspectRatio: '16:9', sourceReferences: ['brief-1'] }],
  };
  assert.equal(isRichSharePackage(enriched), true);
  assert.equal(createSharePayload(enriched), enriched);
  const markdown = exportMarkdown(enriched);
  for (const heading of [
    '## Full Transcript Record', '## Generation Metadata', '## Memory and Persona Records',
    '## MVP Feature Specification Validation', '## Structured Production Handoffs',
    '## Asset Metadata and Visual Prompt Contracts',
  ]) assert.match(markdown, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const html = exportHTML(enriched);
  assert.match(html, /Squad survival is the core loop/);
  assert.match(html, /Combat UI brief/);
  assert.match(html, /Industrial military HUD/);
  console.log('Rich package coverage assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}