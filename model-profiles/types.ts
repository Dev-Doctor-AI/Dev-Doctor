export type GenerationStatus = 'complete' | 'truncated' | 'empty' | 'reasoning_exhausted' | 'error';

export interface ModelExecutionStrategy {
  preferStructuredOutput: boolean;
  preferRawTextParsing: boolean;
  allowContinuation: boolean;
  notes: string[];
}

export interface ModelCapabilityProfile {
  provider: string;
  model: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  recommendedOutputTokens?: number;
  structuredOutput: 'unknown' | 'unsupported' | 'unreliable' | 'reliable';
  jsonSchema: 'unknown' | 'unsupported' | 'unreliable' | 'reliable';
  reasoning: 'unknown' | 'unsupported' | 'unreliable' | 'reliable';
  strategy: ModelExecutionStrategy;
  evidence: string[];
}