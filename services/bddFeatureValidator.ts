import { BDDScenario, BDDScenarioType, MVPFeatureSpec } from '../types';

export interface BDDFeatureValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ParsedMVPFeatureSpecResult {
  featureSpec: MVPFeatureSpec | null;
  parseErrors: string[];
  validation: BDDFeatureValidationResult;
}

export const mvpFeatureSpecNeedsRepair = (parsed: ParsedMVPFeatureSpecResult): boolean =>
  parsed.featureSpec === null || parsed.parseErrors.length > 0 || parsed.validation.warnings.length > 0;

export const formatMVPFeatureSpecRepairIssues = (parsed: ParsedMVPFeatureSpecResult): string =>
  [...parsed.parseErrors, ...parsed.validation.errors, ...parsed.validation.warnings]
    .map(issue => `- ${issue}`).join('\n') || '- The response did not satisfy the MVP feature specification contract.';

const GENERIC_FILLER_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /\bthe user can use the feature\b/i, description: '"the user can use the feature"' },
  { pattern: /\bthe system behaves as expected\b/i, description: '"the system behaves as expected"' },
  { pattern: /\bappropriate error message\b/i, description: '"appropriate error message"' },
  { pattern: /\bstandard implementation\b/i, description: '"standard implementation"' },
  { pattern: /\bTBD\b/i, description: '"TBD"' },
  { pattern: /\bdefine the feature\b/i, description: '"define the feature"' },
  { pattern: /\bhandle invalid input accordingly\b/i, description: '"handle invalid input accordingly"' },
];

const containsGenericFiller = (value: string): boolean => GENERIC_FILLER_PATTERNS.some(({ pattern }) => pattern.test(value));

/**
 * Omits unsupported generic filler only from optional additive fields. Required BDD
 * source fields are preserved verbatim so strict validation can continue to reject them.
 */
export const omitOptionalGenericFiller = (featureSpec: MVPFeatureSpec): MVPFeatureSpec => {
  const cleanOptionalArray = (values?: string[]): string[] | undefined => {
    const cleaned = values?.filter(value => !containsGenericFiller(value));
    return cleaned?.length ? cleaned : undefined;
  };
  return {
    ...featureSpec,
    scenarios: featureSpec.scenarios.map(scenario => ({
      ...scenario,
      notes: scenario.notes && !containsGenericFiller(scenario.notes) ? scenario.notes : undefined,
    })),
    invalidInputs: cleanOptionalArray(featureSpec.invalidInputs),
    boundaryConditions: cleanOptionalArray(featureSpec.boundaryConditions),
    offlineBehavior: featureSpec.offlineBehavior && !containsGenericFiller(featureSpec.offlineBehavior) ? featureSpec.offlineBehavior : undefined,
    accessibility: cleanOptionalArray(featureSpec.accessibility),
    acceptanceCriteria: cleanOptionalArray(featureSpec.acceptanceCriteria),
    failureStates: cleanOptionalArray(featureSpec.failureStates),
    telemetry: cleanOptionalArray(featureSpec.telemetry),
    securityConsiderations: cleanOptionalArray(featureSpec.securityConsiderations),
    performanceTargets: cleanOptionalArray(featureSpec.performanceTargets),
    dependencies: cleanOptionalArray(featureSpec.dependencies),
  };
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasNonEmptyClauses = (value: unknown): value is string[] =>
  Array.isArray(value) && value.some(isNonEmptyString);

const SCENARIO_TYPES: BDDScenarioType[] = ['happy-path', 'edge-case', 'failure', 'boundary', 'offline'];

const normaliseStringArray = (value: unknown): string[] | undefined => {
  const source = Array.isArray(value) ? value : isNonEmptyString(value) ? [value] : [];
  const values = source.filter(isNonEmptyString).map(value => value.trim());
  return values.length ? values : undefined;
};

const readScenarioField = (scenario: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (scenario[key] !== undefined) return scenario[key];
    const match = Object.keys(scenario).find(candidate => candidate.toLowerCase() === key.toLowerCase());
    if (match) return scenario[match];
  }
  return undefined;
};

