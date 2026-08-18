import { classifyServiceError, createRequestId, createServiceError, logger } from './logger';
import { buildOpenAICompatibleRequestBody, StructuredOutputSchema } from './structuredOutputContract';
import { extractGeminiResponseText } from './geminiResponseContract';
export type { StructuredOutputSchema } from './structuredOutputContract';

export type AIProviderId = 'lmstudio' | 'openai' | 'openai-compatible' | 'gemini' | 'anthropic';

export interface AIProviderConfig {
  provider: AIProviderId;
  model: string;
  endpoint: string;
  apiKey: string;
  // When true, the runtime will use a browser-based SDK/login flow (e.g., ChatGPT SDK) instead of a raw API key.
  useSdkLogin?: boolean;
}

export const LOCAL_AUTH_BRIDGE = import.meta.env.VITE_AUTH_SERVER_URL || 'http://127.0.0.1:1236';

export interface AIProviderOption {
  id: AIProviderId;
  label: string;
  endpoint: string;
  models: string[];
  requiresApiKey: boolean;
  description: string;
}

export type ProviderMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ProviderGenerationStatus = 'complete' | 'truncated' | 'empty' | 'reasoning_exhausted' | 'error';
export interface ProviderResponse {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  status: ProviderGenerationStatus;
  finishReason?: string;
  reasoningCharacters?: number;
}

type RateLimitError = Error & { code: 'AI_RATE_LIMITED'; status: 429; retryAfterMs?: number };

const RATE_LIMITED_OPENAI_MODELS = new Set(['gpt-5.6-luna', 'gpt-5.6-terra']);
const OPENAI_MODEL_TPM_LIMIT = 200_000;
// Reserve below the organisation-wide limit because the browser cannot observe
// requests made by other applications, tabs, or team members.
const OPENAI_MODEL_SAFE_TPM_BUDGET = 150_000;
const RATE_WINDOW_MS = 60_000;
const CLOUD_REQUEST_TIMEOUT_MS = 90_000;
const LOCAL_REQUEST_TIMEOUT_MS = 360_000;
const LOCAL_TRANSIENT_RETRIES = 2;
const openAIModelReservations: Array<{ timestamp: number; tokens: number }> = [];
let openAIModelQueue: Promise<void> = Promise.resolve();

const sleep = (milliseconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, milliseconds));
const estimateTokens = (messages: ProviderMessage[], maxTokens: number): number =>
  Math.max(1, Math.ceil(messages.reduce((total, message) => total + message.content.length, 0) / 4)) + maxTokens;

const parseRetryAfterMs = (response: Response, detail: string): number | undefined => {
  const header = response.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
    const dateMs = Date.parse(header) - Date.now();
    if (Number.isFinite(dateMs) && dateMs > 0) return dateMs;
  }
  const secondsMatch = detail.match(/try again in\s+([\d.]+)s/i);
  return secondsMatch ? Math.ceil(Number(secondsMatch[1]) * 1000) : undefined;
};

const scheduleRateLimitedOpenAIModelRequest = async <T>(messages: ProviderMessage[], maxTokens: number, operation: () => Promise<T>): Promise<T> => {
  const estimatedTokens = estimateTokens(messages, maxTokens);
  // A single request over the local safety budget must still be allowed; it is
  // sent alone and the provider remains the final authority on organisation use.
  const reservationTokens = Math.min(estimatedTokens, OPENAI_MODEL_SAFE_TPM_BUDGET);
  let releaseQueue!: () => void;
  const queued = new Promise<void>(resolve => { releaseQueue = resolve; });
  const previous = openAIModelQueue;
  openAIModelQueue = previous.then(() => queued);
  await previous;

  try {
    while (true) {
      const now = Date.now();
      while (openAIModelReservations.length && openAIModelReservations[0].timestamp <= now - RATE_WINDOW_MS) openAIModelReservations.shift();
      const reserved = openAIModelReservations.reduce((total, item) => total + item.tokens, 0);
      if (reserved + reservationTokens <= OPENAI_MODEL_SAFE_TPM_BUDGET) {
        openAIModelReservations.push({ timestamp: now, tokens: reservationTokens });
        return await operation();
      }
      const oldest = openAIModelReservations[0];
      await sleep(Math.max(50, oldest.timestamp + RATE_WINDOW_MS - now + 25));
    }
  } finally {
    releaseQueue();
  }
};

