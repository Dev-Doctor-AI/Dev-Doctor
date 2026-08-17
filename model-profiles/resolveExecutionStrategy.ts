import { CAPABILITY_MATRIX } from './capability-matrix.js';
import { ModelCapabilityProfile, ModelExecutionStrategy } from './types.js';

const unknownProfile = (provider: string, model: string): ModelCapabilityProfile => ({
  provider,
  model,
  structuredOutput: 'unknown',
  jsonSchema: 'unknown',
  reasoning: 'unknown',
  strategy: {
    preferStructuredOutput: true,
    preferRawTextParsing: false,
    allowContinuation: false,
    notes: ['No observed capability profile exists; use provider defaults and validate locally.'],
  },
  evidence: [],
});

export const resolveModelCapabilityProfile = (provider: string, model: string): ModelCapabilityProfile => {
  const matrixEntry = CAPABILITY_MATRIX.find(entry => entry.provider === provider && entry.model === model);
  if (!matrixEntry) return unknownProfile(provider, model);
  return {
    provider,
    model,
    ...(matrixEntry.contextWindow === null ? {} : { contextWindow: matrixEntry.contextWindow }),
    ...(matrixEntry.maxOutputTokens === null ? {} : { maxOutputTokens: matrixEntry.maxOutputTokens }),
    ...(matrixEntry.recommendedOutputTokens === null ? {} : { recommendedOutputTokens: matrixEntry.recommendedOutputTokens }),
    structuredOutput: matrixEntry.structuredOutput,
    jsonSchema: matrixEntry.jsonSchema,
    reasoning: matrixEntry.reasoning,
    strategy: {
      preferStructuredOutput: matrixEntry.structuredOutput !== 'unsupported',
      preferRawTextParsing: matrixEntry.structuredOutput === 'unreliable',
      allowContinuation: matrixEntry.continuation === 'reliable',
      notes: ['Capability values remain evidence-driven.', ...matrixEntry.evidence],
    },
    evidence: matrixEntry.evidence,
  };
};

export const resolveExecutionStrategy = (provider: string, model: string): ModelExecutionStrategy =>
  resolveModelCapabilityProfile(provider, model).strategy;