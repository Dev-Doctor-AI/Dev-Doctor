export type CapabilityRating = 'unknown' | 'unsupported' | 'unreliable' | 'reliable';

export interface CapabilityMatrixEntry {
  model: string;
  provider: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  recommendedOutputTokens: number | null;
  reasoning: CapabilityRating;
  structuredOutput: CapabilityRating;
  jsonSchema: CapabilityRating;
  toolCalling: CapabilityRating;
  vision: CapabilityRating;
  longDocumentReliability: CapabilityRating;
  continuation: CapabilityRating;
  rawTextParsing: CapabilityRating;
  evidence: string[];
}

/** Unknown values are deliberate until controlled runtime tests establish them. */
export const CAPABILITY_MATRIX: CapabilityMatrixEntry[] = [
  {
    model: 'qwen/qwen3.5-9b',
    provider: 'lmstudio',
    contextWindow: null,
    maxOutputTokens: null,
    recommendedOutputTokens: null,
    reasoning: 'unknown',
    structuredOutput: 'unknown',
    jsonSchema: 'unknown',
    toolCalling: 'unknown',
    vision: 'unknown',
    longDocumentReliability: 'unknown',
    continuation: 'unknown',
    rawTextParsing: 'unknown',
    evidence: ['model-behaviour/qwen-qwen3-5-9b-2026-08-17T06-33-35-208Z.md: reasoning_content and visible-output observations; this is not a universal capability rating.'],
  },
  {
    model: 'mistralai/mistral-7b-instruct-v0.3',
    provider: 'lmstudio',
    contextWindow: null,
    maxOutputTokens: null,
    recommendedOutputTokens: 512,
    reasoning: 'unsupported',
    structuredOutput: 'unknown',
    jsonSchema: 'unknown',
    toolCalling: 'unknown',
    vision: 'unknown',
    longDocumentReliability: 'unknown',
    continuation: 'unknown',
    rawTextParsing: 'unknown',
    evidence: [],
  },
  {
    model: 'nvidia/nemotron-3-nano-4b',
    provider: 'lmstudio',
    contextWindow: null,
    maxOutputTokens: null,
    recommendedOutputTokens: null,
    reasoning: 'unknown',
    structuredOutput: 'unknown',
    jsonSchema: 'unknown',
    toolCalling: 'unknown',
    vision: 'unknown',
    longDocumentReliability: 'unknown',
    continuation: 'unknown',
    rawTextParsing: 'unknown',
    evidence: ['LM Studio returned HTTP 400/compute errors during the 2026-08-17 probe; no capability result was obtained.'],
  },
  {
    model: 'qwen/qwen3.8-27b',
    provider: 'lmstudio',
    contextWindow: 50_000,
    maxOutputTokens: null,
    recommendedOutputTokens: 2048,
    reasoning: 'unknown',
    structuredOutput: 'unknown',
    jsonSchema: 'unsupported',
    toolCalling: 'unknown',
    vision: 'unknown',
    longDocumentReliability: 'unknown',
    continuation: 'unknown',
    rawTextParsing: 'unknown',
    evidence: [
      'LM Studio direct probe succeeded with qwen/qwen3.8-27b using temperature 0 and max_tokens 64 after loading the model with an approximately 50k context.',
      'LM Studio returned HTTP 400 when the application sent transport-level OpenAI json_schema response_format; prompt-level JSON and local validation remain the required path.',
    ],
  },
];