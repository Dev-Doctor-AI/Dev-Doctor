import { CritiquePoint, LensType, PitchClaim, PitchDeckSlide } from '../types';

const LENSES: LensType[] = ['studio', 'indie', 'freelance', 'gamejam'];
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter(nonEmpty).map(value => value.trim()) : [];

export interface ScopePitchValidationOutcome {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const normalizeCritiquePoint = (value: unknown, lens?: LensType): CritiquePoint | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  return {
    feature: nonEmpty(source.feature) ? source.feature.trim() : '',
    critique: nonEmpty(source.critique) ? source.critique.trim() : '',
    suggestion: nonEmpty(source.suggestion) ? source.suggestion.trim() : '',
    reasoning: nonEmpty(source.reasoning) ? source.reasoning.trim() : '',
    severity: source.severity === 'High' || source.severity === 'Low' ? source.severity : 'Medium',
    lens: LENSES.includes(source.lens) ? source.lens : lens,
    sourceReferences: strings(source.sourceReferences),
  };
};

export const validateScopeReview = (value: unknown, lens: LensType): ScopePitchValidationOutcome => {
  if (!LENSES.includes(lens)) return { valid: false, errors: [`Unsupported scope-review lens "${lens}".`], warnings: [] };
  if (!Array.isArray(value) || value.length === 0) return { valid: false, errors: ['Scope review must contain at least one critique point.'], warnings: [] };
  const errors: string[] = [];
  const warnings: string[] = [];
  value.forEach((item, index) => {
    const point = normalizeCritiquePoint(item, lens);
    if (!point) { errors.push(`Critique point ${index + 1} must be an object.`); return; }
    if (!point.feature) errors.push(`Critique point ${index + 1} requires a feature.`);
    if (!point.critique) errors.push(`Critique point ${index + 1} requires critique text.`);
    if (!point.suggestion) errors.push(`Critique point ${index + 1} requires an actionable suggestion.`);
    if (!point.reasoning) errors.push(`Critique point ${index + 1} requires reasoning.`);
    if (point.lens && point.lens !== lens) errors.push(`Critique point ${index + 1} uses lens "${point.lens}" instead of "${lens}".`);
    if (lens === 'gamejam' && !/48|hour|playable|minimum fun|cut|mock/i.test(`${point.suggestion} ${point.reasoning}`)) warnings.push(`Critique point ${index + 1} does not explicitly reference a 48-hour or minimum-fun constraint.`);
    if (lens === 'freelance' && !/deliverable|handoff|depend|acceptance|integration|owner/i.test(`${point.critique} ${point.suggestion} ${point.reasoning}`)) warnings.push(`Critique point ${index + 1} may not address a contractor handoff concern.`);
  });
  return { valid: errors.length === 0, errors, warnings };
};

export const normalizePitchClaim = (value: unknown): PitchClaim | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  return { text: nonEmpty(source.text) ? source.text.trim() : '', sourceReferences: strings(source.sourceReferences), grounded: source.grounded === true };
};

/** Omits claims that explicitly fail traceability without changing their grounding state. */
export const omitInvalidPitchClaims = (slides: PitchDeckSlide[], sourceIds: string[] = []): PitchDeckSlide[] =>
  slides.map(slide => {
    const claims = (slide.claims ?? []).filter(claim => {
      const normalized = normalizePitchClaim(claim);
      return Boolean(
        normalized
        && normalized.text
        && normalized.grounded
        && normalized.sourceReferences.length
        && (!sourceIds.length || normalized.sourceReferences.every(reference => sourceIds.includes(reference))),
      );
    });
    return { ...slide, claims: claims.length ? claims : undefined };
  });

export const validatePitchClaims = (claims: unknown, sourceIds: string[] = []): ScopePitchValidationOutcome => {
  if (!Array.isArray(claims)) return { valid: false, errors: ['Pitch claims must be an array.'], warnings: [] };
  const errors: string[] = [];
  claims.forEach((value, index) => {
    const claim = normalizePitchClaim(value);
    if (!claim) { errors.push(`Pitch claim ${index + 1} must be an object.`); return; }
    if (!claim.text) errors.push(`Pitch claim ${index + 1} requires text.`);
    if (!claim.grounded) errors.push(`Pitch claim ${index + 1} must be marked grounded.`);
    if (!claim.sourceReferences.length) errors.push(`Pitch claim ${index + 1} requires source references.`);
    if (sourceIds.length && claim.sourceReferences.some(reference => !sourceIds.includes(reference))) errors.push(`Pitch claim ${index + 1} references an unknown source.`);
  });
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const validatePitchSlides = (slides: unknown, expectedTitles: string[], sourceIds: string[] = [], requireClaims = false): ScopePitchValidationOutcome => {
  if (!Array.isArray(slides)) return { valid: false, errors: ['Pitch slides must be an array.'], warnings: [] };
  const errors: string[] = [];
  const titles = new Set<string>();
  slides.forEach((value, index) => {
    const slide = value as Partial<PitchDeckSlide> | null;
    if (!slide || !nonEmpty(slide.title) || !nonEmpty(slide.content)) { errors.push(`Slide ${index + 1} requires a title and content.`); return; }
    if (titles.has(slide.title.trim().toLowerCase())) errors.push(`Slide ${index + 1} duplicates title "${slide.title.trim()}".`);
    titles.add(slide.title.trim().toLowerCase());
    if (requireClaims && !slide.claims?.length) errors.push(`Slide ${index + 1} requires grounded claims.`);
    if (slide.claims && !validatePitchClaims(slide.claims, sourceIds).valid) errors.push(...validatePitchClaims(slide.claims, sourceIds).errors.map(error => `Slide ${index + 1}: ${error}`));
  });
  for (const title of expectedTitles) if (!titles.has(title.toLowerCase())) errors.push(`Missing pitch slide "${title}".`);
  if (slides.length !== expectedTitles.length) errors.push(`Expected ${expectedTitles.length} pitch slides but received ${slides.length}.`);
  return { valid: errors.length === 0, errors, warnings: [] };
};

export const normalizePitchSlide = (value: unknown): PitchDeckSlide | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as any;
  const claims = Array.isArray(source.claims) ? source.claims.flatMap((claim: unknown) => {
    const normalized = normalizePitchClaim(claim);
    return normalized ? [normalized] : [];
  }) : undefined;
  return {
    title: nonEmpty(source.title) ? source.title.trim() : '',
    content: nonEmpty(source.content) ? source.content.trim() : '',
    visualPrompt: nonEmpty(source.visualPrompt) ? source.visualPrompt.trim() : undefined,
    image: nonEmpty(source.image) ? source.image : undefined,
    claims,
  };
};