const DEFAULT_LM_ENDPOINT = import.meta.env.VITE_LM_ENDPOINT || 'http://127.0.0.1:1235/v1/chat/completions';
// LM Studio may reject OpenAI's transport-level json_schema response_format
// depending on the loaded model/runtime configuration. Keep JSON prompting,
// normalization, repair, and strict local validation model-agnostic instead of
// coupling this compatibility rule to one model name.
const isLocalLMStudioModel = (config: AIProviderConfig): boolean => config.provider === 'lmstudio';

export const PROVIDER_OPTIONS: AIProviderOption[] = [
  {
    id: 'lmstudio',
    label: 'LM Studio',
    endpoint: DEFAULT_LM_ENDPOINT,
    models: ['qwen3.5-9b-fable-5-sdft', 'qwen/qwen3.5-9b', 'qwen/qwen3-coder-30b', 'openai/gpt-oss-20b', 'mistralai/mistral-7b-instruct-v0.3'],
    requiresApiKey: false,
    description: 'Local OpenAI-compatible model server',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/responses',
    // Add explicit Codex/gpt-5.6 model IDs (developer-facing defaults). These can be refreshed from the provider when an API key is present.
    models: ['gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-codex', 'gpt-codex-5.6'],
    requiresApiKey: true,
    description: 'OpenAI Responses API',
  },

  {
    id: 'openai-compatible',
    label: 'OpenAI-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o'],
    requiresApiKey: true,
    description: 'OpenAI or another compatible endpoint',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    endpoint: `${LOCAL_AUTH_BRIDGE}/provider/gemini`,
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-3.7-flash', 'gemini-3.7-pro'],
    requiresApiKey: true,
    description: 'Google Gemini generateContent API',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-latest'],
    requiresApiKey: true,
    description: 'Anthropic Messages API',
  },
];

export const getProviderOption = (provider: AIProviderId): AIProviderOption => PROVIDER_OPTIONS.find(option => option.id === provider) || PROVIDER_OPTIONS[0];

export const createDefaultAIProviderConfig = (): AIProviderConfig => ({
  provider: 'lmstudio',
  // Prefer a smaller local model by default (mistral-7b if available) to reduce memory issues in dev environments
  model: (PROVIDER_OPTIONS[0].models.find(m => /mistral|small|lite/i.test(m)) || PROVIDER_OPTIONS[0].models[0]),
  endpoint: DEFAULT_LM_ENDPOINT,
  apiKey: '',
  useSdkLogin: false,
});

const buildAuthHeaders = (config: AIProviderConfig): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  return headers;
};

const buildOpenAIHeaders = (config: AIProviderConfig): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
});

const toGeminiResponseSchema = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(toGeminiResponseSchema);
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  // Gemini responseSchema is not full JSON Schema. Remove OpenAI/JSON-Schema
  // validation keywords while preserving the structural fields Gemini accepts.
  const unsupported = new Set(['additionalProperties', 'minItems', 'maxItems', 'minLength', 'maxLength', 'strict', '$schema', '$id']);
  return Object.fromEntries(Object.entries(source)
    .filter(([key]) => !unsupported.has(key))
    .map(([key, nested]) => [key, key === 'type' && typeof nested === 'string' ? nested.toUpperCase() : toGeminiResponseSchema(nested)]));
};

const isTransientLocalProviderError = (error: unknown, provider: AIProviderId): boolean => {
  if (provider !== 'lmstudio') return false;
  if (error instanceof TypeError) return true;
  const candidate = error as { code?: string; message?: string } | null;
  return candidate?.code === 'LM_STUDIO_UNREACHABLE'
    || /network_io_suspended|network request failed|failed to fetch|socket hang up|econnreset/i.test(candidate?.message || '');
};

const parseOpenAIResponse = async (response: Response, providerLabel: string): Promise<ProviderResponse> => {
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string; reasoning_content?: string }; finish_reason?: string }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const content = payload.choices?.[0]?.message?.content;
  const reasoningContent = payload.choices?.[0]?.message?.reasoning_content || '';
  const finishReason = payload.choices?.[0]?.finish_reason;
  if (!content) return { content: '', status: reasoningContent ? 'reasoning_exhausted' : finishReason === 'length' ? 'truncated' : 'empty', finishReason, reasoningCharacters: reasoningContent.length, promptTokens: payload.usage?.prompt_tokens, completionTokens: payload.usage?.completion_tokens };
  return { content, status: finishReason === 'length' ? 'truncated' : 'complete', finishReason, reasoningCharacters: reasoningContent.length || undefined, promptTokens: payload.usage?.prompt_tokens, completionTokens: payload.usage?.completion_tokens };
};

const usesMaxCompletionTokens = (model: string): boolean => /^(?:o\d|gpt-5(?:\.|-|$))/i.test(model.trim());

