
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

export interface TDDFeature {
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
}

// New: Strongly-typed MVP feature specification with BDD scenarios and validation-aware fields
export interface BDDScenario {
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
  technicalNotes?: string; // Implementation notes, performance considerations
  dependencies?: string[]; // External or internal dependencies (network, services, libs)
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
    expandedText: string;
    gddContent: GDDSection[];
    pitchDeckContent: PitchDeckSlide[];
    generatedImages: GeneratedImages;
    mvpDefinition: MVPDefinition | null;
    mvpFeatureSpecs: MVPFeatureSpec[] | null;
    tddContent: TDDFeature[] | null;
    technicalDesignDocument: TechnicalDesignSection[] | null;
    modularBreakdown: FreelanceBrief[] | null; // dynamic count preserved
    assetList: AssetList | null;
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
    expandedText: string;
    gddContent: GDDSection[];
    pitchDeckContent: PitchDeckSlide[];
    generatedImages: GeneratedImages;
    mvpDefinition: MVPDefinition | null;
    // New: structured, typed MVP feature specifications
    mvpFeatureSpecs: MVPFeatureSpec[] | null;
    tddContent: TDDFeature[] | null;
    technicalDesignDocument: TechnicalDesignSection[] | null;
    assetList: AssetList | null;
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
