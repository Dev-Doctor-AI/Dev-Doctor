export interface ModelPricing {
  inputPerMillion: number;       // Upload / prompt price ($ per 1M tokens)
  outputPerMillion: number;      // Download / completion price ($ per 1M tokens)
  cachedInputPerMillion: number; // Cached input / prompt cache read price ($ per 1M tokens)
}

export interface DetailedCostReport {
  totalCostUSD: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  inputCostUSD: number;
  outputCostUSD: number;
  cacheCostUSD: number;
  model: string;
  provider: string;
  isLocal: boolean;
  rates: ModelPricing;
}

// Standard Published Cloud API Pricing ($ / 1 Million Tokens)
export const CLOUD_MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4o': { inputPerMillion: 2.50, outputPerMillion: 10.00, cachedInputPerMillion: 1.25 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.60, cachedInputPerMillion: 0.075 },
  'gpt-4.5-preview': { inputPerMillion: 75.00, outputPerMillion: 150.00, cachedInputPerMillion: 37.50 },
  'o1': { inputPerMillion: 15.00, outputPerMillion: 60.00, cachedInputPerMillion: 7.50 },
  'o3-mini': { inputPerMillion: 1.10, outputPerMillion: 4.40, cachedInputPerMillion: 0.55 },
  'gpt-5.6-luna': { inputPerMillion: 2.50, outputPerMillion: 10.00, cachedInputPerMillion: 1.25 },
  'gpt-5.6-sol': { inputPerMillion: 2.50, outputPerMillion: 10.00, cachedInputPerMillion: 1.25 },
  'gpt-5.6-terra': { inputPerMillion: 2.50, outputPerMillion: 10.00, cachedInputPerMillion: 1.25 },
  'gpt-5.6-codex': { inputPerMillion: 2.50, outputPerMillion: 10.00, cachedInputPerMillion: 1.25 },
  'gpt-codex-5.6': { inputPerMillion: 2.50, outputPerMillion: 10.00, cachedInputPerMillion: 1.25 },

  // Google Gemini Models
  'gemini-2.0-flash': { inputPerMillion: 0.10, outputPerMillion: 0.40, cachedInputPerMillion: 0.025 },
  'gemini-2.0-flash-lite': { inputPerMillion: 0.075, outputPerMillion: 0.30, cachedInputPerMillion: 0.01875 },
  'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.30, cachedInputPerMillion: 0.01875 },
  'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.00, cachedInputPerMillion: 0.3125 },
  'gemini-3.7-flash': { inputPerMillion: 0.15, outputPerMillion: 0.60, cachedInputPerMillion: 0.0375 },
  'gemini-3.7-pro': { inputPerMillion: 1.50, outputPerMillion: 6.00, cachedInputPerMillion: 0.375 },
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.60, cachedInputPerMillion: 0.0375 },
  'gemini-2.5-pro': { inputPerMillion: 1.50, outputPerMillion: 6.00, cachedInputPerMillion: 0.375 },

  // Anthropic Claude Models
  'claude-3-7-sonnet-latest': { inputPerMillion: 3.00, outputPerMillion: 15.00, cachedInputPerMillion: 0.30 },
  'claude-sonnet-4-20250514': { inputPerMillion: 3.00, outputPerMillion: 15.00, cachedInputPerMillion: 0.30 },
  'claude-3-5-sonnet-20241022': { inputPerMillion: 3.00, outputPerMillion: 15.00, cachedInputPerMillion: 0.30 },
  'claude-3-5-haiku-20241022': { inputPerMillion: 0.80, outputPerMillion: 4.00, cachedInputPerMillion: 0.08 },
  'claude-3-opus-20240229': { inputPerMillion: 15.00, outputPerMillion: 75.00, cachedInputPerMillion: 1.50 },
};

// Calculate Combined Cloud Average Benchmark
const allCloudPrices = Object.values(CLOUD_MODEL_PRICING);
export const CLOUD_BENCHMARK_AVERAGE: ModelPricing = {
  inputPerMillion: Number((allCloudPrices.reduce((acc, p) => acc + p.inputPerMillion, 0) / allCloudPrices.length).toFixed(4)),
  outputPerMillion: Number((allCloudPrices.reduce((acc, p) => acc + p.outputPerMillion, 0) / allCloudPrices.length).toFixed(4)),
  cachedInputPerMillion: Number((allCloudPrices.reduce((acc, p) => acc + p.cachedInputPerMillion, 0) / allCloudPrices.length).toFixed(4)),
};

// Local models are registered at exactly 1% of the combined cloud benchmark (accounting for local electricity/compute cost)
export const LOCAL_MODEL_PRICING: ModelPricing = {
  inputPerMillion: Number((CLOUD_BENCHMARK_AVERAGE.inputPerMillion * 0.01).toFixed(6)),       // ~$0.020 / 1M tokens
  outputPerMillion: Number((CLOUD_BENCHMARK_AVERAGE.outputPerMillion * 0.01).toFixed(6)),     // ~$0.080 / 1M tokens
  cachedInputPerMillion: Number((CLOUD_BENCHMARK_AVERAGE.cachedInputPerMillion * 0.01).toFixed(6)), // ~$0.005 / 1M tokens
};

/**
 * Returns the exact token pricing structure for any active model & provider.
 */
export const getModelPricing = (provider: string, model: string): { pricing: ModelPricing; isLocal: boolean } => {
  const isLocal = provider === 'lmstudio' || /localhost|127\.0\.0\.1|192\.168|local/i.test(model);
  if (isLocal) {
    return { pricing: LOCAL_MODEL_PRICING, isLocal: true };
  }

  // Exact cloud model match
  if (CLOUD_MODEL_PRICING[model]) {
    return { pricing: CLOUD_MODEL_PRICING[model], isLocal: false };
  }

  // Heuristic substring match
  const lower = model.toLowerCase();
  for (const [key, value] of Object.entries(CLOUD_MODEL_PRICING)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return { pricing: value, isLocal: false };
    }
  }

  // Fallback to standard cloud benchmark average
  return { pricing: CLOUD_BENCHMARK_AVERAGE, isLocal: false };
};

/**
 * Calculates USD cost for token usage based on upload, download, and cache rates.
 */
export const calculateTokenCostUSD = (
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0,
  pricing: ModelPricing
): { totalCostUSD: number; inputCostUSD: number; outputCostUSD: number; cacheCostUSD: number } => {
  const uncachedPromptTokens = Math.max(0, promptTokens - cachedTokens);
  const inputCostUSD = (uncachedPromptTokens / 1_000_000) * pricing.inputPerMillion;
  const cacheCostUSD = (cachedTokens / 1_000_000) * pricing.cachedInputPerMillion;
  const outputCostUSD = (completionTokens / 1_000_000) * pricing.outputPerMillion;
  const totalCostUSD = inputCostUSD + cacheCostUSD + outputCostUSD;

  return { totalCostUSD, inputCostUSD, outputCostUSD, cacheCostUSD };
};
