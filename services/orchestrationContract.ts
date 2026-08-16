import { CritiqueRecord, GenerationMetadata, StageOutputEnvelope } from '../types';

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter(nonEmpty).map(value => value.trim()) : [];

export interface OrchestrationValidationOutcome {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const normalizeCritiqueRecord = (value: unknown): CritiqueRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  const questions = strings(source.questions);
  const answers = strings(source.answers);
  return {
    summary: nonEmpty(source.summary) ? source.summary.trim() : '',
    questions,
    answers,
    completed: source.completed === true,
    source: source.source === 'legacy-session' ? 'legacy-session' : 'technical-analyst',
  };
};

export const validateCritiqueRecord = (value: unknown): OrchestrationValidationOutcome => {
  const record = normalizeCritiqueRecord(value);
  if (!record) return { valid: false, errors: ['Critique record must be an object.'], warnings: [] };
  const errors: string[] = [];
  if (!record.summary) errors.push('Critique record requires a summary.');
  if (!record.questions.length) errors.push('Critique record requires questions.');
  if (record.answers.length > record.questions.length) errors.push('Critique record cannot contain more answers than questions.');
  if (record.completed && (record.answers.length !== record.questions.length || record.answers.some(answer => !answer))) errors.push('Completed critique must answer every question.');
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const normalizeStageOutput = (value: unknown): StageOutputEnvelope | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  const statuses = ['completed', 'failed', 'skipped'];
  return {
    stage: nonEmpty(source.stage) ? source.stage.trim() as StageOutputEnvelope['stage'] : 'conversation',
    status: statuses.includes(source.status) ? source.status : 'failed',
    generatedAt: typeof source.generatedAt === 'number' ? source.generatedAt : 0,
    outputReferences: strings(source.outputReferences),
    errors: strings(source.errors),
  };
};

export const validateGenerationMetadata = (value: unknown): OrchestrationValidationOutcome => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, errors: ['Generation metadata must be an object.'], warnings: [] };
  const metadata = value as Partial<GenerationMetadata>;
  const errors: string[] = [];
  if (!nonEmpty(metadata.runId)) errors.push('Generation metadata requires a run ID.');
  if (typeof metadata.startedAt !== 'number' || metadata.startedAt <= 0) errors.push('Generation metadata requires a start timestamp.');
  if (!Array.isArray(metadata.stages) || metadata.stages.length === 0) errors.push('Generation metadata requires stage records.');
  metadata.stages?.forEach((stage, index) => {
    const normalized = normalizeStageOutput(stage);
    if (!normalized || !normalized.generatedAt) errors.push(`Stage ${index + 1} requires a valid timestamp and shape.`);
    if (normalized?.status === 'completed' && normalized.outputReferences.length === 0) errors.push(`Completed stage ${index + 1} requires output references.`);
  });
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const validateStageSequence = (stages: unknown): OrchestrationValidationOutcome => {
  if (!Array.isArray(stages)) return { valid: false, errors: ['Stages must be an array.'], warnings: [] };
  const errors: string[] = [];
  let lastTimestamp = 0;
  stages.forEach((stage, index) => {
    const normalized = normalizeStageOutput(stage);
    if (!normalized) { errors.push(`Stage ${index + 1} is invalid.`); return; }
    if (normalized.generatedAt < lastTimestamp) errors.push(`Stage ${index + 1} timestamp precedes the previous stage.`);
    lastTimestamp = normalized.generatedAt;
  });
  return { valid: errors.length === 0, errors, warnings: [] };
};