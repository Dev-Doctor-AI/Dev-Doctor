import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-unified-pipeline-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck', '--outDir', output,
    join(root, 'vite-env.d.ts'),
    join(root, 'types.ts'), join(root, 'services/pipelineOrchestrator.ts'), join(root, 'services/lmStudioService.ts'),
    join(root, 'services/memoryPersonaContract.ts'), join(root, 'services/orchestrationContract.ts'), join(root, 'services/bddFeatureValidator.ts'),
    join(root, 'services/technicalSpecContract.ts'), join(root, 'services/productionHandoffContract.ts'), join(root, 'services/scopePitchContract.ts'),
  ], { stdio: 'inherit' });
  const patchImports = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) patchImports(path);
      else if (entry.name.endsWith('.js')) {
        const source = readFileSync(path, 'utf8').replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g, (_match, start, specifier, end) => `${start}${specifier.endsWith('.js') ? specifier : `${specifier}.js`}${end}`);
        writeFileSync(path, source);
      }
    }
  };
  patchImports(output);
  globalThis.importMetaEnv = { VITE_LM_ENDPOINT: 'http://127.0.0.1:1235/v1/chat/completions' };
  const aiProviderPath = join(output, 'services/aiProvider.js');
  writeFileSync(aiProviderPath, readFileSync(aiProviderPath, 'utf8').replace('import.meta.env.VITE_LM_ENDPOINT', 'globalThis.importMetaEnv.VITE_LM_ENDPOINT'));
  const stubPath = join(output, 'services/test-ai-stub.js');
  writeFileSync(stubPath, `
export const getExpandedTextFromCanonicalContext = async () => { globalThis.__order.push('getExpandedTextFromCanonicalContext'); return 'Canonical Garden Quest brief'; };
export const generateGDDTableOfContents = async () => { globalThis.__order.push('generateGDDTableOfContents'); return ['Core Loop']; };
export const generateFullGDDV2 = async () => { globalThis.__order.push('generateFullGDDV2'); return globalThis.__gdd; };
export const defineMVP = async () => { globalThis.__order.push('defineMVP'); return { summary: 'Bounded MVP.', inScope: ['Plant Seed'], outOfScope: ['Multiplayer'] }; };
export const generateMVPFeatureSpec = async () => { globalThis.__order.push('generateMVPFeatureSpec'); return { featureSpec: globalThis.__feature, outcome: { requestedFeature: 'Plant Seed', featureId: 'plant-seed', valid: true, errors: [], warnings: [], parseErrors: [], repaired: false } }; };
export const generateTechnicalSpecification = async () => { globalThis.__order.push('generateTechnicalSpecification'); return { specification: globalThis.__specification, valid: true, errors: [], warnings: [], parseErrors: [], repaired: false }; };
export const generateTechnicalDesignDocument = async () => { globalThis.__order.push('generateTechnicalDesignDocument'); return [{ title: 'Architecture', content: 'Validated architecture.' }]; };
export const generateProductionBriefs = async () => { globalThis.__order.push('generateProductionBriefs'); return globalThis.__briefs; };
export const generateAssetMetadata = async () => { globalThis.__order.push('generateAssetMetadata'); return globalThis.__assets; };
export const generateVisualPromptContracts = async () => { globalThis.__order.push('generateVisualPromptContracts'); return [{ assetId: 'garden-art', prompt: 'Garden art prompt', sourceReferences: ['garden-art'] }]; };
export const generateImage = async () => { globalThis.__order.push('generateImage'); return null; };
export const generateFullPitchDeck = async (source, projectName, template, sourceIds) => { globalThis.__order.push('generateFullPitchDeck'); if (!source.includes('productionBriefs') || !sourceIds.includes('assets')) throw new Error('Pitch did not receive completed upstream sources.'); return globalThis.__slides; };
export const generateScopeReview = async () => { globalThis.__order.push('generateScopeReview'); return globalThis.__review; };
`);
  const pipelinePath = join(output, 'services/pipelineOrchestrator.js');
  writeFileSync(pipelinePath, readFileSync(pipelinePath, 'utf8').replace("'./lmStudioService.js'", "'./test-ai-stub.js'"));

  const orchestrator = await import(pathToFileURL(join(output, 'services/pipelineOrchestrator.js')).href);
  const order = [];
  globalThis.__order = order;
  const gdd = [{ title: 'Core Loop', content: 'Garden Quest planting loop.' }];
  const feature = {
    id: 'plant-seed', feature: 'Plant Seed', userStory: 'As a player, I want to plant a seed so that my garden grows.',
    scenarios: [{ id: 'plant-success', type: 'happy-path', title: 'Planting', given: ['A seed is available'], when: ['The player plants it'], then: ['The seed enters the garden'] }, { id: 'plant-invalid', type: 'failure', title: 'No seed', given: ['No seed is available'], when: ['The player attempts planting'], then: ['The action is rejected'] }],
    dependencies: [], acceptanceCriteria: ['A seed enters the garden.'], technicalNotes: 'Seed placement state.',
  };
  const specification = {
    featureId: 'plant-seed', feature: 'Plant Seed', userStory: feature.userStory, scenarios: feature.scenarios,
    dataModels: [{ name: 'Seed', purpose: 'Stores seed state', fields: [{ name: 'id', type: 'string', required: true }] }],
    apiContracts: [{ name: 'plant-seed', method: 'EVENT', path: 'seed.plant', errors: [] }],
    stateTransitions: [{ from: 'Available', event: 'plant', to: 'Planted', effects: [] }], dependencies: [], acceptanceCriteria: feature.acceptanceCriteria, source: 'bdd-feature-spec',
  };
  const briefs = [{ id: 'design-brief', title: 'Design Brief', role: 'Designer', category: 'design', taskOverview: 'Design the garden.', scopeOfWork: ['Create garden layout.'], deliverables: ['Layout'], acceptanceCriteria: ['Layout is approved.'], dependencies: [], relatedBriefs: [], constraints: [], outOfScope: ['Unrelated work'], sourceReferences: ['gdd'] }];
  const assets = [{ id: 'garden-art', category: 'environment', name: 'Garden art', purpose: 'Shows the garden.', ownerRole: 'Artist', acceptanceCriteria: ['Garden art is readable.'], dependencies: [], sourceReferences: ['gdd'] }];
  const slides = [{ title: 'Vision', content: 'Garden Quest vision.', claims: [{ text: 'Garden Quest grows gardens.', grounded: true, sourceReferences: ['gdd'] }] }];
  const review = [{ feature: 'Scope', critique: 'Keep the garden focused.', suggestion: 'Limit initial crops.', reasoning: 'Protects delivery.', severity: 'Medium', lens: 'indie', sourceReferences: ['gdd'] }];
  globalThis.__gdd = gdd; globalThis.__feature = feature; globalThis.__specification = specification;
  globalThis.__briefs = briefs; globalThis.__assets = assets; globalThis.__slides = slides; globalThis.__review = review;

  const progress = [];
  const packageResult = await orchestrator.runUnifiedPipeline(
    'user: Garden Quest is an offline family gardening game.', 'Garden Quest', 'indie', [{ title: 'Vision' }], [{ key: 'garden-art', description: 'Garden art', aspectRatio: '1:1' }],
    (percent, message) => progress.push({ percent, message }),
    { summary: 'Reviewed.', questions: ['Platform?'], answers: ['Tablet.'], completed: true, source: 'technical-analyst' },
    [], [{ id: 'fact', kind: 'fact', text: 'Offline family game.', status: 'confirmed', sourceReferences: ['chat'] }],
  );

  assert.deepEqual(order, ['getExpandedTextFromCanonicalContext', 'generateGDDTableOfContents', 'generateFullGDDV2', 'defineMVP', 'generateMVPFeatureSpec', 'generateTechnicalSpecification', 'generateTechnicalDesignDocument', 'generateProductionBriefs', 'generateAssetMetadata', 'generateVisualPromptContracts', 'generateImage', 'generateFullPitchDeck', 'generateScopeReview']);
  assert.equal(packageResult.gddContent.length, 1);
  assert.equal(packageResult.mvpFeatureSpecs.length, 1);
  assert.equal(packageResult.tddContent.length, 1);
  assert.equal(packageResult.productionBriefs.length, 1);
  assert.equal(packageResult.assetMetadata.length, 1);
  assert.equal(packageResult.pitchDeckContent.length, 1);
  assert.equal(packageResult.scopeReviewContent.length, 1);
  assert.equal(progress.at(-1).percent, 100);
  assert(order.indexOf('generateTechnicalDesignDocument') > order.indexOf('generateTechnicalSpecification'));
  console.log('Unified pipeline orchestration assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}