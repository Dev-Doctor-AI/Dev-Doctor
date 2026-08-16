import {
  MVPFeatureSpec,
  TDDFeature,
  TechnicalApiContract,
  TechnicalDataModel,
  TechnicalSpecification,
  TechnicalSpecificationValidationOutcome,
} from '../types';

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter(nonEmpty).map(item => item.trim()) : [];

const normalizeDataModels = (value: unknown): TechnicalDataModel[] => Array.isArray(value)
  ? value.filter(item => item && typeof item === 'object').map((item: any) => ({
    name: nonEmpty(item.name) ? item.name.trim() : '',
    purpose: nonEmpty(item.purpose) ? item.purpose.trim() : '',
    fields: Array.isArray(item.fields) ? item.fields.filter((field: any) => field && typeof field === 'object').map((field: any) => ({
      name: nonEmpty(field.name) ? field.name.trim() : '',
      type: nonEmpty(field.type) ? field.type.trim() : '',
      required: typeof field.required === 'boolean' ? field.required : undefined,
      description: nonEmpty(field.description) ? field.description.trim() : undefined,
    })) : [],
    constraints: strings(item.constraints),
  }))
  : [];

const normalizeApiContracts = (value: unknown): TechnicalApiContract[] => Array.isArray(value)
  ? value.filter(item => item && typeof item === 'object').map((item: any) => ({
    name: nonEmpty(item.name) ? item.name.trim() : '',
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'EVENT'].includes(item.method) ? item.method : 'EVENT',
    path: nonEmpty(item.path) ? item.path.trim() : '',
    request: nonEmpty(item.request) ? item.request.trim() : undefined,
    response: nonEmpty(item.response) ? item.response.trim() : undefined,
    errors: strings(item.errors),
    authentication: nonEmpty(item.authentication) ? item.authentication.trim() : undefined,
  }))
  : [];

const normalizeTransitions = (value: unknown) => Array.isArray(value)
  ? value.filter(item => item && typeof item === 'object').map((item: any) => ({
    from: nonEmpty(item.from) ? item.from.trim() : '',
    event: nonEmpty(item.event) ? item.event.trim() : '',
    to: nonEmpty(item.to) ? item.to.trim() : '',
    guard: nonEmpty(item.guard) ? item.guard.trim() : undefined,
    effects: strings(item.effects ?? item.sideEffects),
  }))
  : [];

export const normalizeTechnicalSpecification = (value: unknown): TechnicalSpecification | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  return {
    featureId: nonEmpty(source.featureId) ? source.featureId.trim() : '',
    feature: nonEmpty(source.feature) ? source.feature.trim() : '',
    userStory: nonEmpty(source.userStory) ? source.userStory.trim() : '',
    scenarios: Array.isArray(source.scenarios) ? source.scenarios : [],
    dataModels: normalizeDataModels(source.dataModels),
    apiContracts: normalizeApiContracts(source.apiContracts ?? source.APIs),
    stateTransitions: normalizeTransitions(source.stateTransitions),
    dependencies: strings(source.dependencies),
    acceptanceCriteria: strings(source.acceptanceCriteria ?? source.acceptanceSummary),
    source: source.source === 'legacy-tdd' ? 'legacy-tdd' : 'bdd-feature-spec',
  };
};

const unwrapTechnicalSpecification = (value: unknown): unknown => {
  if (Array.isArray(value) && value.length === 1) return unwrapTechnicalSpecification(value[0]);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  for (const key of ['technicalSpecification', 'technical_specification', 'specification', 'result', 'output']) {
    if (source[key] && typeof source[key] === 'object') return unwrapTechnicalSpecification(source[key]);
  }
  return value;
};

export const parseTechnicalSpecificationResponse = (value: unknown): {
  specification: TechnicalSpecification | null;
  parseErrors: string[];
  validation: TechnicalSpecificationValidationOutcome;
} => {
  const specification = normalizeTechnicalSpecification(unwrapTechnicalSpecification(value));
  if (!specification) {
    return { specification: null, parseErrors: ['Response did not contain a technical specification object.'], validation: { valid: false, errors: [], warnings: [] } };
  }
  const validation = validateTechnicalSpecification(specification);
  // Preserve a normalized object alongside its diagnostics so the architect seam can
  // restore source-authoritative BDD fields before applying strict final validation.
  // Callers must still check validation; this does not make invalid output valid.
  return { specification, parseErrors: [], validation };
};

