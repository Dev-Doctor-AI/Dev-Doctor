import {
  AssetMetadata,
  ProductionBrief,
  ProductionBriefCategory,
  VisualPromptContract,
} from '../types';

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter(nonEmpty).map(value => value.trim()) : [];
const categories: ProductionBriefCategory[] = ['creative', 'technical', 'production', 'audio', 'design'];

export interface ProductionHandoffValidationOutcome {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const normalizeProductionBrief = (value: unknown): ProductionBrief | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  return {
    id: nonEmpty(source.id) ? source.id.trim() : '',
    title: nonEmpty(source.title) ? source.title.trim() : '',
    role: nonEmpty(source.role) ? source.role.trim() : '',
    category: categories.includes(source.category) ? source.category : 'production',
    taskOverview: nonEmpty(source.taskOverview) ? source.taskOverview.trim() : '',
    scopeOfWork: strings(source.scopeOfWork),
    deliverables: strings(source.deliverables),
    acceptanceCriteria: strings(source.acceptanceCriteria),
    dependencies: strings(source.dependencies),
    relatedBriefs: strings(source.relatedBriefs),
    constraints: strings(source.constraints),
    outOfScope: strings(source.outOfScope),
    sourceReferences: strings(source.sourceReferences),
  };
};

export const normalizeAssetMetadata = (value: unknown): AssetMetadata | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  return {
    id: nonEmpty(source.id) ? source.id.trim() : '',
    category: nonEmpty(source.category) ? source.category.trim() : '',
    name: nonEmpty(source.name) ? source.name.trim() : '',
    purpose: nonEmpty(source.purpose) ? source.purpose.trim() : '',
    quantity: nonEmpty(source.quantity) ? source.quantity.trim() : undefined,
    format: nonEmpty(source.format) ? source.format.trim() : undefined,
    resolution: nonEmpty(source.resolution) ? source.resolution.trim() : undefined,
    dependencies: strings(source.dependencies),
    ownerRole: nonEmpty(source.ownerRole) ? source.ownerRole.trim() : '',
    acceptanceCriteria: strings(source.acceptanceCriteria),
    sourceReferences: strings(source.sourceReferences),
  };
};

export const normalizeVisualPrompt = (value: unknown): VisualPromptContract | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  return {
    assetId: nonEmpty(source.assetId) ? source.assetId.trim() : '',
    prompt: nonEmpty(source.prompt) ? source.prompt.trim() : '',
    aspectRatio: ratios.includes(source.aspectRatio) ? source.aspectRatio : undefined,
    styleConstraints: strings(source.styleConstraints),
    sourceReferences: strings(source.sourceReferences),
  };
};

