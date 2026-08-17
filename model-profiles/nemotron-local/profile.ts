import { ModelCapabilityProfile } from '../types.js';

export const nemotronLocalProfile: ModelCapabilityProfile = {
  provider: 'lmstudio',
  model: 'nvidia/nemotron-3-nano-4b',
  structuredOutput: 'unknown',
  jsonSchema: 'unknown',
  reasoning: 'unknown',
  strategy: {
    preferStructuredOutput: true,
    preferRawTextParsing: false,
    allowContinuation: false,
    notes: ['Capability testing is blocked by the current LM Studio HTTP 400/compute error.'],
  },
  evidence: ['model-behaviour/nvidia-nemotron-3-nano-4b-2026-08-17T06-30-18-301Z.md'],
};