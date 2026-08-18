import { ModelCapabilityProfile } from '../types.js';

export const mistralLocalProfile: ModelCapabilityProfile = {
  provider: 'lmstudio',
  model: 'mistralai/mistral-7b-instruct-v0.3',
  structuredOutput: 'unknown',
  jsonSchema: 'unknown',
  reasoning: 'unsupported',
  recommendedOutputTokens: 512,
  strategy: {
    preferStructuredOutput: true,
    preferRawTextParsing: false,
    allowContinuation: false,
    notes: ['Use concise non-reasoning responses; no reasoning budget or hidden-thinking controls are requested.'],
  },
  evidence: [],
};