const normaliseScenario = (value: unknown): BDDScenario | null => {
  if (!value || typeof value !== 'object') return null;
  const scenario = value as Record<string, unknown>;
  const given = normaliseStringArray(readScenarioField(scenario, 'given', 'precondition', 'preconditions'));
  const when = normaliseStringArray(readScenarioField(scenario, 'when', 'action', 'event'));
  const then = normaliseStringArray(readScenarioField(scenario, 'then', 'expectedResult', 'expectedOutcome', 'outcome', 'result'));
  if (!given || !when || !then) return null;

  const rawType = readScenarioField(scenario, 'type', 'scenarioType', 'kind');
  const normalizedType = isNonEmptyString(rawType) ? rawType.trim().toLowerCase().replace(/[_\s]+/g, '-') : '';
  const type = SCENARIO_TYPES.includes(normalizedType as BDDScenarioType)
    ? normalizedType as BDDScenarioType
    : undefined;
  return {
    id: isNonEmptyString(readScenarioField(scenario, 'id', 'scenarioId')) ? String(readScenarioField(scenario, 'id', 'scenarioId')).trim() : undefined,
    type,
    title: isNonEmptyString(readScenarioField(scenario, 'title', 'scenarioTitle', 'name')) ? String(readScenarioField(scenario, 'title', 'scenarioTitle', 'name')).trim() : undefined,
    given,
    when,
    then,
    notes: isNonEmptyString(readScenarioField(scenario, 'notes', 'note')) ? String(readScenarioField(scenario, 'notes', 'note')).trim() : undefined,
  };
};

/** Normalizes known MVP feature fields without changing valid legacy data. */
export const normalizeMVPFeatureSpec = (value: unknown): { featureSpec: MVPFeatureSpec | null; warnings: string[] } => {
  const warnings: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { featureSpec: null, warnings };
  }

  const source = value as Partial<MVPFeatureSpec>;
  const sourceScenarios = Array.isArray(source.scenarios) ? source.scenarios : [];
  const scenarios = sourceScenarios.flatMap((scenario, index) => {
    const normalized = normaliseScenario(scenario);
    if (!normalized) warnings.push(`Dropped malformed scenario ${index + 1}; Given, When, and Then each require a non-empty clause.`);
    return normalized ? [normalized] : [];
  });

  return {
    featureSpec: {
      id: isNonEmptyString(source.id) ? source.id.trim() : '',
      feature: isNonEmptyString(source.feature) ? source.feature.trim() : '',
      userStory: isNonEmptyString(source.userStory) ? source.userStory.trim() : '',
      scenarios,
      invalidInputs: normaliseStringArray(source.invalidInputs),
      boundaryConditions: normaliseStringArray(source.boundaryConditions),
      offlineBehavior: isNonEmptyString(source.offlineBehavior) ? source.offlineBehavior.trim() : undefined,
      accessibility: normaliseStringArray(source.accessibility),
      acceptanceCriteria: normaliseStringArray(source.acceptanceCriteria),
      failureStates: normaliseStringArray(source.failureStates),
      telemetry: normaliseStringArray(source.telemetry),
      securityConsiderations: normaliseStringArray(source.securityConsiderations),
      performanceTargets: normaliseStringArray(source.performanceTargets),
      technicalNotes: isNonEmptyString(source.technicalNotes) ? source.technicalNotes.trim() : undefined,
      dependencies: normaliseStringArray(source.dependencies),
    },
    warnings,
  };
};

const collectStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (!value || typeof value !== 'object') return [];

  return Object.values(value).flatMap(collectStrings);
};

const addGenericFillerWarnings = (value: unknown, warnings: string[], context: string): void => {
  for (const text of collectStrings(value)) {
    for (const { pattern, description } of GENERIC_FILLER_PATTERNS) {
      if (pattern.test(text)) {
        warnings.push(`${context} contains generic filler ${description}.`);
      }
    }
  }
};

/**
 * Validates the current baseline BDD feature contract without enforcing future P1.4/P1.5
 * requirements such as scenario categories or a minimum of two scenarios.
 */