export const validateProductionBrief = (value: unknown): ProductionHandoffValidationOutcome => {
  const brief = normalizeProductionBrief(value);
  if (!brief) return { valid: false, errors: ['Production brief must be an object.'], warnings: [] };
  const errors: string[] = [];
  if (!nonEmpty(brief.id)) errors.push('Production brief requires an ID.');
  if (!nonEmpty(brief.title)) errors.push('Production brief requires a title.');
  if (!nonEmpty(brief.role)) errors.push('Production brief requires an owner role.');
  if (!nonEmpty(brief.taskOverview)) errors.push('Production brief requires a task overview.');
  if (!brief.scopeOfWork.length) errors.push('Production brief requires scope of work.');
  if (!brief.deliverables.length) errors.push('Production brief requires deliverables.');
  if (!brief.acceptanceCriteria.length) errors.push('Production brief requires acceptance criteria.');
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const validateProductionBriefs = (values: unknown): ProductionHandoffValidationOutcome => {
  if (!Array.isArray(values)) return { valid: false, errors: ['Production briefs must be an array.'], warnings: [] };
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const roles = new Set<string>();
  values.forEach((value, index) => {
    const result = validateProductionBrief(value);
    errors.push(...result.errors.map(error => `Brief ${index + 1}: ${error}`));
    const brief = normalizeProductionBrief(value);
    if (!brief) return;
    if (ids.has(brief.id.toLowerCase())) errors.push(`Brief ${index + 1} duplicates brief ID "${brief.id}".`);
    ids.add(brief.id.toLowerCase());
    for (const relatedBrief of brief.relatedBriefs) {
      if (!values.some(candidate => normalizeProductionBrief(candidate)?.id.toLowerCase() === relatedBrief.toLowerCase())) {
        errors.push(`Brief ${index + 1} references unknown related brief ID "${relatedBrief}".`);
      }
    }
    const role = brief.role.toLowerCase();
    if (roles.has(role)) warnings.push(`Role "${brief.role}" appears in multiple briefs; verify responsibilities do not overlap.`);
    roles.add(role);
    if (brief.category === 'creative' && brief.outOfScope.length === 0) warnings.push(`Brief ${index + 1} should define creative out-of-scope work.`);
  });
  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Resolves optional human-readable related-brief titles to existing IDs and omits
 * unresolved references. It never creates a brief or changes required handoff fields.
 */
export const normalizeRelatedBriefReferences = (briefs: ProductionBrief[]): ProductionBrief[] => {
  const references = new Map<string, string>();
  for (const brief of briefs) {
    references.set(brief.id.trim().toLowerCase(), brief.id);
    references.set(brief.title.trim().toLowerCase(), brief.id);
  }
  return briefs.map(brief => ({
    ...brief,
    relatedBriefs: [...new Set(brief.relatedBriefs.flatMap(reference => {
      const resolved = references.get(reference.trim().toLowerCase());
      return resolved && resolved.toLowerCase() !== brief.id.toLowerCase() ? [resolved] : [];
    }))],
  }));
};

export const parseProductionBriefsResponse = (value: unknown): {
  briefs: ProductionBrief[];
  validation: ProductionHandoffValidationOutcome;
} => {
  if (!Array.isArray(value)) {
    return { briefs: [], validation: { valid: false, errors: ['Production brief response must be an array.'], warnings: [] } };
  }
  const briefs = value.flatMap(item => {
    const brief = normalizeProductionBrief(item);
    return brief ? [brief] : [];
  });
  const validation = validateProductionBriefs(briefs);
  if (briefs.length !== value.length) {
    validation.valid = false;
    validation.errors.push('Production brief response contained malformed entries.');
  }
  return { briefs: validation.valid ? briefs : [], validation };
};

export const validateAssetMetadata = (value: unknown): ProductionHandoffValidationOutcome => {
  const asset = normalizeAssetMetadata(value);
  if (!asset) return { valid: false, errors: ['Asset metadata must be an object.'], warnings: [] };
  const errors: string[] = [];
  if (!nonEmpty(asset.id)) errors.push('Asset metadata requires an ID.');
  if (!nonEmpty(asset.category)) errors.push('Asset metadata requires a category.');
  if (!nonEmpty(asset.name)) errors.push('Asset metadata requires a name.');
  if (!nonEmpty(asset.purpose)) errors.push('Asset metadata requires a purpose.');
  if (!nonEmpty(asset.ownerRole)) errors.push('Asset metadata requires an owner role.');
  if (!asset.acceptanceCriteria.length) errors.push('Asset metadata requires acceptance criteria.');
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const validateAssetMetadataCollection = (values: unknown): ProductionHandoffValidationOutcome => {
  if (!Array.isArray(values)) return { valid: false, errors: ['Asset metadata must be an array.'], warnings: [] };
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  values.forEach((value, index) => {
    const result = validateAssetMetadata(value);
    errors.push(...result.errors.map(error => `Asset ${index + 1}: ${error}`));
    const asset = normalizeAssetMetadata(value);
    if (!asset) return;
    if (ids.has(asset.id.toLowerCase())) errors.push(`Asset ${index + 1} duplicates asset ID "${asset.id}".`);
    ids.add(asset.id.toLowerCase());
  });
  return { valid: errors.length === 0, errors, warnings };
};

export const validateVisualPrompts = (values: unknown, assetIds: string[] = []): ProductionHandoffValidationOutcome => {
  if (!Array.isArray(values)) return { valid: false, errors: ['Visual prompts must be an array.'], warnings: [] };
  const errors: string[] = [];
  const ids = new Set<string>();
  values.forEach((value, index) => {
    const prompt = normalizeVisualPrompt(value);
    if (!prompt) { errors.push(`Visual prompt ${index + 1} must be an object.`); return; }
    if (!nonEmpty(prompt.assetId)) errors.push(`Visual prompt ${index + 1} requires an asset ID.`);
    if (!nonEmpty(prompt.prompt)) errors.push(`Visual prompt ${index + 1} requires prompt text.`);
    if (ids.has(prompt.assetId.toLowerCase())) errors.push(`Visual prompt ${index + 1} duplicates asset ID "${prompt.assetId}".`);
    ids.add(prompt.assetId.toLowerCase());
    if (assetIds.length && !assetIds.some(id => id.toLowerCase() === prompt.assetId.toLowerCase())) errors.push(`Visual prompt ${index + 1} references unknown asset ID "${prompt.assetId}".`);
  });
  if (assetIds.length) {
    for (const assetId of assetIds) {
      if (!ids.has(assetId.toLowerCase())) errors.push(`Missing visual prompt for asset ID "${assetId}".`);
    }
  }
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const parseAssetMetadataResponse = (value: unknown): {
  assets: AssetMetadata[];
  validation: ProductionHandoffValidationOutcome;
} => {
  if (!Array.isArray(value)) return { assets: [], validation: { valid: false, errors: ['Asset response must be an array.'], warnings: [] } };
  const assets = value.flatMap(item => {
    const asset = normalizeAssetMetadata(item);
    return asset ? [asset] : [];
  });
  const validation = validateAssetMetadataCollection(assets);
  if (assets.length !== value.length) {
    validation.valid = false;
    validation.errors.push('Asset response contained malformed entries.');
  }
  return { assets: validation.valid ? assets : [], validation };
};

export const parseVisualPromptResponse = (value: unknown, assetIds: string[]): {
  prompts: VisualPromptContract[];
  validation: ProductionHandoffValidationOutcome;
} => {
  if (!Array.isArray(value)) return { prompts: [], validation: { valid: false, errors: ['Visual prompt response must be an array.'], warnings: [] } };
  const prompts = value.flatMap(item => {
    const prompt = normalizeVisualPrompt(item);
    return prompt ? [prompt] : [];
  });
  const validation = validateVisualPrompts(prompts, assetIds);
  if (prompts.length !== value.length) {
    validation.valid = false;
    validation.errors.push('Visual prompt response contained malformed entries.');
  }
  return { prompts: validation.valid ? prompts : [], validation };
};

export const projectAssetMetadataToLegacyList = (assets: AssetMetadata[]): Record<string, string[]> => assets.reduce<Record<string, string[]>>((result, asset) => {
  const entry = [asset.name, asset.purpose, asset.format, asset.resolution].filter(nonEmpty).join(' — ');
  (result[asset.category] ||= []).push(entry);
  return result;
}, {});

export const projectVisualPromptsToLegacyMap = (prompts: VisualPromptContract[]): Record<string, string> => Object.fromEntries(prompts.map(prompt => [prompt.assetId, prompt.prompt]));

export const projectProductionBriefsToLegacy = (briefs: ProductionBrief[]) => briefs.map(brief => ({
  title: brief.title,
  content: [
    `## ${brief.taskOverview}`,
    `### Scope of work\n${brief.scopeOfWork.map(item => `- ${item}`).join('\n')}`,
    `### Deliverables\n${brief.deliverables.map(item => `- ${item}`).join('\n')}`,
    `### Acceptance criteria\n${brief.acceptanceCriteria.map(item => `- ${item}`).join('\n')}`,
    `### Dependencies\n${brief.dependencies.map(item => `- ${item}`).join('\n') || '- None specified.'}`,
    `### Constraints\n${brief.constraints.map(item => `- ${item}`).join('\n') || '- None specified.'}`,
    `### Out of scope\n${brief.outOfScope.map(item => `- ${item}`).join('\n') || '- None specified.'}`,
  ].join('\n\n'),
}));