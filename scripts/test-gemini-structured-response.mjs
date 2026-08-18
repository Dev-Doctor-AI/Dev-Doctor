import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-gemini-response-'));

try {
  const contract = join(root, 'services/geminiResponseContract.ts');
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck',
    '--outDir', output, contract,
  ], { stdio: 'inherit' });
  const provider = await import(pathToFileURL(join(output, 'geminiResponseContract.js')).href);
  const technicalSpec = '{"featureId":"duck-movement","dataModels":[]}';

  assert.equal(provider.extractGeminiResponseText([
    { text: 'I will provide the requested object.' },
    { text: technicalSpec, thought: true },
  ], true), technicalSpec);
  assert.equal(provider.extractGeminiResponseText([
    { text: technicalSpec, thought: true },
    { text: 'Done.' },
  ], true), technicalSpec);
  assert.equal(provider.extractGeminiResponseText([
    { text: 'visible answer' },
    { text: 'thought answer', thought: true },
  ]), 'visible answer');
  console.log('Gemini structured response assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}