export const validateMVPFeatureSpec = (featureSpec: unknown, options: { requireStrongContract?: boolean } = {}): BDDFeatureValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const spec = featureSpec as Partial<MVPFeatureSpec> | null;

  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['Feature specification must be an object.'], warnings };
  }

  if (!isNonEmptyString(spec.id)) errors.push('Feature specification is missing a non-empty ID.');
  if (!isNonEmptyString(spec.feature)) errors.push('Feature specification is missing a non-empty feature name.');
  if (!isNonEmptyString(spec.userStory)) errors.push('Feature specification is missing a non-empty user story.');
  if (!isNonEmptyString(spec.technicalNotes)) errors.push('Feature specification is missing non-empty technical notes.');

  if (!Array.isArray(spec.scenarios) || spec.scenarios.length === 0) {
    errors.push('Feature specification must contain at least one scenario.');
  } else {
    const scenarioIds = new Set<string>();

    spec.scenarios.forEach((scenario, index) => {
      const scenarioLabel = `Scenario ${index + 1}`;
      if (!scenario || typeof scenario !== 'object') {
        errors.push(`${scenarioLabel} must be an object.`);
        return;
      }

      if (!hasNonEmptyClauses(scenario.given)) errors.push(`${scenarioLabel} is missing a non-empty Given clause.`);
      if (!hasNonEmptyClauses(scenario.when)) errors.push(`${scenarioLabel} is missing a non-empty When clause.`);
      if (!hasNonEmptyClauses(scenario.then)) errors.push(`${scenarioLabel} is missing a non-empty Then clause.`);

      if (isNonEmptyString(scenario.id)) {
        const normalizedId = scenario.id.trim().toLowerCase();
        if (scenarioIds.has(normalizedId)) {
          errors.push(`${scenarioLabel} duplicates scenario ID "${scenario.id.trim()}".`);
        }
        scenarioIds.add(normalizedId);
      }
    });

    if (options.requireStrongContract) {
      if (spec.scenarios.length !== 2) errors.push('Feature specification must contain exactly two scenarios.');
      const scenarioTypes = spec.scenarios.map(scenario => scenario?.type);
      if (!scenarioTypes.includes('happy-path')) errors.push('Feature specification must contain a happy-path scenario.');
      if (!scenarioTypes.some(type => type === 'edge-case' || type === 'failure' || type === 'boundary' || type === 'offline')) {
        errors.push('Feature specification must contain a non-happy-path scenario of type edge-case, failure, boundary, or offline.');
      }
    }
  }

  addGenericFillerWarnings(spec, warnings, 'Feature specification');
  return { valid: errors.length === 0, errors, warnings };
};

const extractFeatureSpecJson = (response: string): unknown => {
  const clean = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const candidates = [clean, clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1)];
  for (const candidate of candidates) {
    if (candidate.length > 1) {
      try { return JSON.parse(candidate); } catch { /* Try the next supported response boundary. */ }
    }
  }
  return null;
};

/** Parses model output into the MVP schema while retaining repair-targeting diagnostics. */
export const parseMVPFeatureSpecResponse = (response: string, requireStrongContract = false): ParsedMVPFeatureSpecResult => {
  const parsed = extractFeatureSpecJson(response);
  if (parsed === null) {
    return {
      featureSpec: null,
      parseErrors: ['Response did not contain a parseable JSON object.'],
      validation: { valid: false, errors: [], warnings: [] },
    };
  }

  const normalized = normalizeMVPFeatureSpec(parsed);
  if (!normalized.featureSpec) {
    return {
      featureSpec: null,
      parseErrors: [],
      validation: { valid: false, errors: ['Feature specification must be a JSON object.'], warnings: normalized.warnings },
    };
  }

  const validation = validateMVPFeatureSpec(normalized.featureSpec, { requireStrongContract });
  validation.warnings.unshift(...normalized.warnings);
  return { featureSpec: validation.valid ? normalized.featureSpec : null, parseErrors: [], validation };
};

/**
 * Validates a feature collection and detects duplicate feature IDs in addition to each
 * feature's baseline BDD contract. This does not mutate, normalize, or reject pipeline data.
 */
export const validateMVPFeatureSpecs = (featureSpecs: unknown, options: { requireStrongContract?: boolean } = {}): BDDFeatureValidationResult => {
  if (!Array.isArray(featureSpecs)) {
    return { valid: false, errors: ['Feature specifications must be an array.'], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const featureIds = new Set<string>();

  featureSpecs.forEach((featureSpec, index) => {
    const result = validateMVPFeatureSpec(featureSpec, options);
    const featureLabel = `Feature ${index + 1}`;
    errors.push(...result.errors.map(error => `${featureLabel}: ${error}`));
    warnings.push(...result.warnings.map(warning => `${featureLabel}: ${warning}`));

    const id = (featureSpec as Partial<MVPFeatureSpec> | null)?.id;
    if (isNonEmptyString(id)) {
      const normalizedId = id.trim().toLowerCase();
      if (featureIds.has(normalizedId)) errors.push(`${featureLabel} duplicates feature ID "${id.trim()}".`);
      featureIds.add(normalizedId);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
};