/** Builds the additive Milestone-2 handoff without discarding any BDD scenarios. */
export const assembleTechnicalSpecification = (feature: MVPFeatureSpec): TechnicalSpecification => ({
  featureId: feature.id.trim(),
  feature: feature.feature.trim(),
  userStory: feature.userStory.trim(),
  scenarios: feature.scenarios,
  dataModels: [],
  apiContracts: [],
  stateTransitions: [],
  dependencies: feature.dependencies?.filter(nonEmpty).map(value => value.trim()) ?? [],
  acceptanceCriteria: feature.acceptanceCriteria?.filter(nonEmpty).map(value => value.trim()) ?? [],
  source: 'bdd-feature-spec',
});

/** Validates the foundation before an architect prompt or TDD assembler consumes it. */
export const validateTechnicalSpecification = (
  value: unknown,
  options: { requireArchitectFields?: boolean } = {},
): TechnicalSpecificationValidationOutcome => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const specification = value as Partial<TechnicalSpecification> | null;

  if (!specification || typeof specification !== 'object') {
    return { valid: false, errors: ['Technical specification must be an object.'], warnings };
  }
  if (!nonEmpty(specification.featureId)) errors.push('Technical specification requires a feature ID.');
  if (!nonEmpty(specification.feature)) errors.push('Technical specification requires a feature name.');
  if (!nonEmpty(specification.userStory)) errors.push('Technical specification requires a user story.');
  if (!Array.isArray(specification.scenarios) || specification.scenarios.length === 0) {
    errors.push('Technical specification must retain at least one BDD scenario.');
  }
  for (const [index, scenario] of (specification.scenarios ?? []).entries()) {
    if (!scenario?.id) warnings.push(`Scenario ${index + 1} has no stable scenario ID.`);
  }
  if (!Array.isArray(specification.dataModels)) errors.push('Data models must be an array.');
  if (!Array.isArray(specification.apiContracts)) errors.push('API contracts must be an array.');
  if (!Array.isArray(specification.stateTransitions)) errors.push('State transitions must be an array.');
  if (!Array.isArray(specification.dependencies)) errors.push('Dependencies must be an array.');
  if (!Array.isArray(specification.acceptanceCriteria)) errors.push('Acceptance criteria must be an array.');

  for (const [index, model] of (specification.dataModels ?? []).entries()) {
    if (!nonEmpty(model?.name)) errors.push(`Data model ${index + 1} requires a name.`);
    if (!nonEmpty(model?.purpose)) errors.push(`Data model ${index + 1} requires a purpose.`);
    if (!Array.isArray(model?.fields) || model.fields.length === 0) errors.push(`Data model ${index + 1} requires fields.`);
  }
  for (const [index, api] of (specification.apiContracts ?? []).entries()) {
    if (!nonEmpty(api?.name) || !nonEmpty(api?.path)) errors.push(`API contract ${index + 1} requires a name and path.`);
  }
  for (const [index, transition] of (specification.stateTransitions ?? []).entries()) {
    if (!nonEmpty(transition?.from) || !nonEmpty(transition?.event) || !nonEmpty(transition?.to)) errors.push(`State transition ${index + 1} requires from, event, and to.`);
  }
  if (options.requireArchitectFields) {
    if (!specification.dataModels?.length) errors.push('Architect response must contain at least one data model.');
    if (!specification.apiContracts?.length) errors.push('Architect response must contain at least one API contract or event.');
    if (!specification.stateTransitions?.length) errors.push('Architect response must contain at least one state transition.');
  }

  return { featureId: specification.featureId, valid: errors.length === 0, errors, warnings };
};

export interface TechnicalSpecificationCollectionValidationOutcome {
  valid: boolean;
  errors: string[];
  warnings: string[];
  featureIds: string[];
  scenarioIds: string[];
}

