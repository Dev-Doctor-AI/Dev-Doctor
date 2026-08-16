export interface StructuredOutputSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface OpenAICompatibleRequestInput {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens: number;
  structuredOutput?: StructuredOutputSchema;
  tokenParameter?: 'max_tokens' | 'max_completion_tokens';
}

export const buildOpenAICompatibleRequestBody = ({ model, messages, maxTokens, structuredOutput, tokenParameter = 'max_tokens' }: OpenAICompatibleRequestInput): Record<string, unknown> => ({
  model,
  messages,
  temperature: structuredOutput ? 0.2 : 0.7,
  top_p: 0.95,
  [tokenParameter]: maxTokens,
  stream: false,
  ...(structuredOutput ? {
    response_format: {
      type: 'json_schema',
      json_schema: { name: structuredOutput.name, strict: true, schema: structuredOutput.schema },
    },
  } : {}),
});