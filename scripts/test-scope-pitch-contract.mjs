import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-scope-pitch-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck', '--outDir', output, join(root, 'types.ts'), join(root, 'services/scopePitchContract.ts')], { stdio: 'inherit' });
  const contract = await import(pathToFileURL(join(output, 'services/scopePitchContract.js')).href);
  const critique = { feature: 'Core loop', critique: 'Scope exceeds the team capacity.', suggestion: 'Cut secondary modes to preserve the 48-hour playable loop.', reasoning: 'A minimum-fun prototype must be playable immediately.', severity: 'High' };
  assert.equal(contract.validateScopeReview([critique], 'gamejam').valid, true);
  assert.equal(contract.validateScopeReview([critique], 'indie').valid, true);
  assert.equal(contract.validateScopeReview([{ ...critique, lens: 'studio' }], 'indie').valid, false);
  const claim = { text: 'The project supports offline play.', sourceReferences: ['gdd-offline'], grounded: true };
  assert.equal(contract.validatePitchClaims([claim], ['gdd-offline']).valid, true);
  assert.equal(contract.validatePitchClaims([{ ...claim, grounded: false }], ['gdd-offline']).valid, false);
  const sanitizedClaims = contract.omitInvalidPitchClaims([{
    title: 'Title', content: 'Project overview', claims: [
      claim,
      { text: 'Explicitly unsupported', sourceReferences: ['gdd-offline'], grounded: false },
      { text: 'Unknown source', sourceReferences: ['unknown'], grounded: true },
    ],
  }], ['gdd-offline']);
  assert.deepEqual(sanitizedClaims[0].claims, [claim]);
  const allInvalidClaims = contract.omitInvalidPitchClaims([{ title: 'Title', content: 'Project overview', claims: [{ ...claim, grounded: false }] }], ['gdd-offline']);
  assert.equal(allInvalidClaims[0].claims, undefined);
  assert.equal(contract.validatePitchSlides(allInvalidClaims, ['Title'], ['gdd-offline'], true).valid, false, 'sanitizing must not bypass the grounded-claim requirement');
  const slides = [{ title: 'Title', content: 'Project overview', claims: [claim] }, { title: 'Loop', content: 'Core loop' }];
  assert.equal(contract.validatePitchSlides(slides, ['Title', 'Loop'], ['gdd-offline']).valid, true);
  assert.equal(contract.validatePitchSlides([slides[0]], ['Title', 'Loop']).valid, false);
  const rejectedRealShape = [
    { title: 'Title', content: 'Project overview', claims: [{ text: 'Unsupported claim', sourceReferences: [], grounded: false }] },
    { title: 'Unexpected title', content: 'Wrong slide title' },
  ];
  const rejected = contract.validatePitchSlides(rejectedRealShape, ['Title', 'Loop'], [], false);
  assert.equal(rejected.valid, false);
  assert.ok(rejected.errors.some(error => error.includes('must be marked grounded')));
  assert.ok(rejected.errors.some(error => error.includes('Missing pitch slide "Loop"')));
  const repairedWholeDeck = [
    { title: 'Title', content: 'Grounded overview', claims: [claim] },
    { title: 'Loop', content: 'Grounded core loop', claims: [claim] },
  ];
  assert.equal(contract.validatePitchSlides(repairedWholeDeck, ['Title', 'Loop'], ['gdd-offline'], true).valid, true);
  const missingContact = contract.validatePitchSlides(repairedWholeDeck, ['Title', 'Loop', 'Contact Information'], ['gdd-offline'], true);
  assert.equal(missingContact.valid, false);
  assert.ok(missingContact.errors.some(error => error.includes('Missing pitch slide "Contact Information"')));
  const normalizedSlide = contract.normalizePitchSlide({ title: ' Title ', content: ' Content ', claims: [claim] });
  assert.equal(normalizedSlide.title, 'Title');
  assert.equal(normalizedSlide.claims[0].grounded, true);
  console.log('Scope and pitch contract assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}