/** Validates cross-feature traceability before structured TDD assembly. */
export const validateTechnicalSpecificationCollection = (
  specifications: unknown,
  options: { requireArchitectFields?: boolean } = {},
): TechnicalSpecificationCollectionValidationOutcome => {
  if (!Array.isArray(specifications)) {
    return { valid: false, errors: ['Technical specifications must be an array.'], warnings: [], featureIds: [], scenarioIds: [] };
  }
  const errors: string[] = [];
  const warnings: string[] = [];
  const featureIds: string[] = [];
  const scenarioIds: string[] = [];
  const seenFeatures = new Set<string>();
  const seenScenarios = new Set<string>();

  specifications.forEach((specification, index) => {
    const result = validateTechnicalSpecification(specification, options);
    const label = `Technical specification ${index + 1}`;
    errors.push(...result.errors.map(error => `${label}: ${error}`));
    warnings.push(...result.warnings.map(warning => `${label}: ${warning}`));
    const featureId = (specification as Partial<TechnicalSpecification> | null)?.featureId;
    if (nonEmpty(featureId)) {
      const normalizedFeatureId = featureId.trim().toLowerCase();
      featureIds.push(featureId.trim());
      if (seenFeatures.has(normalizedFeatureId)) errors.push(`${label} duplicates feature ID "${featureId.trim()}".`);
      seenFeatures.add(normalizedFeatureId);
    }
    const scenarios = (specification as Partial<TechnicalSpecification> | null)?.scenarios;
    if (!Array.isArray(scenarios)) return;
    for (const [scenarioIndex, scenario] of scenarios.entries()) {
      if (!nonEmpty(scenario?.id)) continue;
      const scenarioId = scenario.id.trim();
      const normalizedScenarioId = scenarioId.toLowerCase();
      scenarioIds.push(scenarioId);
      if (seenScenarios.has(normalizedScenarioId)) {
        errors.push(`${label} duplicates scenario ID "${scenarioId}" across the technical specification collection.`);
      }
      seenScenarios.add(normalizedScenarioId);
      if (scenarios.slice(0, scenarioIndex).some(previous => nonEmpty(previous?.id) && previous.id.trim().toLowerCase() === normalizedScenarioId)) {
        errors.push(`${label} duplicates scenario ID "${scenarioId}" within the feature.`);
      }
    }
  });

  return { valid: errors.length === 0, errors, warnings, featureIds, scenarioIds };
};

/** Creates the compatibility bridge used by the current TDD viewer and generator. */
export const assembleTDDFeature = (feature: MVPFeatureSpec): TDDFeature => {
  const technicalSpecification = assembleTechnicalSpecification(feature);
  return {
    featureId: feature.id,
    feature: feature.feature,
    userStories: feature.userStory,
    technicalSpecs: feature.technicalNotes ?? '',
    technicalSpecification,
  };
};

export interface TDDAssemblyResult {
  tddFeature: TDDFeature | null;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Attaches a validated architect result while retaining the legacy TDD bridge fields. */
export const assembleValidatedTDDFeature = (
  feature: MVPFeatureSpec,
  technicalSpecification: TechnicalSpecification | null | undefined,
): TDDAssemblyResult => {
  if (!technicalSpecification) {
    return { tddFeature: null, valid: false, errors: [`${feature.feature}: technical specification is missing.`], warnings: [] };
  }
  const validation = validateTechnicalSpecification(technicalSpecification, { requireArchitectFields: true });
  if (!validation.valid || technicalSpecification.featureId !== feature.id) {
    const errors = [...validation.errors];
    if (technicalSpecification.featureId !== feature.id) errors.push(`${feature.feature}: technical specification feature ID does not match the MVP feature.`);
    return { tddFeature: null, valid: false, errors, warnings: validation.warnings };
  }
  return {
    tddFeature: {
      featureId: feature.id,
      feature: feature.feature,
      userStories: feature.userStory,
      technicalSpecs: feature.technicalNotes ?? '',
      technicalSpecification,
    },
    valid: true,
    errors: [],
    warnings: validation.warnings,
  };
};

export const assembleValidatedTDDFeatures = (
  features: MVPFeatureSpec[],
  technicalSpecifications: Array<TechnicalSpecification | null | undefined>,
): { tddFeatures: TDDFeature[]; valid: boolean; errors: string[]; warnings: string[] } => {
  const results = features.map((feature, index) => assembleValidatedTDDFeature(feature, technicalSpecifications[index]));
  const collectionValidation = validateTechnicalSpecificationCollection(technicalSpecifications, { requireArchitectFields: true });
  return {
    tddFeatures: results.flatMap(result => result.tddFeature ? [result.tddFeature] : []),
    valid: results.every(result => result.valid) && collectionValidation.valid,
    errors: [...results.flatMap(result => result.errors), ...collectionValidation.errors],
    warnings: [...results.flatMap(result => result.warnings), ...collectionValidation.warnings],
  };
};

/** Stable, prompt-safe projection for final TDD assembly. Structured data is preferred;
 * legacy fields remain available for saved projects created before Milestone 2. */
export const prepareTechnicalDesignInputs = (features: TDDFeature[]) => features.map(feature => ({
  featureId: feature.featureId,
  feature: feature.feature,
  userStories: feature.userStories,
  scenarios: feature.technicalSpecification?.scenarios ?? [],
  technicalSpecification: feature.technicalSpecification ?? null,
  legacyTechnicalSpecs: feature.technicalSpecs,
}));
