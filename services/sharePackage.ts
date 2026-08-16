import { ProjectPackage } from '../types';

/** Converts the complete structured package into the API payload used by sharing. */
export const createSharePayload = (packageData: ProjectPackage): ProjectPackage => packageData;

/** Identifies whether a share response has enough fields for rich rendering. */
export const isRichSharePackage = (value: unknown): value is ProjectPackage => {
  if (!value || typeof value !== 'object') return false;
  const packageData = value as Partial<ProjectPackage>;
  return Boolean(packageData.meta?.projectName && Array.isArray(packageData.chatHistory) && packageData.critiqueQA && Array.isArray(packageData.gddContent) && Array.isArray(packageData.pitchDeckContent) && packageData.assetList !== undefined && packageData.scopeReviewContent !== undefined);
};