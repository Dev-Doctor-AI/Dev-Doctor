import { ModelCapabilityProfile } from '../types.js';

export const mistralLocalProfile: ModelCapabilityProfile = {
  provider: 'lmstudio',
  model: 'mistralai/mistral-7b-instruct-v0.3',
  structuredOutput: 'unknown',
  jsonSchema: 'unknown',
  reasoning: 'unknown',
  strategy: {
    preferStructuredOutput: true,
    preferRawTextParsing: false,
    allowContinuation: false,
    notes: ['Use local validation until controlled tests establish safer model-specific strategies.'],
  },
  evidence: [],
};