const providerHttpError = async (response: Response, providerLabel: string): Promise<never> => {
  // Clone the response so reading here does not consume the original body for callers that need it.
  let detail = '';
  try {
    const clone = response.clone();
    const payload = await clone.json() as { error?: { message?: string; code?: string; type?: string }; message?: string };
    detail = payload.error?.message || payload.message || payload.error?.code || payload.error?.type || '';
  } catch {
    try {
      const clone2 = response.clone();
      detail = (await clone2.text()).slice(0, 300);
    } catch (err) {
      detail = '';
    }
  }
  const code = response.status === 404 ? 'LM_STUDIO_MODEL_ERROR' : response.status === 429 ? 'AI_RATE_LIMITED' : 'LM_STUDIO_HTTP_ERROR';
  const error = createServiceError(code, `${providerLabel} request failed (${response.status})${detail ? `: ${detail}` : '.'}`, response.status);
  if (response.status === 429) (error as RateLimitError).retryAfterMs = parseRetryAfterMs(response, detail);
  throw error;
};

const requestOpenAICompatible = async (messages: ProviderMessage[], config: AIProviderConfig, maxTokens: number, signal: AbortSignal, structuredOutput?: StructuredOutputSchema): Promise<ProviderResponse> => {
  // LM Studio does not accept the OpenAI json_schema response_format contract
  // reliably across loaded models. Keep the strict prompt/parser/validator path
  // active, but omit only the transport-level schema hint for local models.
  const transportStructuredOutput = isLocalLMStudioModel(config) ? undefined : structuredOutput;
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: buildAuthHeaders(config),
    body: JSON.stringify(buildOpenAICompatibleRequestBody({
      model: config.model,
      messages,
      maxTokens,
      structuredOutput: transportStructuredOutput,
      tokenParameter: config.provider === 'openai-compatible' && usesMaxCompletionTokens(config.model) ? 'max_completion_tokens' : 'max_tokens',
    })),
    signal,
  });
  if (!response.ok) await providerHttpError(response, getProviderOption(config.provider).label);
  return parseOpenAIResponse(response, getProviderOption(config.provider).label);
};

const requestOpenAIResponses = async (messages: ProviderMessage[], config: AIProviderConfig, maxTokens: number, signal: AbortSignal): Promise<ProviderResponse> => {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: buildAuthHeaders(config),
    body: JSON.stringify({ model: config.model, input: messages, max_output_tokens: maxTokens, stream: false }),
    signal,
  });
  if (!response.ok) await providerHttpError(response, 'OpenAI');
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number } };
  const content = payload.output_text || payload.output?.flatMap(item => item.content || []).filter(part => part.type === 'output_text' || part.text).map(part => part.text || '').join('').trim();
  if (!content) throw createServiceError('LM_STUDIO_EMPTY_RESPONSE', 'OpenAI returned no assistant content.');
  return { content, status: 'complete', promptTokens: payload.usage?.input_tokens, completionTokens: payload.usage?.output_tokens };
};

