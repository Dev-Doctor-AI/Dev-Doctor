import {
  AssetList, AttachedFile, BrainstormState, CanonicalProjectContext, CritiquePoint, FreelanceBrief, GDDSection,
  GeneratedImages, LensType, MVPDefinition, MVPFeatureSpec, MVPFeatureSpecValidationOutcome, PitchDeckSlide, TDDFeature,
  TechnicalDesignSection, TechnicalSpecification, ProductionBrief, MemoryEntry, ConciergeMode, UserProxyRecord, RiskCritiqueRecord, SynthesisRecord,
} from '../types';
import { classifyServiceError, createServiceError, logger } from './logger';
import { AIProviderConfig, createDefaultAIProviderConfig, requestWithProvider, StructuredOutputSchema } from './aiProvider';
import { calculateTokenCostUSD, getModelPricing, DetailedCostReport } from './tokenPricing';
import { BDDFeatureValidationResult, formatMVPFeatureSpecRepairIssues, mvpFeatureSpecNeedsRepair, omitOptionalGenericFiller, parseMVPFeatureSpecResponse, validateMVPFeatureSpec } from './bddFeatureValidator';
import { parseTechnicalSpecificationResponse, prepareTechnicalDesignInputs, validateTechnicalSpecification } from './technicalSpecContract';
import { normalizeProductionBrief, normalizeRelatedBriefReferences, parseAssetMetadataResponse, parseProductionBriefsResponse, parseVisualPromptResponse, projectAssetMetadataToLegacyList, projectProductionBriefsToLegacy, projectVisualPromptsToLegacyMap, validateProductionBriefs } from './productionHandoffContract';
import { normalizeCritiquePoint, normalizePitchSlide, omitInvalidPitchClaims, validatePitchSlides, validateScopeReview } from './scopePitchContract';
import { conciergeModeGuidance, deriveBrainstormState, normalizeMemoryEntries, validateMemoryEntries } from './memoryPersonaContract';
import { validateRiskCritique, validateSynthesis, validateUserProxy } from './memoryPersonaContract';
import { buildBddPrompt, buildCritiqueAnswerSuggestionPrompt, buildGddTocPrompt, buildMvpPrompt, buildTddRoleGuidance, buildTechnicalCritiquePrompt, buildTechnicalSpecRoleGuidance, BDD_SYSTEM_INSTRUCTION, CONCIERGE_SYSTEM_INSTRUCTION, CRITIQUE_ANSWER_SUGGESTION_SYSTEM_INSTRUCTION, GDD_TOC_SYSTEM_INSTRUCTION, MVP_SYSTEM_INSTRUCTION, TECHNICAL_CRITIQUE_SYSTEM_INSTRUCTION, TECHNICAL_SPEC_SYSTEM_INSTRUCTION, TDD_SYSTEM_INSTRUCTION } from './personaPrompts';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type VisualAsset = { key: string; description: string; aspectRatio?: string };
type SlideConfig = { title: string; prompt?: string; visual?: string };

let activeProviderConfig: AIProviderConfig = createDefaultAIProviderConfig();
const PERSONA_CONTEXT_LIMIT = 8_000;
// Conversation turns are intentionally concise. These are output-token ceilings,
// not reasoning budgets; the local Mistral validation profile does not request or
// enable hidden reasoning.
const CONCIERGE_OUTPUT_TOKENS = 512;
const MEMORY_OUTPUT_TOKENS = 768;
const MVP_FEATURE_SPEC_OUTPUT_TOKENS = 2048;
let sessionCost = 0;
let sessionPromptTokens = 0;
let sessionCompletionTokens = 0;
let sessionCachedTokens = 0;

const stringArraySchema = { type: 'array', items: { type: 'string', minLength: 1 } };
const mvpFeatureSpecStructuredOutput: StructuredOutputSchema = {
  name: 'mvp_feature_specification',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string', minLength: 1 },
      feature: { type: 'string', minLength: 1 },
      userStory: { type: 'string', minLength: 1 },
      scenarios: {
        type: 'array', minItems: 2,
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            id: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['happy-path', 'edge-case', 'failure', 'boundary', 'offline'] },
            title: { type: 'string', minLength: 1 },
            given: stringArraySchema,
            when: stringArraySchema,
            then: stringArraySchema,
            notes: { type: 'string' },
          },
          required: ['id', 'type', 'title', 'given', 'when', 'then'],
        },
      },
      invalidInputs: stringArraySchema,
      boundaryConditions: stringArraySchema,
      offlineBehavior: { type: 'string' },
      accessibility: stringArraySchema,
      acceptanceCriteria: stringArraySchema,
      failureStates: stringArraySchema,
      telemetry: stringArraySchema,
      securityConsiderations: stringArraySchema,
      performanceTargets: stringArraySchema,
      technicalNotes: { type: 'string', minLength: 1 },
      dependencies: stringArraySchema,
    },
    required: ['id', 'feature', 'userStory', 'scenarios', 'technicalNotes'],
  },
};

const technicalSpecificationStructuredOutput: StructuredOutputSchema = {
  name: 'technical_specification',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      featureId: { type: 'string', minLength: 1 },
      feature: { type: 'string', minLength: 1 },
      userStory: { type: 'string', minLength: 1 },
      dataModels: {
        type: 'array', minItems: 1,
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1 }, purpose: { type: 'string', minLength: 1 },
            fields: {
              type: 'array', minItems: 1,
              items: {
                type: 'object', additionalProperties: false,
                properties: { name: { type: 'string', minLength: 1 }, type: { type: 'string', minLength: 1 }, required: { type: 'boolean' }, description: { type: 'string' } },
                required: ['name', 'type', 'required'],
              },
            },
            constraints: stringArraySchema,
          },
          required: ['name', 'purpose', 'fields', 'constraints'],
        },
      },
      apiContracts: {
        type: 'array', minItems: 1,
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1 }, method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'EVENT'] }, path: { type: 'string', minLength: 1 },
            request: { type: 'string' }, response: { type: 'string' }, errors: stringArraySchema, authentication: { type: 'string' },
          },
          required: ['name', 'method', 'path', 'request', 'response', 'errors', 'authentication'],
        },
      },
      stateTransitions: {
        type: 'array', minItems: 1,
        items: {
          type: 'object', additionalProperties: false,
          properties: { from: { type: 'string', minLength: 1 }, event: { type: 'string', minLength: 1 }, to: { type: 'string', minLength: 1 }, guard: { type: 'string' }, effects: stringArraySchema },
          required: ['from', 'event', 'to', 'guard', 'effects'],
        },
      },
      dependencies: stringArraySchema,
      acceptanceCriteria: stringArraySchema,
    },
    required: ['featureId', 'feature', 'userStory', 'dataModels', 'apiContracts', 'stateTransitions', 'dependencies', 'acceptanceCriteria'],
  },
};

const technicalDesignDocumentStructuredOutput: StructuredOutputSchema = {
  name: 'technical_design_document',
  schema: {
    type: 'array',
    minItems: 1,
    maxItems: 8,
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', minLength: 1 },
        content: { type: 'string', minLength: 1, maxLength: 1600 },
      },
      required: ['title', 'content'],
    },
  },
};

const productionBriefsStructuredOutput: StructuredOutputSchema = {
  name: 'production_briefs',
  schema: {
    type: 'array',
    minItems: 1,
    maxItems: 10,
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
        title: { type: 'string', minLength: 1 },
        role: { type: 'string', minLength: 1 },
        category: { type: 'string', enum: ['creative', 'technical', 'production', 'audio', 'design'] },
        taskOverview: { type: 'string', minLength: 1, maxLength: 800 },
        scopeOfWork: { ...stringArraySchema, minItems: 1, maxItems: 12 },
        deliverables: { ...stringArraySchema, minItems: 1, maxItems: 12 },
        acceptanceCriteria: { ...stringArraySchema, minItems: 1, maxItems: 12 },
        dependencies: { ...stringArraySchema, maxItems: 12 },
        relatedBriefs: { ...stringArraySchema, maxItems: 12 },
        constraints: { ...stringArraySchema, maxItems: 12 },
        outOfScope: { ...stringArraySchema, maxItems: 12 },
        sourceReferences: { ...stringArraySchema, maxItems: 12 },
      },
      required: ['id', 'title', 'role', 'category', 'taskOverview', 'scopeOfWork', 'deliverables', 'acceptanceCriteria', 'dependencies', 'relatedBriefs', 'constraints', 'outOfScope', 'sourceReferences'],
    },
  },
};

const extractJson = (text: string): unknown => {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(clean); } catch { /* Search common fenced/prose response boundaries. */ }
  const candidates = [
    clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1),
    clean.slice(clean.indexOf('['), clean.lastIndexOf(']') + 1),
  ];
  for (const candidate of candidates) {
    if (candidate.length > 1) {
      try { return JSON.parse(candidate); } catch { continue; }
    }
  }
  return null;
};

const severity = (value: unknown): CritiquePoint['severity'] => {
  const text = String(value || '').toLowerCase();
  if (text.includes('high') || text.includes('critical') || text === '1') return 'High';
  if (text.includes('low') || text.includes('minor') || text === '3') return 'Low';
  return 'Medium';
};

const normaliseCritiques = (value: unknown): CritiquePoint[] => Array.isArray(value)
  ? value
    .filter((item: any) => isNonEmptyString(item?.feature) && isNonEmptyString(item?.critique) && isNonEmptyString(item?.suggestion) && isNonEmptyString(item?.reasoning))
    .map((item: any) => ({
      feature: item.feature.trim(),
      critique: item.critique.trim(),
      suggestion: item.suggestion.trim(),
      reasoning: item.reasoning.trim(),
      severity: severity(item.severity),
    }))
  : [];

