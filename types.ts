
// FIX: Added missing GAME and APP members to the ProjectType enum to resolve compilation errors.
export enum ProjectType {
  DIRECT_CHAT = 'DIRECT_CHAT',
  GAME = 'GAME',
  APP = 'APP',
}

export enum WorkflowStep {
  CONVERSATION,
  CRITIQUE,
  GENERATING, // Consolidated state
  COMPLETE,
}

export interface AttachedFile {
    name: string;
    data: string; // Can be a base64 data URL for images or raw text for documents
    mimeType: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai' | 'system' | 'helper';
  text: string;
  file?: AttachedFile;
}

export interface GDDSection {
  title: string;
  content: string;
}

export interface TechnicalDesignSection {
    title:string;
    content: string;
}

export interface PitchDeckSlide {
  title: string;
  content: string;
  visualPrompt?: string;
  image?: string;
  claims?: PitchClaim[];
}

export interface PitchClaim {
  text: string;
  sourceReferences: string[];
  grounded: boolean;
}

export interface ScopePitchValidationRecord {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CritiqueRecord {
  summary: string;
  questions: string[];
  answers: string[];
  completed: boolean;
  source: 'technical-analyst' | 'legacy-session';
}

export type OrchestrationStage = 'conversation' | 'critique' | 'gdd' | 'pitch' | 'mvp' | 'tdd' | 'production' | 'scope';

export interface StageOutputEnvelope {
  stage: OrchestrationStage;
  status: 'completed' | 'failed' | 'skipped';
  generatedAt: number;
  outputReferences: string[];
  errors?: string[];
}

export interface GenerationMetadata {
  runId: string;
  startedAt: number;
  completedAt?: number;
  provider?: string;
  model?: string;
  stages: StageOutputEnvelope[];
}

export type MemoryEntryKind = 'fact' | 'proposal' | 'decision' | 'question' | 'constraint';

export interface MemoryEntry {
  id: string;
  kind: MemoryEntryKind;
  text: string;
  status: 'confirmed' | 'accepted' | 'rejected' | 'unresolved' | 'active';
  sourceReferences: string[];
}

export interface TranscriptRecord {
  messages: ChatMessage[];
  preservedInFull: boolean;
  updatedAt: number;
}

export type ConciergeMode = 'project-name' | 'information-gatherer' | 'creative-brainstormer' | 'completion-gate';

export interface UserProxyRecord {
  perspective: string;
  priorities: string[];
  concerns: string[];
  sourceReferences: string[];
}

export interface RiskCritiqueRecord {
  risks: Array<{ id: string; risk: string; consequence: string; decision?: string; questions: string[]; severity: 'High' | 'Medium' | 'Low'; sourceReferences: string[] }>;
}

export interface SynthesisRecord {
  summary: string;
  acceptedDecisions: string[];
  unresolvedQuestions: string[];
  outputReferences: string[];
}

export interface GeneratedImages {
  [key: string]: string; // key is a descriptor (e.g., 'logo'), value is base64 string
}

export interface UserStory {
  story: string;
  acceptanceCriteria: string[];
}

export interface TechnicalSpec {
  component: string;
  details: string;
}

/** Structured technical foundation carried from an MVP feature into architecture work. */
export interface TechnicalDataModel {
  name: string;
  purpose: string;
  fields: Array<{ name: string; type: string; required?: boolean; description?: string }>;
  constraints?: string[];
}

export interface TechnicalApiContract {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'EVENT';
  path: string;
  request?: string;
  response?: string;
  errors?: string[];
  authentication?: string;
}

export interface StateTransition {
  from: string;
  event: string;
  to: string;
  guard?: string;
  effects?: string[];
}

export interface TechnicalSpecification {
  featureId: string;
  feature: string;
  userStory: string;
  scenarios: BDDScenario[];
  dataModels: TechnicalDataModel[];
  apiContracts: TechnicalApiContract[];
  stateTransitions: StateTransition[];
  dependencies: string[];
  acceptanceCriteria: string[];
  source: 'bdd-feature-spec' | 'legacy-tdd';
}

export interface TechnicalSpecificationValidationOutcome {
  featureId?: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TDDFeature {
  // Optional bridge back to MVPFeatureSpec.id. Legacy saved TDD entries do not have it.
  featureId?: string;
  // Additive structured handoff; legacy string/array fields remain supported.
  technicalSpecification?: TechnicalSpecification;
  feature: string;
  userStories: UserStory[] | string;
  technicalSpecs: TechnicalSpec[] | string;
}

export interface MVPDefinition {
  summary: string;
  inScope: string[];
  outOfScope: string[];
}

export interface AssetList {
    [category: string]: string[];
}

export type ProductionBriefCategory = 'creative' | 'technical' | 'production' | 'audio' | 'design';

export interface ProductionBrief {
  id: string;
  title: string;
  role: string;
  category: ProductionBriefCategory;
  taskOverview: string;
  scopeOfWork: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  relatedBriefs: string[];
  constraints: string[];
  outOfScope: string[];
  sourceReferences?: string[];
}

export interface AssetMetadata {
  id: string;
  category: string;
  name: string;
  purpose: string;
  quantity?: string;
  format?: string;
  resolution?: string;
  dependencies: string[];
  ownerRole: string;
  acceptanceCriteria: string[];
  sourceReferences?: string[];
}

export interface VisualPromptContract {
  assetId: string;
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  styleConstraints?: string[];
  sourceReferences: string[];
}

// FIX: Added missing MarketingPlan interface to resolve compilation error in MarketingViewer.tsx.
export interface MarketingPlan {
  title: string;
  budget: string;
  description: string;
  channels: string[];
}

// New Types for Lens System & Freelance Toolkit
export type LensType = 'studio' | 'indie' | 'freelance' | 'gamejam';

// Represents a complete, generated freelance brief.
export interface FreelanceBrief {
  title: string;
  content: string;
}

// Represents a single, structured point of feedback from the scope review.
export interface CritiquePoint {
  feature: string;      // The feature or section being critiqued
  critique: string;     // The core feedback or concern
  suggestion: string;   // An actionable suggestion for improvement
  reasoning: string;    // The "why" behind the critique, tied to the lens
  severity: 'High' | 'Medium' | 'Low'; // The importance of addressing this point
  lens?: LensType;
  sourceReferences?: string[];
}

// Scenario categories are optional during the backward-compatible migration. They become
// required by generation validation in the BDD Feature Contract milestone.
export type BDDScenarioType = 'happy-path' | 'edge-case' | 'failure' | 'boundary' | 'offline';

// Strongly-typed MVP feature specification with BDD scenarios and validation-aware fields.
export interface BDDScenario {
  id?: string; // Stable scenario reference when supplied by the feature-spec generator
  type?: BDDScenarioType;
  title?: string; // Optional human-friendly title for the scenario (e.g., "Happy path")
  given: string[]; // One or more Given clauses
  when: string[];  // One or more When clauses
  then: string[];  // One or more Then clauses
  notes?: string;  // Any extra notes for the scenario
}

export interface MVPFeatureSpec {
  id: string; // stable id for referencing
  feature: string; // short feature name
  userStory: string; // As a <role>, I want <goal>, so that <reason>
  scenarios: BDDScenario[]; // Happy path and edge cases expressed as BDD
  invalidInputs?: string[]; // Wrong/invalid input behaviors and expected handling
  boundaryConditions?: string[]; // Tolerance/limits (sizes, rates, numeric boundaries)
  offlineBehavior?: string; // Expected behavior when offline or service-unavailable
  accessibility?: string[]; // Accessibility / usability conditions to satisfy
  acceptanceCriteria?: string[]; // Concise feature-level acceptance checklist
  failureStates?: string[]; // Explicit non-happy-path states and expected outcomes
  telemetry?: string[]; // Runtime/product events or measurements required for this feature
  securityConsiderations?: string[]; // Authorization, abuse, or trust-boundary requirements
  performanceTargets?: string[]; // Feature-specific budgets, rates, limits, or latency targets
  technicalNotes?: string; // Implementation notes, performance considerations
  dependencies?: string[]; // External or internal dependencies (network, services, libs)
}

// Generation-only diagnostic record. A failed record never carries a feature specification,
// so malformed model output cannot enter the saved MVP/TDD handoff.
export interface MVPFeatureSpecValidationOutcome {
  requestedFeature: string;
  featureId?: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  parseErrors: string[];
  repaired: boolean;
}

export interface GenerationDiagnostic {
  stage: 'mvp-feature-specs';
  message: string;
  validationOutcomes?: MVPFeatureSpecValidationOutcome[];
}


// Represents a unified, exported project package for consistent exports and interchange.
export interface ProjectPackageMeta {
    projectName: string;
    generatedAt: number;
    projectId?: string;
}

export interface ProjectPackage {
    meta: ProjectPackageMeta;
    chatHistory: ChatMessage[];
    critiqueQA: { summary: string; questions: string[]; answers: string[] };
    critiqueRecord?: CritiqueRecord;
    generationMetadata?: GenerationMetadata;
    transcriptRecord?: TranscriptRecord;
    memoryEntries?: MemoryEntry[];
    conciergeMode?: ConciergeMode;
    userProxy?: UserProxyRecord;
    riskCritique?: RiskCritiqueRecord;
    synthesis?: SynthesisRecord;
    expandedText: string;
    gddContent: GDDSection[];
    pitchDeckContent: PitchDeckSlide[];
    generatedImages: GeneratedImages;
    mvpDefinition: MVPDefinition | null;
    mvpFeatureSpecs: MVPFeatureSpec[] | null;
    mvpFeatureSpecValidation?: MVPFeatureSpecValidationOutcome[];
    generationDiagnostic?: GenerationDiagnostic;
    tddContent: TDDFeature[] | null;
    technicalDesignDocument: TechnicalDesignSection[] | null;
    modularBreakdown: FreelanceBrief[] | null; // dynamic count preserved
    assetList: AssetList | null;
    productionBriefs?: ProductionBrief[] | null;
    assetMetadata?: AssetMetadata[] | null;
    visualPromptContracts?: VisualPromptContract[] | null;
    scopeReviewValidation?: ScopePitchValidationRecord;
    pitchDeckValidation?: ScopePitchValidationRecord;
    scopeReviewContent: CritiquePoint[] | null;
}

// Represents a complete, saveable project session.
export interface ProjectSession {
    id: string;
    projectName: string;
    lastModified: number;
    workflowState: WorkflowStep;
    projectType: ProjectType;
    chatHistory: ChatMessage[];
    critiqueData: { summary: string; questions: string[] } | null;
    critiqueAnswers: string[];
    critiqueRecord?: CritiqueRecord;
    generationMetadata?: GenerationMetadata;
    transcriptRecord?: TranscriptRecord;
    memoryEntries?: MemoryEntry[];
    conciergeMode?: ConciergeMode;
    userProxy?: UserProxyRecord;
    riskCritique?: RiskCritiqueRecord;
    synthesis?: SynthesisRecord;
    expandedText: string;
    gddContent: GDDSection[];
    pitchDeckContent: PitchDeckSlide[];
    generatedImages: GeneratedImages;
    mvpDefinition: MVPDefinition | null;
    // New: structured, typed MVP feature specifications
    mvpFeatureSpecs: MVPFeatureSpec[] | null;
    // Optional so legacy saved projects load without retrospective generation validation.
    mvpFeatureSpecValidation?: MVPFeatureSpecValidationOutcome[];
    generationDiagnostic?: GenerationDiagnostic;
    tddContent: TDDFeature[] | null;
    technicalDesignDocument: TechnicalDesignSection[] | null;
    assetList: AssetList | null;
    productionBriefs?: ProductionBrief[] | null;
    assetMetadata?: AssetMetadata[] | null;
    visualPromptContracts?: VisualPromptContract[] | null;
    scopeReviewValidation?: ScopePitchValidationRecord;
    pitchDeckValidation?: ScopePitchValidationRecord;
    scopeReviewContent: CritiquePoint[] | null;
    scopeReviewLens: LensType | null; // NEW: Persist the lens used for critique
    modularBreakdown: FreelanceBrief[] | null;
    gddGenerated: boolean;
    pitchDeckGenerated: boolean;
    mvpGenerated: boolean;
    tddSpecsGenerated: boolean;
    tddDocGenerated: boolean;
    assetListGenerated: boolean;
    scopeReviewGenerated: boolean;
    modularBreakdownGenerated: boolean;
    costUSD: number;
}
