import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-share-package-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck', '--outDir', output, join(root, 'types.ts'), join(root, 'services/sharePackage.ts')], { stdio: 'inherit' });
  const share = await import(pathToFileURL(join(output, 'services/sharePackage.js')).href);
  const pkg = { meta: { projectName: 'Share Test', generatedAt: 1 }, chatHistory: [], critiqueQA: { summary: '', questions: [], answers: [] }, expandedText: '', gddContent: [], pitchDeckContent: [], generatedImages: {}, mvpDefinition: null, mvpFeatureSpecs: null, tddContent: null, technicalDesignDocument: [], modularBreakdown: [], assetList: {}, scopeReviewContent: [] };
  assert.equal(share.isRichSharePackage(pkg), true);
  assert.equal(share.createSharePayload(pkg), pkg);
  assert.equal(share.isRichSharePackage({ projectName: 'Legacy' }), false);
  console.log('Share package assertions passed.');
} finally { rmSync(output, { recursive: true, force: true }); }