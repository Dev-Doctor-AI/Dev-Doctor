import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-technical-spec-'));

try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler',
    '--skipLibCheck', '--outDir', output, join(root, 'types.ts'),
    join(root, 'services/technicalSpecContract.ts'), join(root, 'services/personaPrompts.ts'),
  ], { stdio: 'inherit' });

  const contract = await import(pathToFileURL(join(output, 'services/technicalSpecContract.js')).href);
  const feature = {
    id: 'squad-deployment', feature: 'Squad Deployment',
    userStory: 'As a squad leader, I want to deploy a squad so that it secures the relay.',
    technicalNotes: 'DeploymentController validates roster capacity.',
    dependencies: ['Roster service'], acceptanceCriteria: ['Four units spawn in range.'],
    scenarios: [{ id: 'deploy-success', type: 'happy-path', given: ['Four ready units exist'], when: ['Leader confirms'], then: ['Units spawn'] }],
  };
  const spec = contract.assembleTechnicalSpecification(feature);
  assert.equal(spec.featureId, 'squad-deployment');
  assert.equal(spec.scenarios[0].id, 'deploy-success');
  assert.deepEqual(spec.dependencies, ['Roster service']);
  assert.equal(contract.validateTechnicalSpecification(spec).valid, true);
  const architectResponse = contract.parseTechnicalSpecificationResponse({
    featureId: 'model-supplied-id', feature: 'wrong feature', userStory: 'wrong story',
    scenarios: [],
    dataModels: [{ name: 'Deployment', purpose: 'Stores deployment state', fields: [{ name: 'count', type: 'integer', required: true }] }],
    apiContracts: [{ name: 'deploy-squad', method: 'EVENT', path: 'squad.deploy', errors: [] }],
    stateTransitions: [{ from: 'Ready', event: 'confirm', to: 'Active', effects: ['Spawn units'] }],
    dependencies: ['Roster service'], acceptanceCriteria: ['Four units spawn in range.'],
  });
  assert.equal(architectResponse.validation.valid, false, 'empty source scenarios are rejected before the architect gate');
  assert(architectResponse.specification, 'normalized architect fields remain available for source-authoritative scenario injection');
  const wrappedArchitectResponse = contract.parseTechnicalSpecificationResponse({ technicalSpecification: architectResponse.specification });
  assert(wrappedArchitectResponse.specification, 'common technicalSpecification envelopes should be unwrapped');
  assert.equal(wrappedArchitectResponse.specification.dataModels[0].name, 'Deployment');
  const arrayWrappedArchitectResponse = contract.parseTechnicalSpecificationResponse([{ specification: architectResponse.specification }]);
  assert(arrayWrappedArchitectResponse.specification, 'single-item response arrays should be unwrapped');
  const sourcePreservedArchitectResponse = {
    ...architectResponse.specification,
    featureId: feature.id,
    feature: feature.feature,
    userStory: feature.userStory,
    scenarios: feature.scenarios,
    source: 'bdd-feature-spec',
  };
  assert.equal(contract.validateTechnicalSpecification(sourcePreservedArchitectResponse, { requireArchitectFields: true }).valid, true);
  assert.equal(contract.validateTechnicalSpecification({ ...spec, dataModels: [{ name: '', purpose: '', fields: [] }] }).valid, false);
  assert.equal(contract.validateTechnicalSpecification(spec, { requireArchitectFields: true }).valid, false);
  const architectSpec = {
    ...spec,
    dataModels: [{ name: 'Deployment', purpose: 'Stores deployment state', fields: [{ name: 'count', type: 'integer', required: true }] }],
    apiContracts: [{ name: 'deploy-squad', method: 'EVENT', path: 'squad.deploy' }],
    stateTransitions: [{ from: 'Ready', event: 'confirm', to: 'Active', effects: ['Spawn units'] }],
  };
  const assembled = contract.assembleValidatedTDDFeature(feature, architectSpec);
  assert.equal(assembled.valid, true);
  assert.equal(assembled.tddFeature.featureId, feature.id);
  assert.equal(assembled.tddFeature.technicalSpecs, feature.technicalNotes);
  assert.equal(assembled.tddFeature.technicalSpecification.dataModels[0].name, 'Deployment');
  const mismatch = contract.assembleValidatedTDDFeature(feature, { ...architectSpec, featureId: 'other-feature' });
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.tddFeature, null);
  const duplicateTraceability = contract.validateTechnicalSpecificationCollection([
    architectSpec,
    { ...architectSpec, feature: 'Second feature' },
  ], { requireArchitectFields: true });
  assert.equal(duplicateTraceability.valid, false);
  assert(duplicateTraceability.errors.some(error => error.includes('duplicates feature ID')));
  assert(duplicateTraceability.errors.some(error => error.includes('duplicates scenario ID')));
  const duplicateWithinFeature = contract.validateTechnicalSpecificationCollection([{
    ...architectSpec,
    scenarios: [architectSpec.scenarios[0], { ...architectSpec.scenarios[0] }],
  }]);
  assert.equal(duplicateWithinFeature.valid, false);
  const legacyCollection = contract.validateTechnicalSpecificationCollection([]);
  assert.equal(legacyCollection.valid, true);
  const collection = contract.assembleValidatedTDDFeatures([feature, { ...feature, id: 'second-feature' }], [architectSpec, null]);
  assert.equal(collection.valid, false);
  assert.equal(collection.tddFeatures.length, 1);
  const promptInputs = contract.prepareTechnicalDesignInputs([assembled.tddFeature, {
    feature: 'Legacy Feature', userStories: 'As a user...', technicalSpecs: 'Legacy technical notes',
  }]);
  assert.equal(promptInputs[0].technicalSpecification.dataModels[0].name, 'Deployment');
  assert.equal(promptInputs[0].scenarios[0].id, 'deploy-success');
  assert.equal(promptInputs[1].technicalSpecification, null);
  assert.equal(promptInputs[1].legacyTechnicalSpecs, 'Legacy technical notes');
  const bridge = contract.assembleTDDFeature(feature);
  assert.equal(bridge.featureId, 'squad-deployment');
  assert.equal(bridge.technicalSpecification.source, 'bdd-feature-spec');
  assert.equal(contract.validateTechnicalSpecification({}).valid, false);
  const prompts = await import(pathToFileURL(join(output, 'services/personaPrompts.js')).href);
  assert(prompts.buildTechnicalSpecRoleGuidance().includes('Data Model'));
  assert(prompts.buildTddRoleGuidance().includes('System Architecture'));
  console.log('Technical specification contract assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}
