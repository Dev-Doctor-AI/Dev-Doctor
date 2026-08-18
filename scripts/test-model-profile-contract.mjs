import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-model-profile-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck', '--outDir', output,
    join(root, 'model-profiles/types.ts'), join(root, 'model-profiles/capability-matrix.ts'), join(root, 'model-profiles/resolveExecutionStrategy.ts'),
  ], { stdio: 'inherit' });
  const resolverPath = existsSync(join(output, 'model-profiles/resolveExecutionStrategy.js'))
    ? join(output, 'model-profiles/resolveExecutionStrategy.js')
    : join(output, 'resolveExecutionStrategy.js');
  const resolver = await import(pathToFileURL(resolverPath).href);
  const known = resolver.resolveModelCapabilityProfile('lmstudio', 'mistralai/mistral-7b-instruct-v0.3');
  assert.equal(known.structuredOutput, 'unknown');
  assert.equal(known.reasoning, 'unsupported');
  assert.equal(known.recommendedOutputTokens, 512);
  assert.equal(known.contextWindow, undefined);
  const unknown = resolver.resolveModelCapabilityProfile('lmstudio', 'future-model');
  assert.equal(unknown.model, 'future-model');
  assert.equal(unknown.strategy.preferStructuredOutput, true);
  console.log('Model profile contract assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}