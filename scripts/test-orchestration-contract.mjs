import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = mkdtempSync(join(tmpdir(), 'dev-doctor-orchestration-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--skipLibCheck', '--outDir', output, join(root, 'types.ts'), join(root, 'services/orchestrationContract.ts')], { stdio: 'inherit' });
  const contract = await import(pathToFileURL(join(output, 'services/orchestrationContract.js')).href);
  const critique = { summary: 'Technical risks are understood.', questions: ['Which dependency is riskiest?'], answers: ['The asset pipeline.'], completed: true, source: 'technical-analyst' };
  assert.equal(contract.validateCritiqueRecord(critique).valid, true);
  assert.equal(contract.validateCritiqueRecord({ ...critique, answers: [] }).valid, false);
  const stages = [{ stage: 'gdd', status: 'completed', generatedAt: 100, outputReferences: ['gdd-content'] }, { stage: 'pitch', status: 'completed', generatedAt: 200, outputReferences: ['pitch-content'] }];
  assert.equal(contract.validateStageSequence(stages).valid, true);
  assert.equal(contract.validateStageSequence([stages[1], stages[0]]).valid, false);
  assert.equal(contract.validateGenerationMetadata({ runId: 'run-1', startedAt: 50, stages }).valid, true);
  assert.equal(contract.validateGenerationMetadata({ runId: '', startedAt: 0, stages: [] }).valid, false);
  const packageRecord = { chatHistory: [{ sender: 'user', text: 'Project context' }], critiqueQA: { summary: critique.summary, questions: critique.questions, answers: critique.answers }, critiqueRecord: critique, generationMetadata: { runId: 'run-1', startedAt: 50, stages } };
  assert.equal(packageRecord.chatHistory[0].text, 'Project context');
  assert.equal(packageRecord.critiqueQA.answers[0], 'The asset pipeline.');
  assert.equal(packageRecord.critiqueRecord.completed, true);
  console.log('Orchestration contract assertions passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}