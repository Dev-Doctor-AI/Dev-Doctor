export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export type ServiceErrorCode = 'LM_STUDIO_UNREACHABLE' | 'LM_STUDIO_TIMEOUT' | 'LM_STUDIO_HTTP_ERROR' | 'LM_STUDIO_MODEL_ERROR' | 'LM_STUDIO_EMPTY_RESPONSE' | 'LM_STUDIO_INVALID_RESPONSE' | 'LM_STUDIO_RETRY_EXHAUSTED' | 'AI_RATE_LIMITED' | 'MISSING_PROVIDER_API_KEY' | 'LM_STUDIO_UNKNOWN';

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  event: string;
  operation?: string;
  requestId?: string;
  model?: string;
  endpoint?: string;
  durationMs?: number;
  httpStatus?: number;
  retryAttempt?: number;
  maxRetries?: number;
  requestCharacters?: number;
  responseCharacters?: number;
  promptTokens?: number;
  completionTokens?: number;
  errorCode?: ServiceErrorCode;
  errorMessage?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

const MAX_LOG_HISTORY = 200;
const history: LogEvent[] = [];

const write = (level: LogLevel, event: string, details: Omit<LogEvent, 'timestamp' | 'level' | 'event'> = {}): LogEvent => {
  const entry: LogEvent = { timestamp: new Date().toISOString(), level, event, ...details };
  history.push(entry);
  if (history.length > MAX_LOG_HISTORY) history.shift();
  const method = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'info';
  console[method]('[Dev Doctor]', entry);
  return entry;
};

export const logger = {
  info: (event: string, details?: Omit<LogEvent, 'timestamp' | 'level' | 'event'>) => write('INFO', event, details),
  warn: (event: string, details?: Omit<LogEvent, 'timestamp' | 'level' | 'event'>) => write('WARN', event, details),
  error: (event: string, details?: Omit<LogEvent, 'timestamp' | 'level' | 'event'>) => write('ERROR', event, details),
  getHistory: (): LogEvent[] => history.map(entry => ({ ...entry, metadata: entry.metadata ? { ...entry.metadata } : undefined })),
  clearHistory: (): void => { history.length = 0; },
};

export const createRequestId = (): string => `lm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const classifyServiceError = (error: unknown): ServiceErrorCode => {
  const value = error as { name?: string; message?: string; code?: string; status?: number } | null;
  const message = String(value?.message || error || '').toLowerCase();
  if (value?.name === 'AbortError' || message.includes('timed out')) return 'LM_STUDIO_TIMEOUT';
  if (value?.code === 'LM_STUDIO_EMPTY_RESPONSE' || message.includes('no assistant content')) return 'LM_STUDIO_EMPTY_RESPONSE';
  if (value?.code === 'LM_STUDIO_INVALID_RESPONSE' || message.includes('invalid response')) return 'LM_STUDIO_INVALID_RESPONSE';
  if (value?.status === 404 || (message.includes('model') && message.includes('load'))) return 'LM_STUDIO_MODEL_ERROR';
  if (value?.status === 429 || message.includes('rate limit') || message.includes('quota') || message.includes('insufficient_quota')) return 'AI_RATE_LIMITED';
  if (typeof value?.status === 'number' || message.includes('request failed')) return 'LM_STUDIO_HTTP_ERROR';
  if (error instanceof TypeError || message.includes('unreachable') || message.includes('failed to fetch')) return 'LM_STUDIO_UNREACHABLE';
  return 'LM_STUDIO_UNKNOWN';
};

export const createServiceError = (code: ServiceErrorCode, message: string, status?: number): Error & { code: ServiceErrorCode; status?: number } => {
  const error = new Error(message) as Error & { code: ServiceErrorCode; status?: number };
  error.code = code;
  if (status !== undefined) error.status = status;
  return error;
};

export const getUserFacingError = (error: unknown, fallback = 'The request could not be completed. Please try again.'): string => {
  const code = classifyServiceError(error);
  switch (code) {
    case 'LM_STUDIO_UNREACHABLE': return 'The selected AI provider is not reachable. Check the endpoint and network connection.';
    case 'LM_STUDIO_TIMEOUT': return 'LM Studio took too long to respond. Please try again.';
    case 'LM_STUDIO_MODEL_ERROR': return 'The configured LM Studio model is unavailable or could not be loaded.';
    case 'LM_STUDIO_EMPTY_RESPONSE': return 'LM Studio returned an empty response. Please try again.';
    case 'LM_STUDIO_INVALID_RESPONSE': return 'LM Studio returned an incomplete result. Please try again.';
    case 'LM_STUDIO_HTTP_ERROR': return 'The selected AI provider rejected the request. Check the model and request configuration.';
    case 'LM_STUDIO_RETRY_EXHAUSTED': return 'The selected AI provider could not complete the request after several attempts.';
    case 'MISSING_PROVIDER_API_KEY': return 'The selected AI provider requires an API key or sign-in credentials.';
    case 'AI_RATE_LIMITED': return 'The selected AI provider reported a rate limit, quota, or billing limit. Check your provider account and try again later.';
    default: return fallback;
  }
};