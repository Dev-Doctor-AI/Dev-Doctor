import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-production-handoff-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck',
    '--outDir', output, join(root, 'types.ts'), join(root, 'services/productionHandoffContract.ts'),
  ], { stdio: 'inherit' });
  const contract = await import(pathToFileURL(join(output, 'services/productionHandoffContract.js')).href);
  const brief = { id: 'brief-ui', title: 'UI Production Brief', role: 'UI Designer', category: 'design', taskOverview: 'Design the accessible HUD.', scopeOfWork: ['HUD layout'], deliverables: ['HUD mockups'], acceptanceCriteria: ['Touch targets are at least 64px.'], dependencies: [], relatedBriefs: [], constraints: ['Mobile portrait'], outOfScope: ['Marketing art'] };
  assert.equal(contract.validateProductionBrief(brief).valid, true);
  assert.equal(contract.validateProductionBriefs([brief, { ...brief, id: 'brief-audio', role: 'Audio Designer', category: 'audio' }]).valid, true);
  assert.equal(contract.validateProductionBriefs([brief, { ...brief }]).valid, false);
  assert.equal(contract.validateProductionBriefs([{ ...brief, relatedBriefs: ['missing-brief'] }]).valid, false);
  const relatedBriefs = [
    { ...brief, relatedBriefs: ['Audio Production Brief', 'missing-brief'] },
    { ...brief, id: 'brief-audio', title: 'Audio Production Brief', role: 'Audio Designer', category: 'audio', relatedBriefs: ['brief-ui'] },
  ];
  const normalizedRelatedBriefs = contract.normalizeRelatedBriefReferences(relatedBriefs);
  assert.deepEqual(normalizedRelatedBriefs[0].relatedBriefs, ['brief-audio']);
  assert.deepEqual(normalizedRelatedBriefs[1].relatedBriefs, ['brief-ui']);
  assert.equal(contract.validateProductionBriefs(normalizedRelatedBriefs).valid, true);
  const parsedBriefs = contract.parseProductionBriefsResponse([brief]);
  assert.equal(parsedBriefs.briefs[0].id, 'brief-ui');
  assert.equal(parsedBriefs.validation.valid, true);
  const parsedWithTitleReference = contract.parseProductionBriefsResponse([
    { ...brief, relatedBriefs: ['Audio Production Brief'] },
    { ...brief, id: 'brief-audio', title: 'Audio Production Brief', role: 'Audio Designer', category: 'audio', relatedBriefs: [] },
  ]);
  assert.equal(parsedWithTitleReference.validation.valid, true);
  assert.deepEqual(parsedWithTitleReference.briefs[0].relatedBriefs, ['brief-audio']);
  assert.equal(contract.parseProductionBriefsResponse([{ title: 'Malformed' }]).validation.valid, false);
  assert.equal(contract.projectProductionBriefsToLegacy([brief])[0].title, 'UI Production Brief');
  assert(contract.projectProductionBriefsToLegacy([brief])[0].content.includes('Touch targets'));
  const asset = { id: 'hud-main', category: 'UI', name: 'Main HUD', purpose: 'Displays score and pause state.', format: 'SVG', dependencies: [], ownerRole: 'UI Designer', acceptanceCriteria: ['Readable at 1280x720.'] };
  assert.equal(contract.validateAssetMetadata(asset).valid, true);
  assert.equal(contract.validateAssetMetadataCollection([asset, { ...asset }]).valid, false);
  const parsedAssets = contract.parseAssetMetadataResponse([asset]);
  assert.equal(parsedAssets.assets[0].id, 'hud-main');
  const aliasedAssets = contract.parseAssetMetadataResponse({ assets: [{ assetId: 'alias-asset', assetCategory: 'UI', assetName: 'Alias Asset', description: 'Alias purpose', owner: 'UI Designer', acceptance: ['It is readable.'] }] });
  assert.equal(aliasedAssets.validation.valid, true);
  assert.equal(aliasedAssets.assets[0].id, 'alias-asset');
  assert.deepEqual(contract.projectAssetMetadataToLegacyList(parsedAssets.assets), { UI: ['Main HUD — Displays score and pause state. — SVG'] });
  const prompt = { assetId: 'hud-main', prompt: 'Accessible game HUD with high contrast controls.', aspectRatio: '16:9', sourceReferences: ['brief-ui'] };
  assert.equal(contract.validateVisualPrompts([prompt], ['hud-main']).valid, true);
  assert.equal(contract.validateVisualPrompts([prompt], ['other-asset']).valid, false);
  assert.equal(contract.validateVisualPrompts([prompt], ['hud-main', 'concept-art']).valid, false);
  const parsedPrompts = contract.parseVisualPromptResponse([prompt], ['hud-main']);
  assert.equal(parsedPrompts.prompts[0].assetId, 'hud-main');
  assert.deepEqual(contract.projectVisualPromptsToLegacyMap(parsedPrompts.prompts), { 'hud-main': prompt.prompt });
  const invalidPrompts = contract.parseVisualPromptResponse([
    prompt,
    { ...prompt, assetId: 'unknown-asset' },
  ], ['hud-main', 'concept-art']);
  assert.equal(invalidPrompts.validation.valid, false);
  assert.ok(invalidPrompts.validation.errors.some(error => error.includes('unknown asset ID')));
  assert.ok(invalidPrompts.validation.errors.some(error => error.includes('Missing visual prompt')));
  console.log('Production handoff contract assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}