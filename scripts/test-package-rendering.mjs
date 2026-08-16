import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-rendering-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck',
    '--outDir', output, join(root, 'types.ts'), join(root, 'services/packageExporter.ts'),
  ], { stdio: 'inherit' });
  symlinkSync(join(root, 'node_modules'), join(output, 'node_modules'), 'dir');
  const { exportMarkdown, exportHTML } = await import(pathToFileURL(join(output, 'services/packageExporter.js')).href);
  const pkg = {
    meta: { projectName: 'Render Test', generatedAt: 0 },
    chatHistory: [{ sender: 'user', text: 'Build an offline prototype.' }],
    critiqueQA: { summary: 'Keep scope small.', questions: ['What is the riskiest dependency?'], answers: ['Asset production.'] },
    critiqueRecord: { summary: 'Keep scope small.', questions: ['What is the riskiest dependency?'], answers: ['Asset production.'], completed: true, source: 'technical-analyst' },
    expandedText: '', gddContent: [{ title: 'Overview', content: 'Use **Markdown** and a table.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst ready = true;\n```' }],
    pitchDeckContent: [], generatedImages: { logo: 'data:image/png;base64,abc' }, mvpDefinition: null,
    mvpFeatureSpecs: null, tddContent: null, technicalDesignDocument: null,
    modularBreakdown: [{ title: 'Gameplay Engineer Brief', content: 'Implement the offline prototype.' }],
    assetList: { code: ['Offline save controller'] },
    generationDiagnostic: { stage: 'mvp-feature-specs', message: 'Generated MVP feature specifications failed validation.', validationOutcomes: [{ requestedFeature: 'Offline save', valid: false, errors: ['Requires a happy-path scenario.'], warnings: [], parseErrors: [], repaired: true }] },
    memoryEntries: [{ id: 'fact-1', kind: 'fact', text: 'Offline-first', status: 'confirmed', sourceReferences: ['chat-1'] }],
    userProxy: { perspective: 'A casual player', priorities: ['Fast onboarding'], concerns: [], sourceReferences: ['chat-1'] },
    riskCritique: { risks: [{ id: 'risk-1', risk: 'Scope', consequence: 'Delay', severity: 'High', questions: [], sourceReferences: ['gdd'] }] },
    synthesis: { summary: 'Ready to prototype.', acceptedDecisions: ['Offline'], unresolvedQuestions: [], outputReferences: ['gdd'] },
    scopeReviewContent: [{ feature: 'Offline save', severity: 'Medium', critique: 'Storage can fail.', suggestion: 'Use atomic writes.' }],
  };
  const markdown = exportMarkdown(pkg);
  assert(markdown.includes('## Conversation and Critique'));
  assert(markdown.includes('## Memory and Persona Records'));
  assert(markdown.includes('MVP Feature Specifications — Generation Diagnostic'));
  assert(markdown.includes('Requires a happy-path scenario.'));
  assert(markdown.includes('## Freelance Briefs'));
  assert(markdown.includes('## Asset List'));
  assert(markdown.includes('Offline save controller'));
  assert(markdown.includes('## Scope Review'));
  assert(markdown.includes('```ts'));
  const html = exportHTML(pkg);
  assert(html.includes('<nav class="toc">'));
  assert(html.includes('href="#section-'));
  assert(html.includes('<table>'));
  assert(html.includes('<pre><code class="language-ts">'));
  assert(html.includes('data:image/png;base64,abc'));
  assert(html.includes('Offline-first'));
  assert(html.includes('MVP Feature Specifications — Generation Diagnostic'));
  assert(html.includes('Offline save controller'));
  assert(html.includes('Scope Review'));
  console.log('Package rendering assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}