import { BrainstormPhase, BrainstormState, CanonicalProjectContext, ConciergeMode, CritiqueRecord, MemoryEntry, RiskCritiqueRecord, SynthesisRecord, TranscriptRecord, UserProxyRecord } from '../types';

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter(nonEmpty).map(value => value.trim()) : [];
const modes: ConciergeMode[] = ['project-name', 'information-gatherer', 'creative-brainstormer', 'completion-gate'];

export interface MemoryPersonaValidationOutcome { valid: boolean; errors: string[]; warnings: string[]; }

export interface ConciergeCompletionEvidence {
  projectIdentity: boolean;
  coreConcept: boolean;
  audienceOrUseCase: boolean;
  majorConstraints: boolean;
  unresolvedContradictions: boolean;
}

const validProjectName = (projectName: string): boolean => nonEmpty(projectName)
  && !/^(untitled(?: project)?|new project)$/i.test(projectName.trim());

const activeMemoryText = (entries: MemoryEntry[]): string => entries
  .filter(entry => entry.status !== 'rejected')
  .map(entry => entry.text)
  .join(' ');

export const assessConciergeCompletion = (
  projectName: string,
  conversationText: string,
  entries: MemoryEntry[],
): ConciergeCompletionEvidence => {
  const source = `${activeMemoryText(entries)} ${conversationText}`;
  return {
    projectIdentity: validProjectName(projectName),
    coreConcept: /\b(core concept|core loop|gameplay loop|main mechanic|central mechanic|player experience|what the player|project is|game is|app is)\b/i.test(source),
    audienceOrUseCase: /\b(audience|target users?|target audience|players?|customers?|users?|children|famil(?:y|ies)|kids|use case|platform)\b/i.test(source),
    majorConstraints: /\b(constraint|requirement|scope|budget|timeline|deadline|platform|offline|multiplayer|team size|must have|cannot|can't|technical)\b/i.test(source),
    unresolvedContradictions: entries.some(entry => entry.status === 'unresolved' && /\b(contradict|conflict|inconsistent|blocked)\b/i.test(entry.text)),
  };
};

export const canEnterConciergeCompletionGate = (evidence: ConciergeCompletionEvidence): boolean =>
  evidence.projectIdentity
  && evidence.coreConcept
  && evidence.audienceOrUseCase
  && evidence.majorConstraints
  && !evidence.unresolvedContradictions;

const userLines = (conversationText: string): string[] => conversationText
  .split('\n')
  .filter(line => /^user:/i.test(line.trim()))
  .map(line => line.replace(/^user:\s*/i, '').trim())
  .filter(Boolean);

const assistantLines = (conversationText: string): string[] => conversationText
  .split('\n')
  .filter(line => /^ai:/i.test(line.trim()))
  .map(line => line.replace(/^ai:\s*/i, '').trim())
  .filter(Boolean);

export const isAffirmativeBrainstormFeedback = (message: string): boolean =>
  /\b(yes|yeah|yep|sure|okay|ok|great|sounds good|i like (that|it)|love it|perfect|go ahead|that works|approved|agree)\b/i.test(message)
  && !/\b(no|not|don't|do not|change|instead|but)\b/i.test(message);

export const critiqueAnswersToMemoryEntries = (
  questions: string[],
  answers: string[],
  sourceReference = 'technical-critique',
): MemoryEntry[] => questions.flatMap((question, index) => {
  const answer = answers[index]?.trim();
  if (!answer) return [];
  return [{
    id: `critique-decision-${index + 1}`,
    kind: 'decision',
    text: `${question.trim()} — Creator answer: ${answer}`,
    status: 'accepted',
    sourceReferences: [sourceReference],
  }];
});

export const deriveBrainstormState = (conversationText: string): BrainstormState => {
  const users = userLines(conversationText);
  const assistants = assistantLines(conversationText);
  const brainstormRequest = users.findIndex(message => /\b(brainstorm|brainstorming|creative ideas|what could we add|imagine|explore ideas|ideas for|help me create|help us create)\b/i.test(message));
  if (brainstormRequest < 0) return { phase: 'identify-subtopics', subtopics: [], activeSubtopicIndex: 0, acceptedSubtopics: [] };

  const laterUsers = users.slice(brainstormRequest + 1);
  const confirmations = laterUsers.filter(isAffirmativeBrainstormFeedback).length;
  const proposalCount = assistants.slice(Math.max(0, brainstormRequest)).filter(message => /\?|\b(?:could|might|idea|suggest|propose)\b/i.test(message)).length;
  const subtopics = Array.from({ length: Math.max(1, confirmations + 1) }, (_, index) => `brainstorm-subtopic-${index + 1}`);
  const activeSubtopicIndex = Math.min(confirmations, subtopics.length - 1);
  let phase: BrainstormPhase = proposalCount === 0 ? 'identify-subtopics' : 'await-feedback';
  if (confirmations > 0) phase = 'advance';
  return {
    phase,
    subtopics,
    activeSubtopicIndex,
    activeSubtopic: subtopics[activeSubtopicIndex],
    acceptedSubtopics: subtopics.slice(0, confirmations),
  };
};

export const validateMemoryEntries = (value: unknown): MemoryPersonaValidationOutcome => {
  if (!Array.isArray(value)) return { valid: false, errors: ['Memory entries must be an array.'], warnings: [] };
  const errors: string[] = []; const ids = new Set<string>();
  value.forEach((entry: any, index) => {
    if (!entry || !nonEmpty(entry.id) || !nonEmpty(entry.text)) errors.push(`Memory entry ${index + 1} requires an ID and text.`);
    if (entry?.kind && !['fact', 'proposal', 'decision', 'question', 'constraint'].includes(entry.kind)) errors.push(`Memory entry ${index + 1} has an unsupported kind.`);
    if (entry?.status && !['confirmed', 'accepted', 'rejected', 'unresolved', 'active'].includes(entry.status)) errors.push(`Memory entry ${index + 1} has an unsupported status.`);
    if (entry?.id && ids.has(entry.id.toLowerCase())) errors.push(`Memory entry ${index + 1} duplicates ID "${entry.id}".`);
    if (entry?.id) ids.add(entry.id.toLowerCase());
  });
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const normalizeMemoryEntries = (value: unknown, sourceReference = 'conversation'): MemoryEntry[] => Array.isArray(value)
  ? value.flatMap((entry: any, index) => {
    if (!entry || !nonEmpty(entry.text)) return [];
    return [{
      id: nonEmpty(entry.id) ? entry.id.trim() : `memory-${index + 1}`,
      kind: ['fact', 'proposal', 'decision', 'question', 'constraint'].includes(entry.kind) ? entry.kind : 'fact',
      text: entry.text.trim(),
      status: ['confirmed', 'accepted', 'rejected', 'unresolved', 'active'].includes(entry.status) ? entry.status : 'active',
      sourceReferences: strings(entry.sourceReferences).length ? strings(entry.sourceReferences) : [sourceReference],
    } as MemoryEntry];
  })
  : [];

export const mergeMemoryEntries = (existing: MemoryEntry[], incoming: MemoryEntry[]): MemoryEntry[] => {
  const merged = new Map<string, MemoryEntry>();
  for (const entry of [...existing, ...incoming]) {
    const key = entry.id.trim().toLowerCase() || `${entry.kind}:${entry.text.trim().toLowerCase()}`;
    const previous = merged.get(key);
    merged.set(key, previous ? {
      ...previous,
      ...entry,
      sourceReferences: [...new Set([...previous.sourceReferences, ...entry.sourceReferences])],
    } : { ...entry, sourceReferences: [...entry.sourceReferences] });
  }
  return [...merged.values()];
};

export const deriveConciergeMode = (
  projectName: string,
  conversationText: string,
  entries: MemoryEntry[],
): ConciergeMode => {
  const userMessages = conversationText.split('\n').filter(line => /^user:/i.test(line.trim()));
  const latestUserMessage = userMessages.at(-1) || conversationText;
  if (/\b(brainstorm|brainstorming|creative ideas|what could we add|imagine|explore ideas|ideas for|help me create|help us create)\b/i.test(latestUserMessage)) return 'creative-brainstormer';
  if (!nonEmpty(projectName) || /^(untitled(?: project)?|new project)$/i.test(projectName.trim())) return 'project-name';
  if (canEnterConciergeCompletionGate(assessConciergeCompletion(projectName, conversationText, entries))) return 'completion-gate';
  return 'information-gatherer';
};

export const conciergeModeGuidance = (mode: ConciergeMode): string => ({
  'project-name': 'Prioritize identifying and confirming the official project name; do not move into broad design questions until the name is clear.',
  'information-gatherer': 'Gather missing facts about audience, core loop, constraints, platform, and desired experience with one focused question at a time.',
  'creative-brainstormer': 'Offer one imaginative, project-relevant expansion before asking one playful question; preserve the creator’s hook and avoid locking decisions without confirmation.',
  'completion-gate': 'Check whether project name, core loop, audience, and style are sufficiently clear; if so, ask whether the creator is ready to begin critique.',
}[mode]);

export const validateTranscriptRecord = (value: unknown): MemoryPersonaValidationOutcome => {
  const record = value as Partial<TranscriptRecord> | null;
  if (!record || !Array.isArray(record.messages)) return { valid: false, errors: ['Transcript record requires a messages array.'], warnings: [] };
  const errors: string[] = [];
  if (!record.preservedInFull) errors.push('Transcript record must declare full preservation.');
  if (!record.updatedAt || typeof record.updatedAt !== 'number') errors.push('Transcript record requires an update timestamp.');
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const validateConciergeMode = (value: unknown): MemoryPersonaValidationOutcome => modes.includes(value as ConciergeMode) ? { valid: true, errors: [], warnings: [] } : { valid: false, errors: [`Unsupported Concierge mode "${String(value)}".`], warnings: [] };

export const validateUserProxy = (value: unknown): MemoryPersonaValidationOutcome => {
  const record = value as Partial<UserProxyRecord> | null;
  const errors: string[] = [];
  if (!record || !nonEmpty(record.perspective)) errors.push('User Proxy requires a perspective.');
  if (!strings(record?.priorities).length) errors.push('User Proxy requires priorities.');
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const validateRiskCritique = (value: unknown): MemoryPersonaValidationOutcome => {
  const record = value as Partial<RiskCritiqueRecord> | null;
  if (!record || !Array.isArray(record.risks)) return { valid: false, errors: ['Risk critique requires a risks array.'], warnings: [] };
  const errors: string[] = [];
  record.risks.forEach((risk: any, index) => {
    if (!nonEmpty(risk?.id) || !nonEmpty(risk?.risk) || !nonEmpty(risk?.consequence)) errors.push(`Risk ${index + 1} requires ID, risk, and consequence.`);
    if (!['High', 'Medium', 'Low'].includes(risk?.severity)) errors.push(`Risk ${index + 1} requires valid severity.`);
  });
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const validateSynthesis = (value: unknown): MemoryPersonaValidationOutcome => {
  const record = value as Partial<SynthesisRecord> | null;
  const errors: string[] = [];
  if (!record || !nonEmpty(record.summary)) errors.push('Synthesis requires a summary.');
  if (!strings(record?.outputReferences).length) errors.push('Synthesis requires output references.');
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const createTranscriptRecord = (messages: TranscriptRecord['messages'], updatedAt = Date.now()): TranscriptRecord => ({ messages: [...messages], preservedInFull: true, updatedAt });

export const buildRoleRelevantMemoryContext = (entries: MemoryEntry[], kinds: MemoryEntry['kind'][] = ['fact', 'decision', 'constraint', 'question']): string => entries
  .filter(entry => kinds.includes(entry.kind) && entry.status !== 'rejected')
  .map(entry => `[${entry.kind}/${entry.status}] ${entry.text}`)
  .join('\n');

export const buildCanonicalProjectContext = (
  projectName: string,
  conversationText: string,
  entries: MemoryEntry[],
  critiqueRecord?: CritiqueRecord,
): CanonicalProjectContext => {
  const activeEntries = entries.filter(entry => entry.status !== 'rejected');
  const critiqueEntries = critiqueRecord?.completed
    ? critiqueAnswersToMemoryEntries(critiqueRecord.questions, critiqueRecord.answers)
    : [];
  const merged = mergeMemoryEntries(activeEntries, critiqueEntries);
  const byKind = (kind: MemoryEntry['kind']): MemoryEntry[] => merged.filter(entry => entry.kind === kind);
  const sourceReferences = [...new Set([
    'canonical-project-context',
    ...merged.flatMap(entry => entry.sourceReferences),
    ...(critiqueRecord?.completed ? ['technical-critique'] : []),
  ])];
  return {
    projectName: validProjectName(projectName) ? projectName.trim() : 'Untitled Project',
    summarySource: conversationText.trim(),
    facts: byKind('fact'),
    proposals: byKind('proposal'),
    decisions: byKind('decision'),
    constraints: byKind('constraint'),
    questions: byKind('question'),
    transcriptReference: 'full-transcript',
    sourceReferences,
  };
};

export const serializeCanonicalProjectContext = (context: CanonicalProjectContext): string => JSON.stringify(context, null, 2);

export const buildPersonaSpecialistContext = (
  conversationText: string,
  memoryEntries: MemoryEntry[],
  critiqueRecord: CritiqueRecord,
): string => JSON.stringify({
  conversation: conversationText,
  memory: memoryEntries.filter(entry => entry.status !== 'rejected'),
  completedCritique: critiqueRecord,
});