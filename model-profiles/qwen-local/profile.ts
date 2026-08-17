import { ModelCapabilityProfile } from '../types.js';

export const qwenLocalProfile: ModelCapabilityProfile = {
  provider: 'lmstudio',
  model: 'qwen/qwen3.5-9b',
  structuredOutput: 'unknown',
  jsonSchema: 'unknown',
  reasoning: 'unknown',
  strategy: {
    preferStructuredOutput: true,
    preferRawTextParsing: false,
    allowContinuation: false,
    notes: ['Preserve reasoning metadata.', 'Use task-specific reasoning/output settings; visible content may be absent when reasoning consumes the budget.', 'Do not generalize the small JSON success to large schemas.'],
  },
  evidence: ['model-behaviour/qwen-qwen3-5-9b-2026-08-17T06-33-35-208Z.md'],
};