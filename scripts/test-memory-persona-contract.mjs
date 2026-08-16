import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url)); const output = mkdtempSync(join(tmpdir(), 'dev-doctor-memory-persona-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['--target','ES2022','--module','ESNext','--moduleResolution','bundler','--skipLibCheck','--outDir',output,join(root,'types.ts'),join(root,'services/memoryPersonaContract.ts')], { stdio: 'inherit' });
  const contract = await import(pathToFileURL(join(output, 'services/memoryPersonaContract.js')).href);
  assert.equal(contract.validateMemoryEntries([{ id: 'fact-1', kind: 'fact', text: 'Offline-first', status: 'confirmed', sourceReferences: ['chat-1'] }]).valid, true);
  assert.equal(contract.validateMemoryEntries([{ id: 'x', text: 'a' }, { id: 'x', text: 'b' }]).valid, false);
  assert.equal(contract.validateTranscriptRecord({ messages: [{ sender: 'user', text: 'hello' }], preservedInFull: true, updatedAt: 1 }).valid, true);
  const transcript = contract.createTranscriptRecord([{ sender: 'user', text: 'full history' }], 2);
  assert.equal(transcript.preservedInFull, true);
  assert.equal(transcript.messages[0].text, 'full history');
  assert(contract.buildRoleRelevantMemoryContext([{ id: 'c', kind: 'constraint', text: 'Offline', status: 'active', sourceReferences: [] }]).includes('Offline'));
  const specialistContext = contract.buildPersonaSpecialistContext('user: Space Miner', [{ id: 'f', kind: 'fact', text: 'Offline-first', status: 'confirmed', sourceReferences: ['chat-1'] }], { summary: 'Risks reviewed.', questions: ['What is the platform?'], answers: ['Desktop and mobile.'], completed: true, source: 'technical-analyst' });
  assert(specialistContext.includes('completedCritique'));
  assert(specialistContext.includes('Desktop and mobile.'));
  assert(contract.conciergeModeGuidance('creative-brainstormer').includes('imaginative'));
  const normalized = contract.normalizeMemoryEntries([{ text: 'No accounts', kind: 'constraint' }], 'chat-2');
  assert.equal(normalized[0].sourceReferences[0], 'chat-2');
  const merged = contract.mergeMemoryEntries(
    [{ id: 'fact-1', kind: 'fact', text: 'Offline-first', status: 'confirmed', sourceReferences: ['chat-1'] }],
    [{ id: 'fact-1', kind: 'fact', text: 'Offline-first', status: 'confirmed', sourceReferences: ['chat-2'] }, { id: 'fact-2', kind: 'decision', text: 'Touch controls', status: 'accepted', sourceReferences: ['chat-3'] }],
  );
  assert.equal(merged.length, 2);
  assert.deepEqual(merged.find(entry => entry.id === 'fact-1').sourceReferences, ['chat-1', 'chat-2']);
  assert.equal(contract.deriveConciergeMode('Untitled Project', '', []), 'project-name');
  assert.equal(contract.deriveConciergeMode('Untitled Project', 'user: Help me brainstorm creative ideas for a cozy game.', []), 'creative-brainstormer');
  assert.equal(contract.deriveConciergeMode('Garden', 'Let us brainstorm creative ideas.', []), 'creative-brainstormer');
  assert.equal(contract.deriveConciergeMode('Garden', 'user: It is a garden builder.\nai: Great.\nuser: The audience is casual families.', []), 'creative-brainstormer');
  assert.equal(contract.deriveConciergeMode('Garden', 'user: It is a garden builder.\nai: Great.\nuser: It is for casual families.\nai: Noted.\nuser: It will run on tablets.', []), 'completion-gate');
  assert.equal(contract.deriveConciergeMode('Garden', 'The core loop and platform are clear.', [
    { id: '1', kind: 'fact', text: 'Loop', status: 'confirmed', sourceReferences: [] },
    { id: '2', kind: 'fact', text: 'Platform', status: 'confirmed', sourceReferences: [] },
    { id: '3', kind: 'constraint', text: 'Offline', status: 'active', sourceReferences: [] },
  ]), 'completion-gate');
  assert.equal(contract.validateConciergeMode('creative-brainstormer').valid, true);
  assert.equal(contract.validateUserProxy({ perspective: 'A casual player', priorities: ['Fast onboarding'], concerns: [], sourceReferences: [] }).valid, true);
  assert.equal(contract.validateRiskCritique({ risks: [{ id: 'risk-1', risk: 'Scope', consequence: 'Delay', severity: 'High', questions: [], sourceReferences: [] }] }).valid, true);
  assert.equal(contract.validateSynthesis({ summary: 'Ready to build.', acceptedDecisions: [], unresolvedQuestions: [], outputReferences: ['gdd'] }).valid, true);
  assert.equal(contract.validateUserProxy({ perspective: '', priorities: [] }).valid, false);
  assert.equal(contract.validateRiskCritique({ risks: [{ id: 'risk-1', risk: 'Scope', consequence: 'Delay', severity: 'Critical' }] }).valid, false);
  assert.equal(contract.validateSynthesis({ summary: 'Missing refs', outputReferences: [] }).valid, false);
  console.log('Memory and persona contract assertions passed.');
} finally { rmSync(output, { recursive: true, force: true }); }