const requestGemini = async (messages: ProviderMessage[], config: AIProviderConfig, maxTokens: number, signal: AbortSignal, structuredOutput?: StructuredOutputSchema): Promise<ProviderResponse> => {
  const system = messages.find(message => message.role === 'system')?.content;
  const contents = messages.filter(message => message.role !== 'system').map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  const isKeychainProxy = config.endpoint.includes('/provider/gemini');
  const endpoint = isKeychainProxy
    ? `${config.endpoint}/generate`
    : `${config.endpoint}/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents, generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens, ...(structuredOutput ? { responseMimeType: 'application/json', responseSchema: toGeminiResponseSchema(structuredOutput.schema) } : {}) } }),
    signal,
  });
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error?.message || JSON.stringify(errorJson);
    } catch {
      try { errorDetail = await response.text(); } catch {}
    }
    throw createServiceError('LM_STUDIO_HTTP_ERROR', `Google Gemini request failed (${response.status})${errorDetail ? `: ${errorDetail}` : '.'}`, response.status);
  }
  const payload = await response.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  // Prefer non-thought text parts if available, otherwise any part text
  const content = extractGeminiResponseText(parts, Boolean(structuredOutput));

  if (!content) {
    const finishReason = candidate?.finishReason;
    const blockReason = payload.promptFeedback?.blockReason;
    const reasonMsg = finishReason ? ` (finish reason: ${finishReason})` : blockReason ? ` (blocked: ${blockReason})` : '';
    throw createServiceError('LM_STUDIO_EMPTY_RESPONSE', `Google Gemini returned no assistant content${reasonMsg}.`);
  }
  return { content, status: content ? (candidate?.finishReason === 'MAX_TOKENS' ? 'truncated' : 'complete') : 'empty', finishReason: candidate?.finishReason, promptTokens: payload.usageMetadata?.promptTokenCount, completionTokens: payload.usageMetadata?.candidatesTokenCount };
};

const requestAnthropic = async (messages: ProviderMessage[], config: AIProviderConfig, maxTokens: number, signal: AbortSignal): Promise<ProviderResponse> => {
  const system = messages.find(message => message.role === 'system')?.content;
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: config.model, max_tokens: maxTokens, temperature: 0.7, system, messages: messages.filter(message => message.role !== 'system') }),
    signal,
  });
  if (!response.ok) throw createServiceError('LM_STUDIO_HTTP_ERROR', `Anthropic Claude request failed (${response.status}).`, response.status);
  const payload = await response.json() as { content?: Array<{ type?: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
  const content = payload.content?.filter(part => part.type === 'text').map(part => part.text || '').join('').trim();
  if (!content) throw createServiceError('LM_STUDIO_EMPTY_RESPONSE', 'Anthropic Claude returned no assistant content.');
  return { content, status: 'complete', promptTokens: payload.usage?.input_tokens, completionTokens: payload.usage?.output_tokens };
};

export const requestWithProvider = async (messages: ProviderMessage[], config: AIProviderConfig, maxTokens: number, operation: string, structuredOutput?: StructuredOutputSchema): Promise<ProviderResponse> => {
  const requestId = createRequestId();
  const startedAt = Date.now();
  const requestCharacters = messages.reduce((total, message) => total + message.content.length, 0);
  const option = getProviderOption(config.provider);

  const usesLocalCredentialProxy = config.provider === 'gemini' && config.endpoint.includes('/provider/gemini');
  if (option.requiresApiKey && !config.apiKey?.trim() && !usesLocalCredentialProxy) {
    logger.error('ai_provider_missing_api_key', { requestId, operation, metadata: { requestedProvider: config.provider }, errorMessage: 'Provider requires API key but none provided.' });
    throw createServiceError('MISSING_PROVIDER_API_KEY', `${option.label} requires an API key. Do not use browser session/extension tokens as API keys.`);
  }
  let effectiveConfig: AIProviderConfig = { ...config };

  logger.info('ai_request_started', { requestId, operation, model: effectiveConfig.model, endpoint: effectiveConfig.endpoint, requestCharacters, metadata: { provider: effectiveConfig.provider, messageCount: messages.length, maxTokens } });
  const runRequest = async (): Promise<ProviderResponse> => {
    const controller = new AbortController();
    const timeoutMs = effectiveConfig.provider === 'lmstudio' ? LOCAL_REQUEST_TIMEOUT_MS : CLOUD_REQUEST_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return effectiveConfig.provider === 'openai'
        ? await requestOpenAIResponses(messages, effectiveConfig, maxTokens, controller.signal)
        : effectiveConfig.provider === 'gemini'
        ? await requestGemini(messages, effectiveConfig, maxTokens, controller.signal, structuredOutput)
        : effectiveConfig.provider === 'anthropic'
          ? await requestAnthropic(messages, effectiveConfig, maxTokens, controller.signal)
          : await requestOpenAICompatible(messages, effectiveConfig, maxTokens, controller.signal, structuredOutput);
    } finally {
      clearTimeout(timeoutId);
    }
  };
  try {
    let result: ProviderResponse;
    try {
      let attempt = 0;
      while (true) {
        try {
          result = effectiveConfig.provider === 'openai' && RATE_LIMITED_OPENAI_MODELS.has(effectiveConfig.model)
            ? await scheduleRateLimitedOpenAIModelRequest(messages, maxTokens, runRequest)
            : await runRequest();
          break;
        } catch (error) {
          if (!isTransientLocalProviderError(error, effectiveConfig.provider) || attempt >= LOCAL_TRANSIENT_RETRIES) throw error;
          attempt += 1;
          logger.warn('lm_local_transient_retry', { requestId, operation, model: effectiveConfig.model, retryAttempt: attempt, maxRetries: LOCAL_TRANSIENT_RETRIES, errorCode: 'LM_STUDIO_UNREACHABLE', errorMessage: error instanceof Error ? error.message : String(error) });
          await sleep(1_000 * attempt);
        }
      }
    } catch (error) {
      const rateLimited = error as Partial<RateLimitError>;
      if (effectiveConfig.provider === 'openai' && RATE_LIMITED_OPENAI_MODELS.has(effectiveConfig.model) && rateLimited.status === 429 && rateLimited.retryAfterMs) {
        logger.warn('ai_rate_limit_wait', { requestId, operation, model: effectiveConfig.model, retryAttempt: 1, maxRetries: 1, metadata: { provider: effectiveConfig.provider, retryAfterMs: rateLimited.retryAfterMs, tpmLimit: OPENAI_MODEL_TPM_LIMIT } });
        await sleep(rateLimited.retryAfterMs + 250);
        result = await scheduleRateLimitedOpenAIModelRequest(messages, maxTokens, runRequest);
      } else {
        throw error;
      }
    }
    logger.info('ai_request_succeeded', { requestId, operation, model: effectiveConfig.model, endpoint: effectiveConfig.endpoint, durationMs: Date.now() - startedAt, requestCharacters, responseCharacters: result.content.length, promptTokens: result.promptTokens, completionTokens: result.completionTokens, metadata: { provider: effectiveConfig.provider } });
    return result;
  } catch (error: any) {
    const errorCode = error?.name === 'AbortError' ? 'LM_STUDIO_TIMEOUT' : error instanceof TypeError ? 'LM_STUDIO_UNREACHABLE' : classifyServiceError(error);
    logger.error('ai_request_failed', { requestId, operation, model: effectiveConfig.model, endpoint: effectiveConfig.endpoint, durationMs: Date.now() - startedAt, requestCharacters, httpStatus: error?.status, errorCode, errorMessage: error instanceof Error ? error.message : String(error), metadata: { provider: effectiveConfig.provider } });
    throw error;
  }
};

export const testAIProviderConnection = async (config: AIProviderConfig): Promise<string> => {
  const option = getProviderOption(config.provider);
  // Require an API key for providers that need it. Do not accept SDK/browser session tokens as bearer credentials for OpenAI Responses API.
  if (option.requiresApiKey && !config.apiKey.trim() && !(config.provider === 'gemini' && config.endpoint.includes('/provider/gemini'))) throw new Error(`${option.label} requires an API key.`);
  const result = await requestWithProvider([{ role: 'user', content: 'Reply with exactly: connection verified' }], config, 1024, 'provider_connection_test');
  return result.content;
};

export const listAIProviderModels = async (config: AIProviderConfig): Promise<string[]> => {
  // Support model listing for lmstudio, openai-compatible, openai, and gemini providers.
  if (config.provider === 'gemini') {
    const isKeychainProxy = config.endpoint.includes('/provider/gemini');
    if (isKeychainProxy) {
      const response = await fetch(`${LOCAL_AUTH_BRIDGE}/credential-status/gemini`, { method: 'POST', cache: 'no-store' });
      const status = await response.json() as { available?: boolean };
      if (!response.ok || !status.available) throw new Error('Google Gemini Keychain credential is unavailable.');
      return PROVIDER_OPTIONS.find(option => option.id === 'gemini')?.models || [];
    }
    if (!config.apiKey.trim()) throw new Error('Google Gemini requires an API key to list models.');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(config.apiKey)}`);
    if (!response.ok) {
      let detail = '';
      try { const j = await response.json(); detail = j.error?.message || ''; } catch {}
      throw new Error(`Google Gemini model list request failed (${response.status})${detail ? `: ${detail}` : ''}`);
    }
    const payload = await response.json() as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
    const models = (payload.models || [])
      .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map(m => (m.name || '').replace(/^models\//, ''))
      .filter(Boolean);
    if (models.length === 0) throw new Error('Google Gemini returned no content-generation models.');
    return models;
  }

  if (config.provider === 'lmstudio' || config.provider === 'openai-compatible' || config.provider === 'openai') {
    // If OpenAI and API key present, call the real models endpoint. If useSdkLogin is enabled but no key,
    // return a simulated set of codex/gpt-5.6 model IDs to allow selection in dev.
    if (config.provider === 'openai' && !config.apiKey.trim() && config.useSdkLogin) {
      // Simulated developer model list for Codex/gpt-5.6 when SDK sign-in is used in dev
      return ['gpt-5.6-codex', 'gpt-codex-5.6', 'gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra'];
    }

    const modelsEndpoint = config.endpoint.replace(/\/chat\/completions\/?$/, '/models');
    const headers = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined;
    const response = await fetch(modelsEndpoint, { headers });
    if (!response.ok) throw new Error(`Model list request failed (${response.status}).`);
    const payload = await response.json() as { data?: Array<{ id?: string }> };
    const models = (payload.data || []).map(model => model.id).filter((id): id is string => Boolean(id));
    if (models.length === 0) throw new Error('The provider returned no selectable models.');
    return models;
  }

  throw new Error('This provider does not expose a compatible model-list endpoint. Enter the model ID manually.');
};