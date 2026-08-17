import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url)); const output = mkdtempSync(join(tmpdir(), 'dev-doctor-memory-persona-'));
try {
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['--target','ES2022','--module','ESNext','--moduleResolution','bundler','--skipLibCheck','--outDir',output,join(root,'types.ts'),join(root,'services/memoryPersonaContract.ts'),join(root,'services/personaPrompts.ts')], { stdio: 'inherit' });
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
  assert.equal(contract.isAffirmativeBrainstormFeedback('I like that idea!'), true);
  assert.equal(contract.isAffirmativeBrainstormFeedback('No, try something more playful instead.'), false);
  const critiqueMemory = contract.critiqueAnswersToMemoryEntries(['Which platform is required?', 'What is the core loop?'], ['Tablet first.', 'Plant, grow, harvest.']);
  assert.equal(critiqueMemory.length, 2);
  assert.equal(critiqueMemory[0].kind, 'decision');
  assert.equal(critiqueMemory[0].status, 'accepted');
  assert(critiqueMemory[0].text.includes('Tablet first.'));
  assert.equal(contract.critiqueAnswersToMemoryEntries(['Question one', 'Question two'], ['Only one answer']).length, 1);
  const canonical = contract.buildCanonicalProjectContext('Garden', 'user: Garden is an offline family game.', [
    { id: 'fact-1', kind: 'fact', text: 'Family gardening loop.', status: 'confirmed', sourceReferences: ['chat-1'] },
    { id: 'decision-1', kind: 'decision', text: 'Rejected cloud saves.', status: 'rejected', sourceReferences: ['chat-2'] },
    { id: 'constraint-1', kind: 'constraint', text: 'Offline first.', status: 'active', sourceReferences: ['chat-3'] },
    { id: 'question-1', kind: 'question', text: 'Which tablet targets?', status: 'unresolved', sourceReferences: ['critique'] },
  ], { summary: 'Reviewed.', questions: ['Which platform?'], answers: ['Tablet first.'], completed: true, source: 'technical-analyst' });
  assert.equal(canonical.projectName, 'Garden');
  assert.equal(canonical.facts.length, 1);
  assert.equal(canonical.decisions.length, 1);
  assert.equal(canonical.constraints.length, 1);
  assert.equal(canonical.decisions[0].text.includes('Tablet first.'), true);
  assert.equal(canonical.decisions.some(entry => entry.text.includes('Rejected cloud saves.')), false);
  assert(contract.serializeCanonicalProjectContext(canonical).includes('full-transcript'));
  const promptSource = await import(pathToFileURL(join(output, 'services/personaPrompts.js')).href);
  assert(promptSource.buildGddTocPrompt('Canonical Garden context').includes('Canonical Garden context'));
  assert(promptSource.buildMvpPrompt('GDD Garden sections').includes('GDD Garden sections'));
  assert(promptSource.buildBddPrompt('Harvest feature', 'Garden', 'Offline constraint and GDD section').includes('Offline constraint and GDD section'));
  const initialBrainstorm = contract.deriveBrainstormState('user: Help me brainstorm a blood, ichor, and currency system.');
  assert.equal(initialBrainstorm.phase, 'identify-subtopics');
  const awaitingFeedback = contract.deriveBrainstormState('user: Help me brainstorm a blood, ichor, and currency system.\nai: Let us start with acquiring Blood. How does that sound?');
  assert.equal(awaitingFeedback.phase, 'await-feedback');
  const acceptedBrainstorm = contract.deriveBrainstormState('user: Help me brainstorm a blood, ichor, and currency system.\nai: Let us start with acquiring Blood. How does that sound?\nuser: I like that idea!');
  assert.equal(acceptedBrainstorm.phase, 'advance');
  assert.equal(acceptedBrainstorm.acceptedSubtopics.length, 1);
  assert.equal(contract.deriveConciergeMode('Garden', 'user: It is a garden builder.\nai: Great.\nuser: The audience is casual families.', []), 'information-gatherer');
  assert.equal(contract.deriveConciergeMode('Garden', 'user: It is a garden builder.\nai: Great.\nuser: It is for casual families.\nai: Noted.\nuser: It will run on tablets.', [
    { id: '1', kind: 'fact', text: 'The core gameplay loop is planting, growing, and harvesting.', status: 'confirmed', sourceReferences: [] },
    { id: '2', kind: 'fact', text: 'The audience is casual families using tablets.', status: 'confirmed', sourceReferences: [] },
    { id: '3', kind: 'constraint', text: 'The project must run offline on tablets.', status: 'active', sourceReferences: [] },
  ]), 'completion-gate');
  assert.equal(contract.deriveConciergeMode('Garden', 'user: It is a garden builder.\nai: Great.\nuser: It is for casual families.\nai: Noted.\nuser: It will run on tablets.', []), 'information-gatherer');
  assert.equal(contract.canEnterConciergeCompletionGate(contract.assessConciergeCompletion('Garden', 'The core concept is a planting and harvesting loop for families on tablets with an offline requirement.', [])), true);
  assert.equal(contract.canEnterConciergeCompletionGate(contract.assessConciergeCompletion('Garden', 'The core concept is clear.', [])), false);
  assert.equal(contract.validateConciergeMode('creative-brainstormer').valid, true);
  assert.equal(contract.validateUserProxy({ perspective: 'A casual player', priorities: ['Fast onboarding'], concerns: [], sourceReferences: [] }).valid, true);
  assert.equal(contract.validateRiskCritique({ risks: [{ id: 'risk-1', risk: 'Scope', consequence: 'Delay', severity: 'High', questions: [], sourceReferences: [] }] }).valid, true);
  assert.equal(contract.validateSynthesis({ summary: 'Ready to build.', acceptedDecisions: [], unresolvedQuestions: [], outputReferences: ['gdd'] }).valid, true);
  assert.equal(contract.validateUserProxy({ perspective: '', priorities: [] }).valid, false);
  assert.equal(contract.validateRiskCritique({ risks: [{ id: 'risk-1', risk: 'Scope', consequence: 'Delay', severity: 'Critical' }] }).valid, false);
  assert.equal(contract.validateSynthesis({ summary: 'Missing refs', outputReferences: [] }).valid, false);
  console.log('Memory and persona contract assertions passed.');
} finally { rmSync(output, { recursive: true, force: true }); }