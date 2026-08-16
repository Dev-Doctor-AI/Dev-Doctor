import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-structured-output-'));

try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck',
    '--outDir', output, join(root, 'services/structuredOutputContract.ts'),
  ], { stdio: 'inherit' });
  const { buildOpenAICompatibleRequestBody } = await import(pathToFileURL(join(output, 'structuredOutputContract.js')).href);
  const messages = [{ role: 'user', content: 'Return one object.' }];
  const plain = buildOpenAICompatibleRequestBody({ model: 'local-model', messages, maxTokens: 100 });
  assert.equal(plain.temperature, 0.7);
  assert.equal('response_format' in plain, false);
  assert.equal(plain.max_tokens, 100);
  assert.equal('max_completion_tokens' in plain, false);
  const newerChatCompletion = buildOpenAICompatibleRequestBody({ model: 'gpt-model', messages, maxTokens: 120, tokenParameter: 'max_completion_tokens' });
  assert.equal(newerChatCompletion.max_completion_tokens, 120);
  assert.equal('max_tokens' in newerChatCompletion, false);

  const schema = { type: 'object', additionalProperties: false, properties: { value: { type: 'string' } }, required: ['value'] };
  const structured = buildOpenAICompatibleRequestBody({ model: 'local-model', messages, maxTokens: 100, structuredOutput: { name: 'test_object', schema } });
  assert.equal(structured.temperature, 0.2);
  assert.deepEqual(structured.response_format, { type: 'json_schema', json_schema: { name: 'test_object', strict: true, schema } });
  assert.deepEqual(structured.messages, messages);
  console.log('Structured output request contract assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}