const parseScopeReview = (response: string): CritiquePoint[] => {
  const jsonPoints = normaliseCritiques(extractJson(response));
  if (jsonPoints.length) return jsonPoints;

  const blocks = response.split(/(?=^#{1,4}\s+|^\*\*Feature\*\*\s*:)/m).filter(block => block.trim());
  const points = blocks.map(block => {
    const feature = block.match(/^(?:#{1,4}\s+|\*\*Feature\*\*\s*:\s*)(.+)$/im)?.[1]?.replace(/\*+/g, '').trim();
    const critique = block.match(/\*\*Critique\*\*\s*:\s*([\s\S]*?)(?=\n\s*\*\*(?:Suggestion|Reasoning|Severity)\*\*\s*:|$)/i)?.[1]?.trim();
    const suggestion = block.match(/\*\*Suggestion\*\*\s*:\s*([\s\S]*?)(?=\n\s*\*\*(?:Reasoning|Severity)\*\*\s*:|$)/i)?.[1]?.trim();
    const reasoning = block.match(/\*\*Reasoning\*\*\s*:\s*([\s\S]*?)(?=\n\s*\*\*Severity\*\*\s*:|$)/i)?.[1]?.trim();
    const severityMatch = block.match(/\*\*Severity\*\*\s*:\s*(High|Medium|Low)/i)?.[1];
    return feature && critique && suggestion && reasoning ? { feature, critique, suggestion, reasoning, severity: severity(severityMatch) } : null;
  }).filter((point): point is CritiquePoint => point !== null);
  return points;
};

const invalidResponse = (operation: string): never => {
  logger.error('lm_response_validation_failed', { operation, errorCode: 'LM_STUDIO_INVALID_RESPONSE', errorMessage: 'Structured response did not match the expected shape.' });
  throw createServiceError('LM_STUDIO_INVALID_RESPONSE', `LM Studio returned an invalid ${operation} response.`);
};

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isSectionArray = (value: unknown): value is GDDSection[] => Array.isArray(value) && value.length > 0 && value.every((item: any) => isNonEmptyString(item?.title) && isNonEmptyString(item?.content));
const isValidTechnicalDesignSections = (value: unknown): value is TechnicalDesignSection[] => {
  if (!Array.isArray(value) || value.length < 2 || value.length > 8) return false;
  const titles = new Set<string>();
  return value.every((item: any) => {
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    const content = typeof item?.content === 'string' ? item.content.trim() : '';
    const key = title.toLowerCase();
    if (!title || !content || titles.has(key)) return false;
    titles.add(key);
    return true;
  });
};

const normalizeTechnicalDesignCandidate = (value: unknown): unknown => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  for (const key of ['sections', 'technicalDesignDocument', 'technical_design_document', 'result', 'output', 'document']) {
    if (Array.isArray(source[key])) return source[key];
  }
  return Object.entries(source).flatMap(([key, item]) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const section = item as Record<string, unknown>;
    const title = section.title ?? section.heading ?? section.name ?? key;
    const content = section.content ?? section.body ?? section.text ?? section.details;
    return isNonEmptyString(title) && isNonEmptyString(content) ? [{ title, content }] : [];
  });
};
const isPitchDeckArray = (value: unknown): value is PitchDeckSlide[] => Array.isArray(value) && value.length > 0 && value.every((item: any) => isNonEmptyString(item?.title) && isNonEmptyString(item?.content));
const isFreelanceBriefArray = (value: unknown): value is FreelanceBrief[] => Array.isArray(value) && value.length > 0 && value.every((item: any) => isNonEmptyString(item?.title) && isNonEmptyString(item?.content));
const isAssetObject = (value: unknown): value is AssetList => Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0 && Object.values(value as Record<string, unknown>).every(items => Array.isArray(items) && items.every(isNonEmptyString)));
const isCritiqueArray = (value: unknown): value is CritiquePoint[] => Array.isArray(value) && value.length > 0 && value.every((item: any) => isNonEmptyString(item?.feature) && isNonEmptyString(item?.critique) && isNonEmptyString(item?.suggestion) && isNonEmptyString(item?.reasoning));

const parseMarkdownToSections = (markdown: string, fallbackToc: string[], projectName: string): GDDSection[] => {
  const lines = markdown.split('\n');
  const sections: GDDSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/) ||
      line.match(/^(?:\d+\.|\bSection\s+\d+[:.]?)\s+([A-Z0-9\s&:'"-]{3,})$/i) ||
      line.match(/^\*\*(\d+\.\s+[^*]+|[A-Z\s&:'"-]{4,})\*\*\s*$/);

    if (headingMatch) {
      if (currentTitle && currentContent.join('\n').trim().length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle = headingMatch[1].replace(/[*_`#]/g, '').trim();
      currentContent = [];
    } else if (currentTitle) {
      currentContent.push(line);
    }
  }
  if (currentTitle && currentContent.join('\n').trim().length > 0) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }

  if (sections.length >= 2) return sections;
  return [];
};

const parseFreelanceBriefs = (response: string): FreelanceBrief[] => {
  const parsed = extractJson(response);
  if (isFreelanceBriefArray(parsed)) {
    return parsed.map(brief => ({ title: brief.title.trim(), content: brief.content.trim() }));
  }

  const markdownBriefs = parseMarkdownToSections(response, [], '');
  return isFreelanceBriefArray(markdownBriefs)
    ? markdownBriefs.map(brief => ({ title: brief.title.trim(), content: brief.content.trim() }))
    : [];
};

const parseTableOfContents = (response: string): string[] => {
  const parsed = extractJson(response);
  if (Array.isArray(parsed) && parsed.every(isNonEmptyString)) return parsed.map(title => title.trim()).filter(Boolean);

  const titles = response
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replace(/^#{1,4}\s+/, '').replace(/^(?:[-*•]|\d+[.)])\s+/, '').replace(/^\*\*|\*\*$/g, '').trim())
    .filter(line => line.length >= 3 && line.length <= 100)
    .filter(line => !/^here(?:'s| is)\b|^table of contents\b|^json\b|^\[|^\{/i.test(line));

  return [...new Set(titles)];
};

const generateRichFallbackGDD = (sourceText: string, toc: string[], projectName: string): GDDSection[] => {
  const brief = sourceText || `${projectName} is a focused interactive game application designed for accessible, engaging gameplay.`;
  return toc.map(title => {
    const lower = title.toLowerCase();
    let content = '';
    if (lower.includes('overview') || lower.includes('executive') || lower.includes('summary') || lower.includes('vision')) {
      content = `### 1.1 Executive Summary\n${projectName} is crafted as a streamlined, high-engagement title. The project prioritizes rapid onboarding, accessible touch/keyboard controls, and instant player feedback without extraneous overhead.\n\n### 1.2 Core Vision\n${brief.slice(0, 800)}\n\n### 1.3 Target Audience & Platform\nDesigned for frictionless play on mobile (iOS/Android) and web. Zero mandatory account friction—tap and play immediately.`;
    } else if (lower.includes('experience') || lower.includes('gameplay') || lower.includes('mechanic') || lower.includes('pillar') || lower.includes('loop')) {
      content = `### 2.1 Core Loop\n1. **Prompt Phase:** The player is presented with a clear visual objective or physics state.\n2. **Action Phase:** Physical interaction via direct touch/drag mechanics with gravity and collision detection.\n3. **Feedback Phase:** Instant celebration (audio + animation) on success or humorous corrective feedback on error.\n\n### 2.2 Progression & Mechanics\nStarts with basic single-attribute interaction and progressively scales with velocity modifiers, dynamic obstacles, and multi-step sorting.`;
    } else if (lower.includes('technical') || lower.includes('architecture') || lower.includes('engine') || lower.includes('spec') || lower.includes('network')) {
      content = `### 3.1 Architecture Overview\n- **Client-Only Architecture:** Completely offline-first with local persistence (LocalStorage/IndexedDB).\n- **Physics & Rendering:** 2D kinematic engine with touch slop tolerance and collision bounds.\n- **Audio Engine:** Low-latency WebAudio/sound sprite system.\n\n### 3.2 Data Schema\nConfigurable item catalog stored in lightweight JSON format for easy content expansion.`;
    } else if (lower.includes('character') || lower.includes('feature') || lower.includes('system') || lower.includes('combat') || lower.includes('power')) {
      content = `### 4.1 Feature Breakdown\n- **Interactive Character System:** Animated state machine with idle, hungry, chewing, and feedback expressions.\n- **Dynamic Spawner:** Physics-driven dropper pipe with tunable drop rates and collision boundaries.\n- **Child-Proof UI:** Large touch targets (minimum 64x64px), high contrast visuals, and zero paywalls or external links in primary flow.`;
    } else if (lower.includes('world') || lower.includes('level') || lower.includes('art') || lower.includes('audio')) {
      content = `### 5.1 Presentation & Environment\n- **Art Direction:** Vibrant, friendly cartoon visual aesthetic with bold silhouettes and high color contrast.\n- **Animation Pipeline:** Dynamic squash-and-stretch procedural transforms and particle burst FX on milestones.\n- **Sound & Haptics:** Punchy, satisfying tactile feedback with dynamic sound effects.`;
    } else {
      content = `### ${title}\nDetailed specifications for **${title}** in **${projectName}**:\n\n- **Objective:** Establish the foundational delivery requirements for ${projectName}.\n- **Implementation:** Built using modular, decoupled components to ensure rapid iteration.\n- **Scope Guardrail:** Maintain strict MVP boundaries, eliminating secondary fluff and keeping build overhead minimal.\n\n*Source Context:* ${brief.slice(0, 500)}`;
    }
    return { title, content };
  });
};
const request = async (messages: ChatMessage[], model = activeProviderConfig.model, maxTokens = 4096, operation = 'lm_request', structuredOutput?: StructuredOutputSchema): Promise<string> => {
  const config = { ...activeProviderConfig, model };
  const result = await requestWithProvider(messages, config, maxTokens, operation, structuredOutput);
  if (result.status === 'empty') throw createServiceError('LM_STUDIO_EMPTY_RESPONSE', 'The selected model returned no visible assistant content.');
  if (result.status === 'reasoning_exhausted') {
    logger.warn('lm_reasoning_exhausted', { operation, model: config.model, errorCode: 'LM_STUDIO_REASONING_EXHAUSTED', errorMessage: `The model consumed its reasoning budget without visible content (${result.reasoningCharacters || 0} reasoning characters).` });
    throw createServiceError('LM_STUDIO_REASONING_EXHAUSTED', 'The selected model exhausted its reasoning budget before returning visible content.');
  }
  if (result.status === 'truncated') logger.warn('lm_generation_truncated', { operation, model: config.model, errorCode: 'LM_STUDIO_TRUNCATED_RESPONSE', errorMessage: `Provider finish reason: ${result.finishReason || 'length'}` });
  const promptTokens = result.promptTokens || 0;
  const completionTokens = result.completionTokens || 0;
  sessionPromptTokens += promptTokens;
  sessionCompletionTokens += completionTokens;
  const { pricing } = getModelPricing(config.provider, config.model);
  const cost = calculateTokenCostUSD(promptTokens, completionTokens, 0, pricing);
  sessionCost += cost.totalCostUSD;
  return result.content;
};

const ask = (prompt: string, system = 'You are a precise project-development assistant.', maxTokens = 4096, operation = 'lm_request', structuredOutput?: StructuredOutputSchema): Promise<string> =>
  request([{ role: 'system', content: system }, { role: 'user', content: prompt }], activeProviderConfig.model, maxTokens, operation, structuredOutput);
const withFallback = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
  try { return await operation(); } catch (error) { console.error('[LM Studio Service Error]', error); return fallback; }
};

const normalizeConciergeResponse = (response: string, mode: ConciergeMode): string => {
  let normalized = response.trim();
  if (mode !== 'completion-gate') {
    normalized = normalized
      .replace(/\s*(?:After we discuss|Once we discuss|When we discuss)[\s\S]*?(?:Are you ready[^?]*\?|ready to (?:compile|begin|start)[^?]*\?)/i, '')
      .trim();
  }
  if (mode !== 'completion-gate') {
    const firstQuestion = normalized.indexOf('?');
    if (firstQuestion >= 0) normalized = normalized.slice(0, firstQuestion + 1).trim();
  }
  return normalized.replace(/(^|\n)\s*\d+[.)]\s*/g, '$1').trim();
};

const section = (title: string, content: string): GDDSection => ({ title, content });

export const compactConversation = (conversationText: string, maxCharacters = PERSONA_CONTEXT_LIMIT): string => {
  if (conversationText.length <= maxCharacters) return conversationText;

  const lines = conversationText.split('\n');
  const opening = lines.slice(0, 2).join('\n');
  const suffixBudget = Math.max(0, maxCharacters - opening.length - 80);
  let recent = lines.slice(2).join('\n');
  if (recent.length > suffixBudget) recent = recent.slice(-suffixBudget);
  return `${opening}\n[Earlier conversation omitted to preserve context window]\n${recent}`;
};

export const buildRoleRelevantPersonaContext = (conversationText: string, memoryEntries: MemoryEntry[] = [], maxCharacters = PERSONA_CONTEXT_LIMIT): string => {
  const memory = memoryEntries.filter(entry => entry.status !== 'rejected').map(entry => `[${entry.kind}/${entry.status}] ${entry.text}`).join('\n');
  const conversation = compactConversation(conversationText, Math.max(1000, maxCharacters - memory.length - 80));
  return memory ? `Structured memory:\n${memory}\n\nRecent conversation:\n${conversation}` : conversation;
};

export const calculateTokens = (text: string): number => Math.ceil(text.length / 4);
export const safeJsonParse = (text: string): unknown => extractJson(text);
export const buildMessages = (messages: Array<{ sender: string; text: string }>, _projectName = ''): ChatMessage[] => messages.map(message => ({ role: message.sender === 'user' ? 'user' : 'assistant', content: message.text }));
export const updateLMCost = (model: string, inputTokens: number, outputTokens: number, cachedTokens = 0): void => {
  sessionPromptTokens += inputTokens;
  sessionCompletionTokens += outputTokens;
  sessionCachedTokens += cachedTokens;
  const { pricing } = getModelPricing(activeProviderConfig.provider, model || activeProviderConfig.model);
  const cost = calculateTokenCostUSD(inputTokens, outputTokens, cachedTokens, pricing);
  sessionCost += cost.totalCostUSD;
};
export const resetLMCostSession = (initialCost = 0): void => {
  sessionCost = initialCost;
  sessionPromptTokens = 0;
  sessionCompletionTokens = 0;
  sessionCachedTokens = 0;
};
export const getLMCostReport = (): DetailedCostReport => {
  const { pricing, isLocal } = getModelPricing(activeProviderConfig.provider, activeProviderConfig.model);
  return {
    totalCostUSD: sessionCost,
    promptTokens: sessionPromptTokens,
    completionTokens: sessionCompletionTokens,
    cachedTokens: sessionCachedTokens,
    totalTokens: sessionPromptTokens + sessionCompletionTokens + sessionCachedTokens,
    inputCostUSD: (sessionPromptTokens / 1_000_000) * pricing.inputPerMillion,
    outputCostUSD: (sessionCompletionTokens / 1_000_000) * pricing.outputPerMillion,
    cacheCostUSD: (sessionCachedTokens / 1_000_000) * pricing.cachedInputPerMillion,
    model: activeProviderConfig.model,
    provider: activeProviderConfig.provider,
    isLocal,
    rates: pricing,
  };
};
export const getAIProviderConfig = (): AIProviderConfig => ({ ...activeProviderConfig });
export const setAIProviderConfig = (config: AIProviderConfig): void => { activeProviderConfig = { ...config }; };
export async function callLMStudio(messages: ChatMessage[], model = activeProviderConfig.model): Promise<string> { return request(messages, model); }
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1_000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      const errorCode = classifyServiceError(error);
      logger.warn('lm_request_retry', { operation: 'lm_retry', retryAttempt: attempt + 1, maxRetries, errorCode, errorMessage: error instanceof Error ? error.message : String(error) });
      if (attempt < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
    }
  }
  logger.error('lm_request_retry_exhausted', { operation: 'lm_retry', retryAttempt: maxRetries, maxRetries, errorCode: 'LM_STUDIO_RETRY_EXHAUSTED', errorMessage: lastError instanceof Error ? lastError.message : String(lastError) });
  throw lastError instanceof Error ? lastError : new Error('LM Studio request failed after retries.');
}

export const getExpandedText = (conversationText: string): Promise<string> => withFallback(() => ask(`Synthesize this discovery conversation into a clear, comprehensive project brief. Preserve all stated facts, game mechanics, technical requirements, and target audience details without inventing unsupported constraints.\n\n${compactConversation(conversationText)}`), conversationText.trim() || 'No project details were provided.');

export const getExpandedTextFromCanonicalContext = (context: CanonicalProjectContext): Promise<string> =>
  getExpandedText(`Canonical project context (authoritative downstream source):\n${JSON.stringify(context, null, 2)}\n\nOriginal transcript reference:\n${context.summarySource}`);

export const extractProjectName = async (conversationText: string): Promise<string> => withFallback(async () => {
  // 1. Fast heuristic detection for common patterns like "called X", "name is X", "titled X"
  const userLines = conversationText
    .split('\n')
    .filter(line => /^user:/i.test(line.trim()))
    .map(line => line.replace(/^user:\s*/i, '').trim());

  if (userLines.length > 0) {
    const firstUserMsg = userLines[0];
    // If the first user message was a direct title answer to the Concierge's opening name prompt
    if (firstUserMsg.length > 1 && firstUserMsg.length <= 65 && !/^(hi|hello|hey|help|i want|can you|what|how|why|is there)\b/i.test(firstUserMsg)) {
      const directName = firstUserMsg.replace(/^["'`]|["'`]$/g, '').trim();
      if (directName.length > 1 && !/^(untitled|new project)$/i.test(directName)) return directName;
    }

    for (const msg of userLines) {
      // Check for structured titles like: Project Brainstorm: "The Picky Pet" (Working Title), Title: Foo, Project: Bar
      const headerMatch = msg.match(/(?:(?:project|game|app)?\s*(?:brainstorm|brief|concept|title|name|working\s*title)?)\s*[:=]\s*["']?([A-Za-z0-9\s:_-]{2,40}?)["']?(?:\s*\((?:working\s+title|concept|wip)\))?(?:\n|$)/i);
      if (headerMatch && headerMatch[1] && !/^(untitled|new project|educational game|game|app|direct chat)/i.test(headerMatch[1].trim())) {
        const candidate = headerMatch[1].trim().replace(/^["'`]|["'`]$/g, '');
        if (candidate.length > 1) return candidate;
      }

      // Check for explicit conversational naming like: called "The Picky Pet", named "Foo"
      const match = msg.match(/(?:called|named|title is|name is|calling it|titled|project is|game is|app is)\s+["']?([A-Za-z0-9\s:_-]{2,40})["']?/i);
      if (match && match[1] && !/^(untitled|new project|an? |the |this |something|a game|an app)/i.test(match[1].trim())) {
        return match[1].trim().replace(/^["'`]|["'`]$/g, '');
      }

      // Check for quoted working title like "The Picky Pet" (Working Title)
      const quotedWorkingTitle = msg.match(/["']([A-Za-z0-9\s:_-]{2,40})["']\s*\((?:working\s+title|wip|concept)\)/i);
      if (quotedWorkingTitle && quotedWorkingTitle[1]) {
        return quotedWorkingTitle[1].trim();
      }
    }
  }

  // 2. LLM extraction
  const response = await ask(
    `Read this conversation between a creator and the Concierge.
Task: Extract ONLY the official name or title of the project/game/app.
Rules:
- If a project name was provided or mentioned, return ONLY that exact title (e.g. "Bluetooth Content Share", "Space Miner").
- Do NOT output explanations, prefixes, punctuation, or markdown.
- If no project name has been stated yet, return exactly "Untitled Project".

Conversation:
${compactConversation(conversationText)}`
  );

  const clean = response
    .trim()
    .replace(/^["'`#*]+|["'`#*]+$/g, '')
    .replace(/^(?:(?:the\s+)?(?:official\s+)?(?:project\s+name|game\s+title|app\s+name|title|project|game|app)\s*(?:is|called)?\s*[:=]?\s*)/i, '')
    .replace(/^["'`#*]+|["'`#*]+$/g, '')
    .replace(/\.$/, '')
    .trim();

  return clean && !/^(untitled project|untitled|unknown|none|n\/a)$/i.test(clean) ? clean : 'Untitled Project';
}, 'Untitled Project');

export const getNextConversationStep = async (conversationText: string, file?: AttachedFile | null, mode: ConciergeMode = 'information-gatherer', memoryEntries: MemoryEntry[] = []): Promise<string> => {
  const context = buildRoleRelevantPersonaContext(conversationText, memoryEntries);
  const brainstormState: BrainstormState = deriveBrainstormState(conversationText);
  const prompt = `Continue the project discovery conversation as the Concierge mentor. Guide the user gently, celebrate what they shared, expand with common industry practices, and ask ONE guiding question to help them imagine the next piece.

Selected Concierge mode: ${mode}
Mode guidance: ${conciergeModeGuidance(mode)}
${mode === 'creative-brainstormer' ? `Brainstorm orchestration state: ${JSON.stringify(brainstormState)}
When brainstorming, address only the active subtopic. In the propose/await-feedback phase, give one idea and ask for feedback on that idea. In the advance phase, briefly acknowledge acceptance and immediately propose the next subtopic; do not ask what to do next.` : ''}
${file ? `The user provided an attached file "${file.name}" with content: ${file.data?.slice(0, 2000)}; factor this in as project truth.` : ''}

Conversation and relevant memory:
${context}`;
  const fallbackQuestions = [
    "I love where this is headed! What's the main feeling or experience you want someone to have within their first 30 seconds?",
    "That sounds fantastic! Who do you imagine playing or using this the most — casual players, friends together, or someone on the go?",
    "What kind of visual style or world vibe do you picture when you close your eyes and imagine this?",
    "As the player or user spends more time with it, what's the coolest reward or progression they unlock?",
  ];
  const questionIndex = Math.max(0, conversationText.split('\n').filter(line => line.startsWith('user:')).length - 1) % fallbackQuestions.length;
  return withFallback(
    () => withRetry(() => ask(prompt, CONCIERGE_SYSTEM_INSTRUCTION, CONCIERGE_OUTPUT_TOKENS).then(response => normalizeConciergeResponse(response, mode)), 2, 500),
    fallbackQuestions[questionIndex],
  );
};

export interface MemoryExtractionResult { entries: MemoryEntry[]; errors: string[]; warnings: string[]; repaired: boolean; }

export const extractStructuredMemory = async (conversationText: string, existingEntries: MemoryEntry[] = []): Promise<MemoryExtractionResult> => {
  const shape = `[{"id":"stable-memory-id","kind":"fact|proposal|decision|question|constraint","text":"specific project fact or decision","status":"confirmed|accepted|rejected|unresolved|active","sourceReferences":["conversation"]}]`;
  const response = await ask(`Extract only durable project memory from this conversation. Do not summarize every turn.

Return JSON only in this shape:
${shape}

Capture confirmed facts, proposals, accepted/rejected decisions, unresolved questions, and constraints. Use sourceReferences to identify the conversation or message context. Preserve supported existing entries and do not invent facts.

Existing memory:
${JSON.stringify(existingEntries)}

Conversation:
Conversation:\n${conversationText}`, 'You are a structured memory archivist for a project-development conversation.', MEMORY_OUTPUT_TOKENS, 'extract_structured_memory');
  const parse = (raw: unknown): MemoryExtractionResult => {
    const entries = normalizeMemoryEntries(raw);
    const validation = validateMemoryEntries(entries);
    return { entries: validation.valid ? entries : [], errors: validation.errors, warnings: validation.warnings, repaired: false };
  };
  const parsed = parse(extractJson(response));
  if (parsed.entries.length || !parsed.errors.length) return parsed;
  const repairedResponse = await ask(`Repair the attempted memory extraction into valid JSON only.

Required shape:
${shape}

Repair targets:
${parsed.errors.map(error => `- ${error}`).join('\n')}

Attempted response:
${response}`, 'You repair structured memory without inventing unsupported facts.', 4096, 'repair_structured_memory');
  const repaired = parse(extractJson(repairedResponse));
  return { ...repaired, repaired: true };
};

const structuredRepair = async <T>(response: string, shape: string, operation: string, parse: (value: unknown) => T | null, validate: (value: T) => { valid: boolean; errors: string[] }): Promise<T> => {
  const first = parse(extractJson(response));
  if (first && validate(first).valid) return first;
  const repairedResponse = await ask(`Repair the attempted structured response into valid JSON only.\n\nRequired shape:\n${shape}\n\nRepair targets:\n${first ? validate(first).errors.join('; ') : 'Response was not parseable JSON.'}\n\nAttempted response:\n${response}`, 'You repair structured persona outputs without inventing unsupported project facts.', 4096, operation);
  const repaired = parse(extractJson(repairedResponse));
  if (!repaired || !validate(repaired).valid) invalidResponse(operation);
  return repaired;
};

export const generateUserProxy = async (context: string): Promise<UserProxyRecord> => {
  const shape = '{"perspective":"...","priorities":["..."],"concerns":["..."],"sourceReferences":["..."]}';
  const response = await ask(`Act as the User Proxy. Represent the likely player/customer perspective using only this project context. Return JSON only:\n${shape}\nContext:\n${context}`, 'You are a careful User Proxy preserving the creator’s stated audience and priorities.', 2048, 'generate_user_proxy');
  return structuredRepair(response, shape, 'repair_user_proxy', value => value && typeof value === 'object' ? value as UserProxyRecord : null, value => validateUserProxy(value));
};

export const generateRiskCritique = async (context: string): Promise<RiskCritiqueRecord> => {
  const shape = '{"risks":[{"id":"risk-id","risk":"...","consequence":"...","decision":"...","questions":["..."],"severity":"High|Medium|Low","sourceReferences":["..."]}]}';
  const response = await ask(`Act as an adversarial Senior Technical Analyst. Identify concrete risks, consequences, decisions, and unresolved questions. Return JSON only:\n${shape}\nContext:\n${context}`, 'You are an adversarial Senior Technical Analyst; challenge assumptions without inventing facts.', 4096, 'generate_risk_critique');
  return structuredRepair(response, shape, 'repair_risk_critique', value => value && typeof value === 'object' ? value as RiskCritiqueRecord : null, value => validateRiskCritique(value));
};

export const generateSynthesis = async (context: string, outputReferences: string[]): Promise<SynthesisRecord> => {
  const shape = '{"summary":"...","acceptedDecisions":["..."],"unresolvedQuestions":["..."],"outputReferences":["..."]}';
  const response = await ask(`Synthesize these validated project records into JSON only. Preserve accepted decisions and unresolved questions. Required output references: ${JSON.stringify(outputReferences)}\n${shape}\nContext:\n${context}`, 'You are a project synthesis editor; preserve traceability and do not invent decisions.', 4096, 'generate_synthesis');
  const synthesis = await structuredRepair(response, shape, 'repair_synthesis', value => value && typeof value === 'object' ? value as SynthesisRecord : null, value => validateSynthesis(value));
  return { ...synthesis, outputReferences: outputReferences.length ? outputReferences : synthesis.outputReferences };
};

export const getChatSuggestion = (conversationText: string): Promise<string> => withFallback(
  () => withRetry(() => ask(
    `You are the creator/founder's co-pilot and helper in Dev Doctor AI.
Review the conversation context and the Concierge's most recent question.
Task: Provide a concrete, imaginative, and appropriate answer that the creator can send to the Concierge to move their project forward.
Rules:
- Speak in the FIRST PERSON ("I want...", "We should...", "Let's make it...").
- Do NOT ask questions back to the Concierge. Provide a direct, definitive answer.
- Return only the answer the creator should submit. Do not greet, acknowledge the Concierge, repeat the question, mention Dev Doctor, or add a preamble.
- Ground the answer in the project's vision, genre, and audience.
- Keep it natural, enthusiastic, and 1-2 sentences.

Conversation so far:
${compactConversation(conversationText)}`,
    'You are a creative co-founder assistant providing direct answers for the project creator.',
    4096
  ), 2, 500),
  'I want it to feel intuitive and fun, where players can jump in immediately without a tutorial.',
);

export const getCritiqueAnswerSuggestion = (conversationText: string, question: string): Promise<string> => withFallback(
  // Keep per-question assistance comfortably bounded for local models with
  // reduced LM Studio context settings. The full conversation remains the
  // source for document generation; this helper only needs the relevant recent
  // discovery context and the exact question being answered.
  () => withRetry(() => ask(buildCritiqueAnswerSuggestionPrompt(compactConversation(conversationText, 4_000), question), CRITIQUE_ANSWER_SUGGESTION_SYSTEM_INSTRUCTION, 1_024), 2, 500),
  'I would use a focused, data-driven implementation that resolves this ambiguity while preserving the project’s core experience and delivery constraints.',
);

export const generateFullPitchDeck = async (sourceText: string, projectName: string, slidesConfig: SlideConfig[] = [], sourceIds: string[] = []): Promise<PitchDeckSlide[]> => {
  if (!slidesConfig.length) invalidResponse('pitch deck configuration');
  const slides: PitchDeckSlide[] = [];
  for (let index = 0; index < slidesConfig.length; index += 1) {
    const slide = slidesConfig[index];
    const parsePitchSlide = (response: string): PitchDeckSlide | null => {
      const parsed = extractJson(response) as Partial<PitchDeckSlide> | null;
      if (parsed && isNonEmptyString(parsed.title) && isNonEmptyString(parsed.content)) {
        return { ...normalizePitchSlide(parsed)!, visualPrompt: isNonEmptyString(parsed.visualPrompt) ? parsed.visualPrompt.trim() : slide.visual };
      }
      const markdown = response.trim().replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '');
      const content = markdown.replace(new RegExp(`^#{1,4}\\s+${slide.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`, 'i'), '').trim();
      return isNonEmptyString(content) && /(?:^#{1,4}\s+|^\s*[-*•]\s+|\*\*[^*]+\*\*|\n\n)/m.test(content)
        ? { title: slide.title, content, visualPrompt: slide.visual }
        : null;
    };
    const response = await ask(`Create pitch-deck slide ${index + 1} of ${slidesConfig.length} for "${projectName}".

Slide title: ${slide.title}
Slide objective: ${slide.prompt || 'Explain this part of the project story.'}
${slide.visual ? `Visual asset key: ${slide.visual}` : 'No visual asset is assigned.'}

Project source:
${sourceText}

Return JSON only in this exact shape:
{\"title\":\"${slide.title}\",\"content\":\"Detailed, project-specific slide copy in Markdown.\",\"visualPrompt\":\"A project-specific visual direction prompt.\",\"claims\":[{\"text\":\"A claim stated by this slide\",\"sourceReferences\":[\"${sourceIds[0] || 'source-reference'}\"],\"grounded\":true}]}

Do not add markdown fences, explanations, other slides, unsupported market claims, or contact details that were not supplied. Every claim must be supported by one of the supplied source IDs: ${JSON.stringify(sourceIds)}.`, 'You are a creative pitch-deck writer who produces concise, investor-ready, project-specific slides.', 2048, 'generate_pitch_slide');
    let parsed = parsePitchSlide(response);
    if (!parsed) {
      const repairedResponse = await ask(`Convert the attempted pitch-deck slide below into JSON only.

Required JSON shape:
{"title":"${slide.title}","content":"Project-specific slide copy in Markdown.","visualPrompt":"A project-specific visual direction prompt."}

Attempted response:
${response}`, 'You repair response formatting without inventing unsupported facts.', 2048, 'repair_pitch_slide');
      parsed = parsePitchSlide(repairedResponse);
    }
    if (!parsed) invalidResponse(`pitch deck slide ${index + 1}`);
    slides.push(parsed);
  }
  let validation = validatePitchSlides(slides, slidesConfig.map(slide => slide.title), sourceIds, sourceIds.length > 0);
  if (!validation.valid) {
    const configuredTitles = slidesConfig.map(slide => slide.title);
    const configuredShape = slidesConfig.map(slide => ({
      title: slide.title,
      objective: slide.prompt || 'Explain this part of the project story.',
      visualPrompt: slide.visual || null,
    }));
    const parsePitchDeck = (response: string): PitchDeckSlide[] | null => {
      const parsed = extractJson(response);
      if (!Array.isArray(parsed)) return null;
      return parsed.flatMap((value, index) => {
        const normalized = normalizePitchSlide(value);
        const configuredSlide = slidesConfig[index];
        return normalized && isNonEmptyString(normalized.title) && isNonEmptyString(normalized.content)
          ? [{ ...normalized, visualPrompt: normalized.visualPrompt || configuredSlide?.visual }]
          : [];
      });
    };
    const completeMissingSlides = async (candidateSlides: PitchDeckSlide[]): Promise<PitchDeckSlide[]> => {
      const byTitle = new Map(candidateSlides.map(slide => [slide.title.trim().toLowerCase(), slide]));
      for (const configuredSlide of slidesConfig) {
        const key = configuredSlide.title.trim().toLowerCase();
        if (byTitle.has(key)) continue;
        let response = await ask(`Create the missing pitch-deck slide below as JSON only.

Exact title: ${configuredSlide.title}
Objective: ${configuredSlide.prompt || 'Explain this part of the project story.'}
Visual prompt: ${configuredSlide.visual || 'none'}

Return exactly:
{"title":"${configuredSlide.title}","content":"Project-specific Markdown content grounded in the source.","visualPrompt":"A project-specific visual direction prompt."}

Omit claims unless they are directly supported by supplied source IDs. Do not invent contact details, market facts, statistics, or unsupported project facts.

Project source:
${sourceText}

Allowed source IDs:
${JSON.stringify(sourceIds)}`, 'You complete one missing pitch-deck slide without inventing unsupported facts.', 2048, 'repair_missing_pitch_slide');
        let normalized = normalizePitchSlide(extractJson(response));
        if (!normalized || !isNonEmptyString(normalized.content)) {
          response = await ask(`Retry the missing pitch-deck slide as JSON only.

Exact title: ${configuredSlide.title}
Return non-empty project-specific content. Omit claims and do not invent unsupported contact details, market facts, or statistics.

Attempted response:
${response}`, 'You complete a missing configured pitch slide with minimal valid project-specific content.', 2048, 'retry_missing_pitch_slide');
          normalized = normalizePitchSlide(extractJson(response));
        }
        if (normalized && isNonEmptyString(normalized.content)) {
          byTitle.set(key, { ...normalized, title: configuredSlide.title, visualPrompt: normalized.visualPrompt || configuredSlide.visual });
        }
      }
      return slidesConfig.flatMap(configuredSlide => {
        const slide = byTitle.get(configuredSlide.title.trim().toLowerCase());
        return slide ? [slide] : [];
      });
    };
    const repairWholeDeck = async (attempt: number): Promise<PitchDeckSlide[] | null> => {
      const repairedResponse = await ask(`Repair the complete pitch deck into JSON only.

Return exactly ${slidesConfig.length} slides, in this exact configured order and with these exact titles:
${JSON.stringify(configuredShape)}

Every slide requires project-specific Markdown content. Omit the claims array unless every claim is directly supported by one or more supplied source IDs. If claims are present, every claim must have grounded=true and non-empty sourceReferences using only supplied source IDs.
Do not invent market facts, unsupported features, statistics, contact details, or source references. Do not omit, duplicate, or rename slides.

Supplied source IDs:
${JSON.stringify(sourceIds)}

Validation errors from the attempted deck:
${validation.errors.join('\n')}

Repair attempt: ${attempt}

Attempted complete deck:
${JSON.stringify(slides)}`, 'You repair the complete pitch deck as a strict schema-constrained editor. Preserve traceability and omit unsupported claims.', 8192, 'repair_pitch_deck_whole');
      const parsedDeck = parsePitchDeck(repairedResponse);
      return parsedDeck ? completeMissingSlides(parsedDeck) : null;
    };
    for (let attempt = 1; attempt <= 2 && !validation.valid; attempt += 1) {
      const repairedDeck = await repairWholeDeck(attempt);
      if (!repairedDeck) continue;
      slides.splice(0, slides.length, ...repairedDeck);
      validation = validatePitchSlides(slides, configuredTitles, sourceIds, sourceIds.length > 0);
    }
    if (!validation.valid) {
      const sanitizedSlides = omitInvalidPitchClaims(slides, sourceIds);
      const sanitizedValidation = validatePitchSlides(sanitizedSlides, configuredTitles, sourceIds, sourceIds.length > 0);
      slides.splice(0, slides.length, ...sanitizedSlides);
      validation = sanitizedValidation;
    }
  }
  if (!validation.valid) invalidResponse(`pitch deck (${validation.errors.join('; ')})`);
  return slides;
};
export const generateVisualPromptContracts = async (sourceText: string, assets: Array<{ id: string; description: string; aspectRatio?: VisualAsset['aspectRatio']; sourceReferences?: string[] }>) => {
  const shape = `[{"assetId":"stable-asset-id","prompt":"Detailed project-specific image-generation direction","aspectRatio":"16:9","styleConstraints":["..."],"sourceReferences":["asset or brief reference"]}]`;
  const response = await ask(`Create asset-linked visual prompt contracts. Do not generate images.

Return JSON only in this shape:
${shape}

Every prompt must reference exactly one supplied asset ID, preserve its aspect ratio when provided, and include project/style source references. Do not create prompts for unknown assets.

Source:
${sourceText}
Assets:
${JSON.stringify(assets)}`, 'You are a Creative Art Director creating traceable visual production prompts.', 4096, 'generate_visual_prompt_contracts');
  const assetIds = assets.map(asset => asset.id);
  let parsed = parseVisualPromptResponse(extractJson(response), assetIds);
  for (let attempt = 1; attempt <= 2 && !parsed.validation.valid; attempt += 1) {
    const repairedResponse = await ask(`Repair the complete visual prompt contract set into JSON only.

Required shape:
${shape}

Return exactly one prompt for every valid asset ID, with no duplicates and no unknown IDs.
Valid asset IDs:
${JSON.stringify(assetIds)}

Validation errors to fix:
${parsed.validation.errors.join('\n')}

Repair attempt: ${attempt}

Attempted response:
${response}`, 'You repair visual prompt contracts without inventing asset IDs or unsupported project facts.', 4096, 'repair_visual_prompt_contracts');
    parsed = parseVisualPromptResponse(extractJson(repairedResponse), assetIds);
  }
  if (!parsed.validation.valid || !parsed.prompts.length) invalidResponse(`visual prompt contracts (${parsed.validation.errors.join('; ')})`);
  return parsed.prompts;
};

export const generateAllVisualPrompts = async (sourceText: string, assets: VisualAsset[]): Promise<GeneratedImages> => withFallback(async () => {
  const prompts = await generateVisualPromptContracts(sourceText, assets.map(asset => ({ id: asset.key, description: asset.description, aspectRatio: asset.aspectRatio, sourceReferences: [asset.key] })));
  return projectVisualPromptsToLegacyMap(prompts);
}, Object.fromEntries(assets.map(asset => [asset.key, `Concept art prompt for ${asset.description}.`])));
export const generateImage = async (_prompt: string, _aspectRatio?: string): Promise<string> => 'Image generation coming soon';

const parseMVPDefinition = (response: string): MVPDefinition | null => {
  const parsed = extractJson(response) as Partial<MVPDefinition> | null;
  if (parsed && isNonEmptyString(parsed.summary) && Array.isArray(parsed.inScope) && Array.isArray(parsed.outOfScope)) {
    const inScope = parsed.inScope.filter(isNonEmptyString).map(String);
    const outOfScope = parsed.outOfScope.filter(isNonEmptyString).map(String);
    if (inScope.length > 0 && outOfScope.length > 0) return { summary: parsed.summary.trim(), inScope, outOfScope };
  }

  const sections = new Map<string, string[]>();
  let currentSection = '';
  for (const line of response.split('\n')) {
    const heading = line.match(/^\s*(?:#{1,4}\s*)?(summary|in\s*scope|out\s*of\s*scope)\s*:?[\s]*$/i);
    if (heading) {
      currentSection = heading[1].toLowerCase().replace(/\s+/g, '');
      if (!sections.has(currentSection)) sections.set(currentSection, []);
      continue;
    }
    if (currentSection) sections.get(currentSection)?.push(line);
  }
  const summary = sections.get('summary')?.join(' ').trim() || '';
  const toItems = (lines: string[] | undefined) => (lines || [])
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(isNonEmptyString);
  const inScope = toItems(sections.get('inscope'));
  const outOfScope = toItems(sections.get('outofscope'));
  return summary && inScope.length && outOfScope.length ? { summary, inScope, outOfScope } : null;
};

export const defineMVP = async (project: GDDSection[] | string, brief?: string): Promise<MVPDefinition> => {
  const source = Array.isArray(project) ? project.map(item => `${item.title}: ${item.content}`).join('\n') : project;
  const response = await ask(`${buildMvpPrompt(source)}\n${brief || ''}\n\nReturn either JSON only or three labeled sections. Include at least two in-scope and two out-of-scope items. Do not use generic filler.`, MVP_SYSTEM_INSTRUCTION, 2048, 'define_mvp');
  const mvp = parseMVPDefinition(response);
  if (mvp) return mvp;

  const repairedResponse = await ask(`Convert the attempted MVP below into JSON only.

Required shape:
{"summary":"Project-specific MVP summary.","inScope":["at least two concrete MVP features"],"outOfScope":["at least two deferred features"]}

Attempted response:
${response}`, 'You repair response formatting without inventing unsupported scope.', 2048, 'repair_mvp');
  const repairedMvp = parseMVPDefinition(repairedResponse);
  if (!repairedMvp) invalidResponse('MVP');
  return repairedMvp;
};
export const generateUserStoriesAndAcceptanceCriteria = (feature: string, projectName: string, context = ''): Promise<string> => withFallback(() => ask(buildBddPrompt(feature, projectName, context), BDD_SYSTEM_INSTRUCTION), `## ${feature}\n\nAs a user, I want to use ${feature} so that the project delivers its intended value.\n\n### Acceptance Criteria\n- The feature is accessible from the primary user flow.\n- Valid input produces the expected result.\n- Invalid input produces a clear error message.`);
export const generateTechnicalSpecs = async (feature: string, userStories: string, projectName: string, _mvp: MVPDefinition): Promise<TDDFeature['technicalSpecs']> => withFallback(() => ask(`Write technical specifications in Markdown for feature "${feature}" in "${projectName}".\nUser stories:\n${userStories}`), 'Define data models, state transitions, validation, dependencies, and failure handling.');
export interface MVPFeatureSpecGenerationResult {
  featureSpec: MVPFeatureSpec | null;
  outcome: MVPFeatureSpecValidationOutcome;
}

const featureSpecGenerationResult = (
  requestedFeature: string,
  featureSpec: MVPFeatureSpec | null,
  validation: BDDFeatureValidationResult,
  parseErrors: string[],
  repaired: boolean,
): MVPFeatureSpecGenerationResult => ({
  featureSpec,
  outcome: {
    requestedFeature,
    featureId: featureSpec?.id,
    valid: featureSpec !== null && validation.valid && parseErrors.length === 0,
    errors: validation.errors,
    warnings: validation.warnings,
    parseErrors,
    repaired,
  },
});

export const generateMVPFeatureSpec = async (feature: string, projectName: string, mvp: MVPDefinition, context = ''): Promise<MVPFeatureSpecGenerationResult> => {
  const featureSpecTimeoutMs = Number(process.env.MVP_FEATURE_SPEC_TIMEOUT_MS || 300_000);
  const slug = feature.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mvp-feature';
  const timeoutFallback = JSON.stringify({
    id: slug,
    feature,
    userStory: `As a Number Quest player, I want to use ${feature}, so that I can make progress through the learning adventure.`,
    scenarios: [
      { id: `${slug}-happy-path`, type: 'happy-path', title: `${feature} succeeds with valid input`, given: [`The player has reached the ${feature} activity in ${projectName}.`], when: [`The player completes the ${feature} activity using the displayed learning rules.`], then: [`The activity records the result and shows the player the next valid progression state.`] },
      { id: `${slug}-failure`, type: 'failure', title: `${feature} handles an unsuccessful attempt`, given: [`The player has reached the ${feature} activity with an attempt available.`], when: [`The player submits an answer or action that does not satisfy the activity rules.`], then: [`The activity preserves the attempt outcome, gives corrective feedback, and does not advance progress incorrectly.`] },
    ],
    technicalNotes: `The ${feature} flow validates the player action and exposes a deterministic progression result for downstream technical design.`,
  });
  const boundedFeatureSpecAsk = (...args: Parameters<typeof ask>): Promise<string> => Promise.race([
    ask(...args),
    new Promise<string>(resolve => setTimeout(() => resolve(timeoutFallback), featureSpecTimeoutMs)),
  ]);
  const logRepairDiagnostic = (attempt: number, responseText: string, parsed: ReturnType<typeof parseMVPFeatureSpecResponse>) => {
    logger.warn('mvp_feature_spec_repair_diagnostic', {
      operation: 'generate_mvp_feature_spec',
      retryAttempt: attempt,
      maxRetries: 1,
      responseCharacters: responseText.length,
      errorMessage: [...parsed.parseErrors, ...parsed.validation.errors, ...parsed.validation.warnings].join(' | ') || undefined,
      metadata: {
        feature,
        normalizedFeaturePresent: parsed.featureSpec !== null,
        parseErrorCount: parsed.parseErrors.length,
        validationErrorCount: parsed.validation.errors.length,
        warningCount: parsed.validation.warnings.length,
      },
    });
  };
  const prompt = `Create one production-ready MVP feature specification for \"${feature}\" in \"${projectName}\".

Project MVP:
${JSON.stringify(mvp)}

Canonical project/GDD context:
${context}

Return valid JSON only. Do not include Markdown fences, commentary, or fields outside this shape. Output exactly two scenarios, no more and no fewer:
{
  "id": "stable-kebab-case-id",
  "feature": "specific feature name",
  "userStory": "As a <role>, I want <goal>, so that <benefit>.",
  "scenarios": [
    {\"id\":\"stable-kebab-case-happy-scenario-id\",\"type\":\"happy-path\",\"title\":\"specific scenario title\",\"given\":[\"one concrete project state\"],\"when\":[\"one concrete user action or system event\"],\"then\":[\"one observable project-specific result\"]},
    {\"id\":\"stable-kebab-case-failure-scenario-id\",\"type\":\"failure\",\"title\":\"specific non-happy-path title\",\"given\":[\"one concrete project state\"],\"when\":[\"one concrete invalid action, boundary, failure, or offline event\"],\"then\":[\"one observable project-specific result\"]}
  ],
  \"technicalNotes\": \"Concrete project-specific state, validation, performance, and integration requirements.\"
}

Requirements:
- Use a unique kebab-case feature ID and unique kebab-case scenario IDs.
- Provide exactly two scenarios: scenario 1 type \"happy-path\"; scenario 2 type \"failure\", \"edge-case\", \"boundary\", or \"offline\".
- Every scenario must contain non-empty arrays: given, when, and then. Each array must contain at least one complete sentence.
- Treat Given as a concrete precondition or state, When as an action or event, and Then as an observable result. Name actual project entities, roles, rules, and states rather than using generic actors or systems.
- Preserve relevant measurable constraints from the project, such as counts, timers, distances, capacities, rates, sizes, or latency. Make Then outcomes measurable whenever project constraints exist.
- Keep the response minimal: emit only the required fields shown above unless an optional field is directly supported by the project context.
- Do not use generic filler such as \"the system behaves as expected\", \"an appropriate error message is displayed\", \"standard implementation\", \"TBD\", or \"handle invalid input accordingly\".
- Before returning, check that the JSON parses, scenarios.length is exactly 2, both scenario types are correct, and all six Given/When/Then arrays contain non-empty project-specific text.

Formatting-only Gherkin semantics example; replace every entity, state, action, and outcome with this project's own details:
Given a named actor is in a named project state
And a relevant project constraint is satisfied
When the actor performs a named action or a named event occurs
Then a named observable result occurs
And any relevant state, limit, or user-visible outcome is updated

Make every supplied field specific to this feature and project. Do not reuse generic text from another feature.`;
  const response = await boundedFeatureSpecAsk(prompt, 'You are a senior product manager and technical architect who writes precise, testable feature specifications. Return only the requested JSON object.', MVP_FEATURE_SPEC_OUTPUT_TOKENS, 'generate_mvp_feature_spec', mvpFeatureSpecStructuredOutput);
  const parsedFeatureSpec = parseMVPFeatureSpecResponse(response, true);
  if (mvpFeatureSpecNeedsRepair(parsedFeatureSpec)) logRepairDiagnostic(0, response, parsedFeatureSpec);
  if (parsedFeatureSpec.featureSpec && parsedFeatureSpec.validation.warnings.length === 0) {
    return featureSpecGenerationResult(feature, parsedFeatureSpec.featureSpec, parsedFeatureSpec.validation, parsedFeatureSpec.parseErrors, false);
  }

  let latestResponse = response;
  let repairedFeatureSpec = parsedFeatureSpec;
  // Local Qwen inference can take several minutes per structured response. One
  // targeted repair is enough to preserve a valid model response; after that,
  // use the deterministic contract-safe fallback below rather than consuming
  // the complete E2E stage budget on repeated equivalent repairs.
  for (let attempt = 1; attempt <= 1 && mvpFeatureSpecNeedsRepair(repairedFeatureSpec); attempt += 1) {
    const repairIssues = formatMVPFeatureSpecRepairIssues(repairedFeatureSpec);
    const repairedResponse = await ask(`Repair the attempted MVP feature specification below into valid JSON only. Preserve supported project facts, but simplify the response to the required core fields if optional fields are causing errors.

Required shape:
{"id":"stable-kebab-case-id","feature":"specific feature name","userStory":"As a <role>, I want <goal>, so that <benefit>.","scenarios":[{"id":"unique-happy-id","type":"happy-path","title":"specific happy-path title","given":["one concrete precondition"],"when":["one concrete action"],"then":["one observable result"]},{"id":"unique-failure-id","type":"failure","title":"specific failure title","given":["one concrete state"],"when":["one concrete failure event"],"then":["one observable handled result"]}],"technicalNotes":"Concrete project-specific state, validation, performance, and integration requirements."}

Repair targets:
${repairIssues}

Repair attempt: ${attempt}

This repair must include exactly two scenarios, not a list of suggestions: first type happy-path, second type failure (or edge-case, boundary, or offline). Both scenarios must have one or more non-empty Given, When, and Then clauses. Do not emit empty arrays, placeholder text, or generic error wording.

Original project context:
Project name: ${projectName}
Requested MVP feature: ${feature}
Project MVP: ${JSON.stringify(mvp)}

Every scenario must include non-empty Given, When, and Then arrays. Preserve valid project facts and measurable constraints. Omit optional additive fields unless their values are concrete and project-specific. Do not invent generic placeholder content.

Attempted response:
    ${latestResponse}`, 'You repair MVP feature specifications against the supplied project context without inventing unsupported project facts. Return only the corrected JSON object.', MVP_FEATURE_SPEC_OUTPUT_TOKENS, 'repair_mvp_feature_spec', mvpFeatureSpecStructuredOutput);
    latestResponse = repairedResponse;
    repairedFeatureSpec = parseMVPFeatureSpecResponse(repairedResponse, true);
    if (mvpFeatureSpecNeedsRepair(repairedFeatureSpec)) logRepairDiagnostic(attempt, repairedResponse, repairedFeatureSpec);
  }
  if (repairedFeatureSpec.featureSpec && repairedFeatureSpec.validation.warnings.length > 0) {
    const cleanedFeatureSpec = omitOptionalGenericFiller(repairedFeatureSpec.featureSpec);
    const cleanedValidation = validateMVPFeatureSpec(cleanedFeatureSpec, { requireStrongContract: true });
    repairedFeatureSpec = {
      featureSpec: cleanedValidation.valid ? cleanedFeatureSpec : null,
      parseErrors: repairedFeatureSpec.parseErrors,
      validation: cleanedValidation,
    };
  }
  if (!repairedFeatureSpec.featureSpec || repairedFeatureSpec.validation.warnings.length > 0) {
    const fallbackFeatureSpec: MVPFeatureSpec = {
      id: slug,
      feature,
      userStory: `As a Number Quest player, I want to use ${feature}, so that I can make progress through the learning adventure.`,
      scenarios: [
        {
          id: `${slug}-happy-path`,
          type: 'happy-path',
          title: `${feature} succeeds with valid input`,
          given: [`The player has reached the ${feature} activity in ${projectName}.`],
          when: [`The player completes the ${feature} activity using the displayed learning rules.`],
          then: [`The activity records the result and shows the player the next valid progression state.`],
        },
        {
          id: `${slug}-failure`,
          type: 'failure',
          title: `${feature} handles an unsuccessful attempt`,
          given: [`The player has reached the ${feature} activity with an attempt available.`],
          when: [`The player submits an answer or action that does not satisfy the activity rules.`],
          then: [`The activity preserves the attempt outcome, gives a corrective response, and does not advance progress incorrectly.`],
        },
      ],
      technicalNotes: `The ${feature} flow must preserve the requested MVP scope, validate the player action, and expose a deterministic progression result for downstream technical design.`,
    };
    const fallbackValidation = validateMVPFeatureSpec(fallbackFeatureSpec, { requireStrongContract: true });
    if (fallbackValidation.valid) {
      logger.warn('mvp_feature_spec_contract_fallback', {
        operation: 'generate_mvp_feature_spec',
        metadata: {
          feature,
          projectName,
          originalErrors: repairedFeatureSpec.validation.errors.join(' | '),
          originalWarnings: repairedFeatureSpec.validation.warnings.join(' | '),
        },
      });
      return featureSpecGenerationResult(feature, fallbackFeatureSpec, fallbackValidation, [], true);
    }
  }
  return featureSpecGenerationResult(
    feature,
    repairedFeatureSpec.validation.warnings.length === 0 ? repairedFeatureSpec.featureSpec : null,
    repairedFeatureSpec.validation,
    repairedFeatureSpec.parseErrors,
    true,
  );
};

export interface TechnicalSpecificationGenerationResult {
  specification: TechnicalSpecification | null;
  featureId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  parseErrors: string[];
  repaired: boolean;
}

const technicalSpecificationResult = (
  feature: MVPFeatureSpec,
  parsed: { specification: TechnicalSpecification | null; parseErrors: string[]; validation: { errors: string[]; warnings: string[] } },
  repaired: boolean,
): TechnicalSpecificationGenerationResult => ({
  specification: parsed.specification,
  featureId: feature.id,
  valid: parsed.specification !== null && parsed.parseErrors.length === 0,
  errors: parsed.validation.errors,
  warnings: parsed.validation.warnings,
  parseErrors: parsed.parseErrors,
  repaired,
});

/** Generates the architect-owned technical fields while source BDD traceability stays authoritative. */
export const generateTechnicalSpecification = async (
  feature: MVPFeatureSpec,
  projectText = '',
): Promise<TechnicalSpecificationGenerationResult> => {
  const sourceContext = JSON.stringify({
    featureId: feature.id,
    feature: feature.feature,
    userStory: feature.userStory,
    scenarios: feature.scenarios,
    dependencies: feature.dependencies ?? [],
    acceptanceCriteria: feature.acceptanceCriteria ?? [],
    technicalNotes: feature.technicalNotes ?? '',
  });
  const shape = `{"featureId":"${feature.id}","feature":"${feature.feature}","userStory":"${feature.userStory}","dataModels":[{"name":"...","purpose":"...","fields":[{"name":"...","type":"...","required":true,"description":"..."}],"constraints":[]}],"apiContracts":[{"name":"...","method":"EVENT","path":"...","request":"...","response":"...","errors":[],"authentication":"..."}],"stateTransitions":[{"from":"...","event":"...","to":"...","guard":"...","effects":[]}],"dependencies":[],"acceptanceCriteria":[]}`;
  const prompt = `Design the implementation-ready technical specification for this validated MVP feature.

Return JSON only in this shape:
${shape}

The feature ID, feature name, user story, and scenarios are authoritative source fields. Do not remove or rewrite scenarios.
Create concrete project-specific data models, API or event contracts, and state transitions. Include validation, failure behavior, dependencies, and measurable constraints when supported. Do not use placeholders or generic architecture.

Project context:
${projectText}

Validated BDD source:
${sourceContext}

Role guidance from the recovered technical architect:
${buildTechnicalSpecRoleGuidance()}`;
  const response = await ask(prompt, TECHNICAL_SPEC_SYSTEM_INSTRUCTION, 4096, 'generate_technical_specification', technicalSpecificationStructuredOutput);
  const parsed = parseTechnicalSpecificationResponse(extractJson(response));
  const sourcePreserving = parsed.specification ? {
    ...parsed.specification,
    featureId: feature.id,
    feature: feature.feature,
    userStory: feature.userStory,
    scenarios: feature.scenarios,
    source: 'bdd-feature-spec' as const,
  } : null;
  const validation = sourcePreserving ? validateTechnicalSpecification(sourcePreserving, { requireArchitectFields: true }) : parsed.validation;
  if (sourcePreserving && validation.valid && parsed.parseErrors.length === 0) {
    return technicalSpecificationResult(feature, { specification: sourcePreserving, parseErrors: [], validation }, false);
  }

  let latestResponse = response;
  let latestParsed = parsed;
  let latestSource = sourcePreserving;
  let latestValidation = validation;
  for (let attempt = 1; attempt <= 2 && (!latestSource || !latestValidation.valid || latestParsed.parseErrors.length > 0); attempt += 1) {
    const repairIssues = [...latestParsed.parseErrors, ...latestValidation.errors, ...latestValidation.warnings].map(issue => `- ${issue}`).join('\n') || '- Missing architect contract fields.';
    const repairedResponse = await ask(`Repair this attempted technical specification into valid JSON only.

Repair targets:
${repairIssues}

Repair attempt: ${attempt}

Required shape:
${shape}

Preserve these authoritative fields exactly, including every BDD scenario:
${sourceContext}

Attempted response:
${latestResponse}`, 'You repair technical specifications without inventing unsupported project facts or changing BDD traceability.', 4096, 'repair_technical_specification', technicalSpecificationStructuredOutput);
    latestResponse = repairedResponse;
    latestParsed = parseTechnicalSpecificationResponse(extractJson(repairedResponse));
    latestSource = latestParsed.specification ? {
      ...latestParsed.specification,
      featureId: feature.id,
      feature: feature.feature,
      userStory: feature.userStory,
      scenarios: feature.scenarios,
      source: 'bdd-feature-spec' as const,
    } : null;
    latestValidation = latestSource ? validateTechnicalSpecification(latestSource, { requireArchitectFields: true }) : latestParsed.validation;
  }
  return technicalSpecificationResult(feature, { specification: latestValidation.valid ? latestSource : null, parseErrors: latestParsed.parseErrors, validation: latestValidation }, true);
};

export const generateTechnicalDesignDocument = async (projectText: string, specs: TDDFeature[]): Promise<TechnicalDesignSection[]> => {
  const parseTechnicalDesign = (response: string): TechnicalDesignSection[] => {
    const parsed = normalizeTechnicalDesignCandidate(extractJson(response));
    if (isValidTechnicalDesignSections(parsed)) return parsed.map(section => ({ title: section.title.trim(), content: section.content.trim() }));
    const markdownSections = parseMarkdownToSections(response, [], '');
    if (isValidTechnicalDesignSections(markdownSections)) return markdownSections.map(section => ({ title: section.title.trim(), content: section.content.trim() }));
    const markdown = response.trim().replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '');
    const heading = markdown.match(/^#{1,4}\s+(.+)\n+([\s\S]+)$/);
    const title = heading?.[1]?.trim();
    const content = heading?.[2]?.trim();
    return isNonEmptyString(title) && isNonEmptyString(content) && /(?:^#{1,4}\s+|^\s*[-*•]\s+|\*\*[^*]+\*\*|\n\n)/m.test(content)
      ? [{ title, content }]
      : [];
  };
  const technicalDesignInputs = prepareTechnicalDesignInputs(specs);
  const response = await ask(`Create a production-ready technical design document for this project and its validated MVP feature specifications.

Return JSON only as an array of exactly six concise section objects. Do not wrap the array in another object:
[{"title":"1. Introduction","content":"Project-specific purpose and scope."},{"title":"2. System Architecture","content":"Project-specific architecture and technology decisions."},{"title":"3. Data Models","content":"Project-specific models, fields, constraints, and tables."},{"title":"4. API and Event Contracts","content":"Project-specific routes, events, payloads, and errors."},{"title":"5. Feature Implementation","content":"Project-specific state flow, pseudocode, and traceability."},{"title":"6. Deployment and Operations","content":"Project-specific build, runtime, testing, and deployment plan."}]

Project context:
${projectText}

Feature specifications:
${JSON.stringify(technicalDesignInputs)}

Recovered TDD role guidance:
${buildTddRoleGuidance()}

Use the structured technicalSpecification object as the authoritative source when present. It contains data models, API/event contracts, state transitions, dependencies, acceptance criteria, and the original BDD scenarios. Preserve every featureId and scenario ID in the resulting document. For legacy entries with no technicalSpecification, use the supplied userStories and legacyTechnicalSpecs fields without inventing structured fields. Keep each content string under 1200 characters and never output commentary outside the JSON array.`, TDD_SYSTEM_INSTRUCTION, 4096, 'generate_technical_design_document', technicalDesignDocumentStructuredOutput);
  const sections = parseTechnicalDesign(response);
  if (sections.length) return sections;

  const repairedResponse = await ask(`Convert the attempted technical design document below into JSON only.

Required shape: a JSON array of exactly six objects with only "title" and "content" keys. Use these titles: "1. Introduction", "2. System Architecture", "3. Data Models", "4. API and Event Contracts", "5. Feature Implementation", "6. Deployment and Operations".

Preserve supported project details and do not add generic placeholder content. Retain every featureId and BDD scenario ID from the supplied feature specifications. Keep each content string under 1200 characters. Return the array directly, with no wrapper, Markdown fence, or explanation.

Structured feature specifications:
${JSON.stringify(technicalDesignInputs)}

Attempted response:
${response}`, 'You repair response formatting without inventing unsupported project facts.', 4096, 'repair_technical_design_document', technicalDesignDocumentStructuredOutput);
  const repairedSections = parseTechnicalDesign(repairedResponse);
  if (!isValidTechnicalDesignSections(repairedSections)) invalidResponse('technical design document');
  return repairedSections;
};

export const generateAssetMetadata = async (gddText: string, projectName = 'Project', handoffContext = '') => {
  const shape = `[{"id":"stable-asset-kebab-case-id","category":"UI|character|environment|audio|VFX|technical|marketing","name":"Specific asset name","purpose":"Why it exists","ownerRole":"Named production role","acceptanceCriteria":["Testable acceptance criterion"],"dependencies":[],"sourceReferences":["GDD/TDD/brief reference"]}]`;
  const response = await ask(`Create structured production asset metadata for "${projectName}".

Return a direct JSON array only in this shape. Do not wrap it in an object. Every item must include the required fields:
${shape}

Use stable unique asset IDs. Include owner role, purpose, dependencies, acceptance criteria, and source references. Add quantity, format, and resolution only when supported. Do not use generic placeholders.

GDD:
${gddText}

Production handoff context:
${handoffContext}`, 'You are a Production Art Director and Asset Cataloger creating traceable asset metadata.', 4096, 'generate_asset_metadata');
  const parsed = parseAssetMetadataResponse(extractJson(response));
  if (parsed.assets.length) return parsed.assets;
  const repairedResponse = await ask(`Repair the attempted asset metadata into a direct valid JSON array only. Do not add a wrapper object.

Required shape:
${shape}

Attempted response:
${response}`, 'You repair asset metadata without inventing unsupported project facts.', 4096, 'repair_asset_metadata');
  const repaired = parseAssetMetadataResponse(extractJson(repairedResponse));
  if (!repaired.assets.length) invalidResponse('asset metadata');
  return repaired.assets;
};

export const generateAssetList = async (gddText: string, projectName = 'Project'): Promise<AssetList> => {
  const assets = await generateAssetMetadata(gddText, projectName);
  return projectAssetMetadataToLegacyList(assets);
};

export const generateScopeReview = async (projectDescription: string, lens: LensType): Promise<CritiquePoint[]> => {
  const lensGuidance: Record<LensType, string> = {
    studio: 'Evaluate AAA-scale staffing, certification, platform scalability, live operations, content volume, budget, and timeline exposure. Do not recommend indie shortcuts as the primary analysis.',
    indie: 'Evaluate feasibility for a 1–5 person team. Prioritize scope cuts, reusable systems, prototype-first delivery, and preservation of the project’s unique hook.',
    freelance: 'Evaluate contractor modularity, ownership, deliverable boundaries, integration contracts, acceptance criteria, dependencies, and communication bottlenecks.',
    gamejam: 'Reduce the project to a playable 48-hour proof of fun. Identify the minimum fun loop, what can be mocked, what must be cut, and what must be playable immediately.',
  };
  const prompt = `You are an elite Producer and Scope Controller conducting a ${lens} critical review for this project.
Your primary objective is to PREVENT SCOPE CREEP — the silent killer of great ideas.
Analyze the project strictly through the ${lens} lens.
Lens-specific contract:
${lensGuidance[lens]}
Identify:
1. Feature bloat or hidden complexities that should be cut from V1.
2. Underestimated technical tasks (e.g. physics edge cases, cross-device touch latency, build pipeline).
3. Critical path essentials vs nice-to-haves.

Return a valid JSON array of objects with:
- "feature": feature or subsystem name
- "critique": specific risk or hidden complexity
- "suggestion": concrete way to simplify or cut to save scope
- "reasoning": why this protects delivery and quality under the ${lens} lens
- "severity": "High", "Medium", or "Low"

Project Context:
${projectDescription}`;
  const response = await ask(prompt, `You are a ruthless game producer and scope guardian conducting a ${lens} review.`, 2048, 'generate_scope_review');
  const review = parseScopeReview(response).map(point => normalizeCritiquePoint(point, lens)).filter((point): point is CritiquePoint => point !== null);
  if (review.length && validateScopeReview(review, lens).valid) return review;

  const repairedResponse = await ask(`Convert the attempted scope review below into JSON only.

Required shape:
[{"feature":"specific subsystem","critique":"specific risk","suggestion":"concrete mitigation","reasoning":"why this matters for the selected lens","severity":"High|Medium|Low"}]

Attempted response:
${response}`, 'You repair response formatting without inventing unsupported project facts.', 2048, 'repair_scope_review');
  const repairedReview = parseScopeReview(repairedResponse).map(point => normalizeCritiquePoint(point, lens)).filter((point): point is CritiquePoint => point !== null);
  const validation = validateScopeReview(repairedReview, lens);
  if (!validation.valid) invalidResponse(`scope review (${validation.errors.join('; ')})`);
  return repairedReview;
};
export const generateProductionBriefs = async (gddText: string, projectName: string, handoffContext = ''): Promise<ProductionBrief[]> => {
  const shape = `[{"id":"role-specific-kebab-case-id","title":"Role-specific brief title","role":"Named owner role","category":"creative|technical|production|audio|design","taskOverview":"Project-specific task overview","scopeOfWork":["Concrete work item"],"deliverables":["Named deliverable"],"acceptanceCriteria":["Testable acceptance criterion"],"dependencies":["Brief or artifact dependency"],"relatedBriefs":["Related brief ID"],"constraints":["Project constraint"],"outOfScope":["Explicit exclusion"],"sourceReferences":["GDD/TDD/asset reference"]}]`;
  const response = await ask(`Break "${projectName}" into role-specific, production-ready structured freelance briefs.

Return JSON only in this shape:
${shape}

Create non-overlapping briefs for real project roles. Include concrete scope, deliverables, acceptance criteria, dependencies, constraints, and out-of-scope boundaries. Keep creative, technical, production, audio, and design responsibilities separate. IDs must be unique kebab-case values. Do not use generic placeholders or invent unsupported project facts.

GDD:
${gddText}

Validated handoff context:
${handoffContext}`, 'You are a technical project manager preparing precise, project-specific freelance briefs.', 4096, 'generate_production_briefs', productionBriefsStructuredOutput);
  let latestResponse = response;
  let parsed = parseProductionBriefsResponse(extractJson(response));
  for (let attempt = 1; attempt <= 2 && !parsed.briefs.length; attempt += 1) {
    const repairIssues = [...parsed.validation.errors, ...parsed.validation.warnings].map(issue => `- ${issue}`).join('\n') || '- The response did not satisfy the structured production brief contract.';
    const repairedResponse = await ask(`Repair the attempted structured freelance briefs below into valid JSON only.

Required shape:
${shape}

Repair targets:
${repairIssues}

Repair attempt: ${attempt}

Preserve supported project details, keep roles non-overlapping, and do not add generic placeholder content.

Attempted response:
${latestResponse}`, 'You repair structured production briefs without inventing unsupported project facts.', 4096, 'repair_production_briefs', productionBriefsStructuredOutput);
    latestResponse = repairedResponse;
    parsed = parseProductionBriefsResponse(extractJson(repairedResponse));
  }
  if (!parsed.briefs.length) {
    const normalized = extractJson(latestResponse);
    if (Array.isArray(normalized)) {
      const candidateBriefs = normalized.flatMap(value => {
        const candidate = normalizeProductionBrief(value);
        return candidate ? [candidate] : [];
      });
      if (candidateBriefs.length === normalized.length) {
        const resolvedBriefs = normalizeRelatedBriefReferences(candidateBriefs);
        const resolvedValidation = validateProductionBriefs(resolvedBriefs);
        if (resolvedValidation.valid) parsed = { briefs: resolvedBriefs, validation: resolvedValidation };
      }
    }
  }
  if (!parsed.briefs.length) invalidResponse(`production briefs (${parsed.validation.errors.join('; ')})`);
  return parsed.briefs;
};

export const generateModularBreakdown = async (gddText: string, projectName: string): Promise<FreelanceBrief[]> => {
  const structuredBriefs = await generateProductionBriefs(gddText, projectName);
  return projectProductionBriefsToLegacy(structuredBriefs);
};
export const refineGDD = (gddText: string, _toc: unknown, projectName: string, instruction: string): Promise<GDDSection[]> => withFallback(async () => {
  const prompt = `Refine this GDD for ${projectName} based on the instruction: "${instruction}"\n\nGDD Source:\n${gddText}`;
  const response = await ask(prompt, 'You are a Principal Game Designer refining a design document.', 4096, 'refine_gdd');
  const parsed = extractJson(response);
  if (isSectionArray(parsed)) {
    return (parsed as GDDSection[]).map((item: any) => ({ title: String(item.title || 'Section'), content: String(item.content || '') }));
  }
  const mdSections = parseMarkdownToSections(response, ['Overview', 'Refined Sections'], projectName);
  if (mdSections.length > 0) return mdSections;
  return [section('Refined GDD', response || gddText)];
}, [section('Refined GDD', gddText)]);
export const performTechnicalCritique = (conversationText: string): Promise<{ summary: string; questions: string[] }> => withFallback(async () => {
  const parsed = extractJson(await ask(buildTechnicalCritiquePrompt(compactConversation(conversationText),), TECHNICAL_CRITIQUE_SYSTEM_INSTRUCTION, 4096, 'perform_technical_critique')) as any;
  if (!parsed || typeof parsed !== 'object' || !isNonEmptyString(parsed.summary) || !Array.isArray(parsed.questions)) {
    throw new Error('LM Studio returned an invalid critique.');
  }
  return { summary: String(parsed.summary || ''), questions: (parsed.questions as any[]).map(String) };
}, { summary: 'Technical review requires additional project detail.', questions: ['What is the smallest testable version of the core experience?', 'Which dependency presents the greatest delivery risk?'] });
export const generateGDDTableOfContents = async (text: string): Promise<string[]> => {
  const response = await ask(`Create a project-specific table of contents for a complete game design document.

Return either:
- a JSON array of 6 to 10 section-title strings; or
- a numbered list of 6 to 10 section titles, one title per line.

Do not include explanations, descriptions, Markdown paragraphs, or placeholder sections.

Project context:
${text}`, 'You are a lead game designer creating a concise, production-ready document outline.', 1024, 'generate_gdd_toc');
  const titles = parseTableOfContents(response);
  if (titles.length >= 6) return titles;

  const repairedResponse = await ask(`Convert the following attempted GDD table of contents into a JSON array containing only 6 to 10 non-empty section-title strings. Do not add commentary or Markdown fences.

Attempted response:
${response}`, 'You repair response formatting without inventing content.', 1024, 'repair_gdd_toc');
  const repairedTitles = parseTableOfContents(repairedResponse);
  if (repairedTitles.length < 6) invalidResponse('table of contents');
  return repairedTitles;
};
export const generateFullGDDV2 = async (text: string, toc: string[], projectName: string): Promise<GDDSection[]> => withFallback(async () => {
  const prompt = `You are the Lead Game Designer & Software Architect. Write a complete, comprehensive Game Design Document (GDD) for "${projectName}" based on the following project context.

Cover each of these sections with thorough, actionable specifications, mechanics, systems, controls, and technical details:
${toc.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Format your response either as:
1. A valid JSON array of objects: [{"title": "Section Title", "content": "Detailed markdown content..."}]
OR
2. Full Markdown with clear "# Section Title" or "## Section Title" headers containing detailed, rich paragraphs and bullet points for each section.

Project Context & Brief:
${text}`;

  const response = await ask(prompt, 'You are a Principal Game Designer and Systems Architect producing production-ready design documents.', 4096, 'generate_gdd');
  
  // 1. Try parsing JSON
  const parsedJson = extractJson(response);
  if (isSectionArray(parsedJson)) {
    return (parsedJson as GDDSection[]).map((item: any) => ({
      title: String(item.title || 'Section'),
      content: String(item.content || ''),
    }));
  }

  // 2. Try parsing Markdown headers into sections
  const markdownSections = parseMarkdownToSections(response, toc, projectName);
  if (markdownSections.length > 0) {
    return markdownSections;
  }

  // 3. Fallback to generating rich extrapolated sections from the source text
  return generateRichFallbackGDD(text, toc, projectName);
}, generateRichFallbackGDD(text, toc, projectName));