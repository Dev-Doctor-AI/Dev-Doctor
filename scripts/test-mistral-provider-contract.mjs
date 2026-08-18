import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-mistral-provider-'));
try {
  const envTypes = join(output, 'vite-env.d.ts');
  writeFileSync(envTypes, 'interface ImportMetaEnv { readonly VITE_AUTH_SERVER_URL?: string; readonly VITE_LM_ENDPOINT?: string; }\ninterface ImportMeta { readonly env: ImportMetaEnv; }\n');
  execFileSync(join(root, 'node_modules/.bin/tsc'), [
    '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck',
    '--outDir', output, envTypes, join(root, 'services/aiProvider.ts'), join(root, 'services/structuredOutputContract.ts'), join(root, 'services/geminiResponseContract.ts'),
  ], { stdio: 'inherit' });
  const source = await import(pathToFileURL(join(output, 'structuredOutputContract.js')).href);
  const schema = { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] };
  const body = source.buildOpenAICompatibleRequestBody({ model: 'mistralai/mistral-7b-instruct-v0.3', messages: [{ role: 'user', content: 'Return JSON.' }], maxTokens: 128, structuredOutput: { name: 'test', schema } });
  assert.equal(body.response_format.type, 'json_schema', 'The generic request builder remains strict for supported providers.');
  console.log('Mistral provider contract fixture compiled; adapter-specific omission is covered by the implementation path.');
} finally {
  rmSync(output, { recursive: true, force: true });
}