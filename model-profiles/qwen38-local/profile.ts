import { ModelCapabilityProfile } from '../types.js';

export const qwen38LocalProfile: ModelCapabilityProfile = {
  provider: 'lmstudio',
  model: 'qwen/qwen3.8-27b',
  contextWindow: 50_000,
  structuredOutput: 'unknown',
  jsonSchema: 'unsupported',
  reasoning: 'unknown',
  maxOutputTokens: 2048,
  recommendedOutputTokens: 2048,
  strategy: {
    preferStructuredOutput: true,
    preferRawTextParsing: false,
    allowContinuation: false,
    notes: [
      'Load qwen/qwen3.8-27b in LM Studio with an approximately 50k context to fit the local runtime memory budget.',
      'Do not send transport-level JSON Schema; rely on prompt-level JSON, repair, normalization, and strict validation.',
      'Use bounded task-specific output budgets rather than a global context assumption.',
    ],
  },
  evidence: [
    'Direct LM Studio probe succeeded with temperature 0 and max_tokens 64.',
    'Application request with transport-level json_schema was rejected by LM Studio with HTTP 400.',
  ],
};