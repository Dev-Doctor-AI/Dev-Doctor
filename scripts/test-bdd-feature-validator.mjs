import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const outputDirectory = mkdtempSync(join(tmpdir(), 'dev-doctor-bdd-validator-'));

try {
  execFileSync(
    join(projectRoot, 'node_modules/.bin/tsc'),
    [
      '--target', 'ES2022',
      '--module', 'ESNext',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
      '--outDir', outputDirectory,
      join(projectRoot, 'types.ts'),
      join(projectRoot, 'services/bddFeatureValidator.ts'),
      join(projectRoot, 'services/packageExporter.ts'),
    ],
    { stdio: 'inherit' },
  );
  symlinkSync(join(projectRoot, 'node_modules'), join(outputDirectory, 'node_modules'), 'dir');

  const { formatMVPFeatureSpecRepairIssues, mvpFeatureSpecNeedsRepair, normalizeMVPFeatureSpec, omitOptionalGenericFiller, parseMVPFeatureSpecResponse, validateMVPFeatureSpec, validateMVPFeatureSpecs } = await import(
    pathToFileURL(join(outputDirectory, 'services/bddFeatureValidator.js')).href,
  );
  const { exportMarkdown, exportText } = await import(pathToFileURL(join(outputDirectory, 'services/packageExporter.js')).href);

  // Deterministic structural fixture inspired by the Space Marines output, not a model-text snapshot.
  const spaceMarinesFeature = {
    id: 'squad-deployment',
    feature: 'Squad Deployment',
    userStory: 'As a squad leader, I want to deploy four Space Marines at a selected drop zone so that the squad can secure the relay.',
    technicalNotes: 'The DeploymentController validates four roster slots, emits squad_deployed, and spawns units within a 12 metre drop radius.',
    scenarios: [
      {
        id: 'deployment-success',
        type: 'happy-path',
        given: ['The player has selected four ready Space Marines and a visible relay drop zone.'],
        when: ['The player confirms deployment.'],
        then: ['All four units spawn within 12 metres of the relay and the mission state changes to Active.'],
      },
      {
        id: 'deployment-capacity-limit',
        type: 'boundary',
        given: ['The roster already contains four deployed Space Marines.'],
        when: ['The player attempts to deploy a fifth unit.'],
        then: ['The deploy action remains disabled and the roster displays "Maximum squad size: 4".'],
      },
    ],
  };

  const spaceMarinesResult = validateMVPFeatureSpec(spaceMarinesFeature, { requireStrongContract: true });
  assert.deepEqual(spaceMarinesResult, { valid: true, errors: [], warnings: [] });
  assert.equal(spaceMarinesFeature.scenarios.length, 2);
  assert(spaceMarinesFeature.scenarios.some(scenario => scenario.type === 'happy-path'));
  assert(spaceMarinesFeature.scenarios.some(scenario => scenario.type === 'boundary'));
  assert(spaceMarinesFeature.scenarios.every(scenario => scenario.given.length && scenario.when.length && scenario.then.length));
  assert(spaceMarinesFeature.scenarios.some(scenario => scenario.then.join(' ').includes('12 metres')));

  // Deterministic structural fixture inspired by the weak Space Miner output, not a model-text snapshot.
  const spaceMinerGenericFeature = {
    ...spaceMarinesFeature,
    id: 'dynamic-resource-management',
    feature: 'Dynamic Resource Management',
    userStory: 'As a miner, I want resources managed dynamically so that the game remains playable.',
    technicalNotes: 'Use a standard implementation for resource management.',
    boundaryConditions: ['Minimum and maximum sizes for planets and terrain features.'],
    scenarios: [
      {
        id: 'resource-load-success', type: 'happy-path',
        given: ['The player enters a mining sector.'], when: ['The resource manager loads resources.'],
        then: ['The system behaves as expected.'],
      },
      {
        id: 'resource-load-failure', type: 'failure',
        given: ['The terrain generator has an unexpected error.'], when: ['The resource manager cannot load resources.'],
        then: ['An appropriate error message is displayed.'],
      },
    ],
  };
  const spaceMinerGenericResult = validateMVPFeatureSpec(spaceMinerGenericFeature, { requireStrongContract: true });
  assert.equal(spaceMinerGenericResult.valid, true);
  assert.equal(spaceMinerGenericResult.errors.length, 0);
  assert(spaceMinerGenericResult.warnings.some(warning => warning.includes('standard implementation')));
  assert(spaceMinerGenericResult.warnings.some(warning => warning.includes('system behaves as expected')));
  assert(spaceMinerGenericResult.warnings.some(warning => warning.includes('appropriate error message')));
  const parsedSpaceMinerFixture = parseMVPFeatureSpecResponse(JSON.stringify(spaceMinerGenericFeature), true);
  assert(parsedSpaceMinerFixture.featureSpec);
  assert.equal(parsedSpaceMinerFixture.validation.warnings.length, spaceMinerGenericResult.warnings.length);
  const optionalFillerFeature = {
    ...spaceMarinesFeature,
    telemetry: ['Emit squad_deployed.', 'The system behaves as expected.'],
    offlineBehavior: 'Handle invalid input accordingly.',
    scenarios: spaceMarinesFeature.scenarios.map((scenario, index) => ({ ...scenario, notes: index === 0 ? 'TBD' : undefined })),
  };
  const cleanedOptionalFiller = omitOptionalGenericFiller(optionalFillerFeature);
  assert.deepEqual(cleanedOptionalFiller.telemetry, ['Emit squad_deployed.']);
  assert.equal(cleanedOptionalFiller.offlineBehavior, undefined);
  assert.equal(cleanedOptionalFiller.scenarios[0].notes, undefined);
  assert.deepEqual(validateMVPFeatureSpec(cleanedOptionalFiller, { requireStrongContract: true }), { valid: true, errors: [], warnings: [] });
  const requiredFillerFeature = omitOptionalGenericFiller(spaceMinerGenericFeature);
  assert(requiredFillerFeature.scenarios[0].then.includes('The system behaves as expected.'));
  assert(validateMVPFeatureSpec(requiredFillerFeature, { requireStrongContract: true }).warnings.length > 0);

  const legacyFeature = {
    id: 'legacy-save',
    feature: 'Legacy Save',
    userStory: 'As a returning player, I want my local save restored so that I can continue the campaign.',
    technicalNotes: 'Load the JSON save from local storage and restore the campaign map state.',
    scenarios: [{
      given: ['A valid local campaign save exists.'],
      when: ['The player launches the game.'],
      then: ['The saved campaign map is restored before the main menu opens.'],
    }],
  };
  assert.deepEqual(validateMVPFeatureSpec(legacyFeature), { valid: true, errors: [], warnings: [] });

  const normalizedResult = normalizeMVPFeatureSpec({
    ...spaceMarinesFeature,
    acceptanceCriteria: [' The relay is secured after a valid deployment. '],
    performanceTargets: [' Deployment completes within 200 ms. '],
    scenarios: [spaceMarinesFeature.scenarios[0], { given: [], when: ['ignored'], then: ['ignored'] }, spaceMarinesFeature.scenarios[1]],
  });
  assert.equal(normalizedResult.featureSpec.scenarios.length, 2);
  assert.equal(normalizedResult.featureSpec.scenarios[0].id, 'deployment-success');
  assert.equal(normalizedResult.featureSpec.scenarios[1].type, 'boundary');
  assert.deepEqual(normalizedResult.featureSpec.acceptanceCriteria, ['The relay is secured after a valid deployment.']);
  assert.deepEqual(normalizedResult.featureSpec.performanceTargets, ['Deployment completes within 200 ms.']);
  assert.equal(normalizedResult.warnings.length, 1);

  const strongResult = parseMVPFeatureSpecResponse(JSON.stringify(spaceMarinesFeature), true);
  assert.equal(strongResult.parseErrors.length, 0);
  assert.equal(strongResult.validation.valid, true);
  assert.equal(strongResult.featureSpec.scenarios[0].id, 'deployment-success');

  const legacyParsedResult = parseMVPFeatureSpecResponse(JSON.stringify(legacyFeature), false);
  assert.equal(legacyParsedResult.featureSpec.id, 'legacy-save');
  const weakGeneratedResult = parseMVPFeatureSpecResponse(JSON.stringify(legacyFeature), true);
  assert.equal(weakGeneratedResult.featureSpec, null);
  assert(weakGeneratedResult.validation.errors.some(error => error.includes('at least two scenarios')));
  assert(weakGeneratedResult.validation.errors.some(error => error.includes('happy-path')));
  const noScenarioResult = parseMVPFeatureSpecResponse(JSON.stringify({ ...legacyFeature, scenarios: [] }), true);
  assert.equal(noScenarioResult.featureSpec, null);
  assert(noScenarioResult.validation.errors.some(error => error.includes('at least one scenario')));
  assert.equal(mvpFeatureSpecNeedsRepair(noScenarioResult), true);
  assert(formatMVPFeatureSpecRepairIssues(noScenarioResult).includes('at least one scenario'));

  const warningOnlyResult = parseMVPFeatureSpecResponse(JSON.stringify(spaceMinerGenericFeature), true);
  assert(warningOnlyResult.featureSpec);
  assert(warningOnlyResult.validation.warnings.length > 0);
  assert.equal(mvpFeatureSpecNeedsRepair(warningOnlyResult), true);
  assert(formatMVPFeatureSpecRepairIssues(warningOnlyResult).includes('generic filler'));
  assert.equal(mvpFeatureSpecNeedsRepair(strongResult), false);

  const weakCollectionResult = validateMVPFeatureSpecs([legacyFeature], { requireStrongContract: true });
  assert.equal(weakCollectionResult.valid, false);
  assert(weakCollectionResult.errors.some(error => error.includes('at least two scenarios')));

  const parseFailure = parseMVPFeatureSpecResponse('not JSON', true);
  assert.equal(parseFailure.featureSpec, null);
  assert.equal(parseFailure.parseErrors.length, 1);
  assert.equal(parseFailure.validation.errors.length, 0);

  const duplicateResult = validateMVPFeatureSpecs([spaceMarinesFeature, { ...spaceMarinesFeature, feature: 'Second Deployment' }]);
  assert.equal(duplicateResult.valid, false);
  assert(duplicateResult.errors.some(error => error.includes('duplicates feature ID "squad-deployment"')));

  const duplicateScenarioResult = validateMVPFeatureSpec({
    ...spaceMarinesFeature,
    scenarios: [spaceMarinesFeature.scenarios[0], { ...spaceMarinesFeature.scenarios[1], id: 'deployment-success' }],
  });
  assert.equal(duplicateScenarioResult.valid, false);
  assert(duplicateScenarioResult.errors.some(error => error.includes('duplicates scenario ID "deployment-success"')));

  const missingClausesResult = validateMVPFeatureSpec({
    ...spaceMarinesFeature,
    scenarios: [{ id: 'incomplete', given: [], when: ['The player confirms deployment.'], then: [] }],
  });
  assert.equal(missingClausesResult.valid, false);
  assert(missingClausesResult.errors.some(error => error.includes('Given clause')));
  assert(missingClausesResult.errors.some(error => error.includes('Then clause')));

  const exportPackage = {
    meta: { projectName: 'Relay Strike', generatedAt: 0 }, chatHistory: [], critiqueQA: { summary: '', questions: [], answers: [] },
    expandedText: '', gddContent: [], pitchDeckContent: [], generatedImages: {}, mvpDefinition: null,
    mvpFeatureSpecs: [{ ...spaceMarinesFeature, acceptanceCriteria: ['The relay is secured.'], failureStates: ['Deployment is blocked when the roster is full.'], telemetry: ['Emit squad_deployed.'], securityConsiderations: ['Only the squad leader can confirm deployment.'], performanceTargets: ['Deployment completes within 200 ms.'] }],
    tddContent: null, technicalDesignDocument: null, modularBreakdown: null, assetList: null, scopeReviewContent: null,
  };
  const markdownExport = exportMarkdown(exportPackage);
  const textExport = exportText(exportPackage);
  assert(markdownExport.includes('**Feature ID:** `squad-deployment`'));
  assert(textExport.includes('Feature ID: squad-deployment'));
  for (const content of [markdownExport, textExport]) {
    assert(content.includes('deployment-capacity-limit'));
    assert(content.includes('Acceptance criteria'));
    assert(content.includes('Failure states'));
    assert(content.includes('Telemetry'));
    assert(content.includes('Security considerations'));
    assert(content.includes('Performance targets'));
  }
  const legacyExport = exportMarkdown({ ...exportPackage, mvpFeatureSpecs: [legacyFeature] });
  assert(!legacyExport.includes('#### Acceptance criteria'));
  assert(!legacyExport.includes('#### Telemetry'));

  console.log('BDD feature validator and structural fixture assertions passed.');
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}