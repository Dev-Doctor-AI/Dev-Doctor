import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
// pdf.js is now loaded globally via a script tag in index.html
import * as mammoth from 'mammoth';
import pako from 'pako';
import { marked } from 'marked';
import { WorkflowStep, ChatMessage, GDDSection, PitchDeckSlide, GeneratedImages, ProjectType, TDDFeature, MVPDefinition, MVPFeatureSpecValidationOutcome, TechnicalDesignSection, AttachedFile, AssetList, LensType, FreelanceBrief, ProjectSession, CritiquePoint, ProjectPackage } from './types';
import { 
    CREATIVE_PROJECT_PITCH_DECK_SLIDES, CREATIVE_PROJECT_VISUAL_ASSETS
} from './constants';
import * as AIService from './services/lmStudioService';
import { AIProviderConfig } from './services/aiProvider';
import { MVPFeatureSpecGenerationError, UnifiedPipelineCritiqueGateError, runUnifiedPipeline } from './services/pipelineOrchestrator';
import { validateCritiqueRecord } from './services/orchestrationContract';
import { buildPersonaSpecialistContext, createTranscriptRecord, deriveConciergeMode, mergeMemoryEntries } from './services/memoryPersonaContract';
import { projectAssetMetadataToLegacyList, projectProductionBriefsToLegacy } from './services/productionHandoffContract';
import { assembleValidatedTDDFeatures } from './services/technicalSpecContract';
import { validateMVPFeatureSpecs } from './services/bddFeatureValidator';
import { exportMarkdown, exportText, exportJSON, exportHTML } from './services/packageExporter';
import { SendIcon, BotIcon, UserIcon, LoaderIcon, DownloadIcon, LightbulbIcon, CheckIcon, FileCodeIcon, GlobeIcon, ChevronDownIcon, TargetIcon, PaperclipIcon, RefreshCwIcon, WandIcon, FileTextIcon, TrashIcon } from './components/icons';

// Refactored Components
import { CostDisplay } from './components/CostDisplay';
import { DownloadProgressIndicator } from './components/DownloadProgressIndicator';
import { GenerationProgressIndicator } from './components/GenerationProgressIndicator';
import { TDDViewer } from './components/TDDViewer';
import { MVPViewer } from './components/MVPViewer';
import { MVPFeatureSpecViewer } from './components/MVPFeatureSpecViewer';
import { AssetListViewer } from './components/AssetListViewer';
import { OutputPanel } from './components/OutputPanel';
import { ModularBreakdownViewer } from './components/ModularBreakdownViewer';
import { HistorySidebar } from './components/HistorySidebar';
import { ScopeReviewViewer } from './components/ScopeReviewViewer';
import { RefactorModal, RefactorConfig } from './components/RefactorModal';
import { DataCorruptionErrorScreen } from './components/DataCorruptionErrorScreen';
import { AIProviderSelector } from './components/AIProviderSelector';
import { RichPackagePreview } from './components/RichPackagePreview';
import { PersonaRecordsViewer } from './components/PersonaRecordsViewer';
import ShareButton from './components/ShareButton';
import { ShareLandingPage } from './components/ShareLandingPage';


// Inform TypeScript that pdfjsLib will be available on the window object
declare const pdfjsLib: any;

// --- SESSION PERSISTENCE ---
const HISTORIES_KEY = 'devDoctorAiProjectHistories';

const createNewProject = (): ProjectSession => {
    return {
        id: `proj_${Date.now()}`,
        projectName: 'Untitled Project',
        lastModified: Date.now(),
        workflowState: WorkflowStep.CONVERSATION,
        projectType: ProjectType.DIRECT_CHAT,
        chatHistory: [{ sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?" }],
        critiqueData: null,
        critiqueAnswers: [],
        transcriptRecord: createTranscriptRecord([{ sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?" }]),
        memoryEntries: [],
        conciergeMode: 'project-name',
        expandedText: '',
        gddContent: [],
        pitchDeckContent: [],
        generatedImages: {},
        mvpDefinition: null,
        // New: structured MVP feature specifications (typed BDD scenarios)
        mvpFeatureSpecs: null,
        tddContent: null,
        technicalDesignDocument: null,
        assetList: null,
        scopeReviewContent: null,
        scopeReviewLens: null,
        modularBreakdown: null,
        gddGenerated: false,
        pitchDeckGenerated: false,
        mvpGenerated: false,
        tddSpecsGenerated: false,
        tddDocGenerated: false,
        assetListGenerated: false,
        scopeReviewGenerated: false,
        modularBreakdownGenerated: false,
        costUSD: 0,
    };
};

// --- HELPER FUNCTIONS ---

const getGDDSectionStyle = (title: string): { tag: 'h2' | 'h3' | 'h4'; className: string } => {
    const trimmedTitle = title.trim();
    // Major heading: "1.0", "2.0", etc.
    if (/\d+\.0(\s|$)/.test(trimmedTitle)) {
        return { tag: 'h2', className: 'text-2xl font-bold text-brand-secondary mt-8 mb-4' };
    }
    // Tertiary heading: "1.1.1", "2.3.4", etc.
    if (/\d+\.\d+\.\d+(\s|$)/.test(trimmedTitle)) {
        return { tag: 'h4', className: 'text-lg font-semibold text-brand-text mt-4 mb-2' };
    }
    // Sub-heading: "1.1", "2.3", etc.
    if (/\d+\.\d+(\s|$)/.test(trimmedTitle)) {
        return { tag: 'h3', className: 'text-xl font-semibold text-brand-primary mt-6 mb-3' };
    }
    // Fallback for non-standard titles
    return { tag: 'h4', className: 'text-lg font-semibold text-brand-text mt-4 mb-2' };
};

// Safe helper to remove HTML comments without breaking copy-paste tools
const cleanHtmlComments = (str: string) => {
    if (!str) return '';
    return str.replace(new RegExp('<!' + '--[^]*?--' + '>', 'g'), '');
};

// --- END HELPERS ---

type LoadingState = 'loading' | 'success' | 'error';

const App: React.FC = () => {
    // --- APP-WIDE LOADING STATE ---
    const [loadingState, setLoadingState] = useState<LoadingState>('loading');

    // --- MULTI-PROJECT STATE MANAGEMENT ---
    const [projectHistories, setProjectHistories] = useState<ProjectSession[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    // --- STATE FOR THE CURRENTLY ACTIVE PROJECT ---
    const [workflowState, setWorkflowState] = useState<WorkflowStep>(WorkflowStep.CONVERSATION);
    const [projectType, setProjectType] = useState<ProjectType>(ProjectType.DIRECT_CHAT);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
    const [isHelperLoading, setIsHelperLoading] = useState<boolean>(false);
    // Provider configuration stays in browser memory and is applied to the one active AI service.
    const [aiProviderConfig, setAiProviderConfig] = useState<AIProviderConfig>(() => AIService.getAIProviderConfig());

    const handleProviderConfigChange = useCallback((config: AIProviderConfig) => {
        setAiProviderConfig(config);
        AIService.setAIProviderConfig(config);
    }, []);
    
    // Critique State
    const [critiqueData, setCritiqueData] = useState<{ summary: string; questions: string[] } | null>(null);
    const [critiqueAnswers, setCritiqueAnswers] = useState<string[]>([]);
    const [critiqueRecord, setCritiqueRecord] = useState<import('./types').CritiqueRecord | undefined>(undefined);
    const [generationMetadata, setGenerationMetadata] = useState<import('./types').GenerationMetadata | undefined>(undefined);
    const [transcriptRecord, setTranscriptRecord] = useState<import('./types').TranscriptRecord | undefined>(undefined);
    const [memoryEntries, setMemoryEntries] = useState<import('./types').MemoryEntry[]>([]);
    const [conciergeMode, setConciergeMode] = useState<import('./types').ConciergeMode>('information-gatherer');
    const [userProxy, setUserProxy] = useState<import('./types').UserProxyRecord | undefined>(undefined);
    const [riskCritique, setRiskCritique] = useState<import('./types').RiskCritiqueRecord | undefined>(undefined);
    const [synthesis, setSynthesis] = useState<import('./types').SynthesisRecord | undefined>(undefined);
    const [isGeneratingCritique, setIsGeneratingCritique] = useState<boolean>(false);
    const [critiqueHelperLoadingIndex, setCritiqueHelperLoadingIndex] = useState<number | null>(null);
    const [workflowError, setWorkflowError] = useState<string | null>(null);

    // UNIFIED Generation State
    const [generationStatus, setGenerationStatus] = useState<{
        key: string | null;
        isActive: boolean;
        progress: number;
        message: string;
        title: string;
        substage?: string;
        completed?: number;
        total?: number;
        currentItem?: string;
        activitySequence?: number;
    }>({ key: null, isActive: false, progress: 0, message: '', title: '', activitySequence: 0 });
    
    const [projectName, setProjectName] = useState<string>('Untitled Project');

    // Final Document Content
    const [expandedText, setExpandedText] = useState<string>('');
    const [gddContent, setGddContent] = useState<GDDSection[]>([]);
    const [pitchDeckContent, setPitchDeckContent] = useState<PitchDeckSlide[]>([]);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImages>({});
    const [mvpDefinition, setMvpDefinition] = useState<MVPDefinition | null>(null);
    // Structured MVP feature specifications: typed BDD scenarios and related metadata
    const [mvpFeatureSpecs, setMvpFeatureSpecs] = useState<import('./types').MVPFeatureSpec[] | null>(null);
    const [mvpFeatureSpecValidation, setMvpFeatureSpecValidation] = useState<MVPFeatureSpecValidationOutcome[]>([]);
    const [generationDiagnostic, setGenerationDiagnostic] = useState<import('./types').GenerationDiagnostic | undefined>(undefined);
    const [tddContent, setTddContent] = useState<TDDFeature[] | null>(null);
    const [technicalDesignDocument, setTechnicalDesignDocument] = useState<TechnicalDesignSection[] | null>(null);
    const [assetList, setAssetList] = useState<AssetList | null>(null);
    const [productionBriefs, setProductionBriefs] = useState<import('./types').ProductionBrief[] | null>(null);
    const [assetMetadata, setAssetMetadata] = useState<import('./types').AssetMetadata[] | null>(null);
    const [visualPromptContracts, setVisualPromptContracts] = useState<import('./types').VisualPromptContract[] | null>(null);
    const [scopeReviewValidation, setScopeReviewValidation] = useState<import('./types').ScopePitchValidationRecord | undefined>(undefined);
    const [pitchDeckValidation, setPitchDeckValidation] = useState<import('./types').ScopePitchValidationRecord | undefined>(undefined);
    const [scopeReviewContent, setScopeReviewContent] = useState<CritiquePoint[] | null>(null);
    const [scopeReviewLens, setScopeReviewLens] = useState<LensType | null>(null);
    const [isScopeReviewModalOpen, setIsScopeReviewModalOpen] = useState(false);
    const [isLensModalOpen, setIsLensModalOpen] = useState(false);
    const [isRefactorModalOpen, setIsRefactorModalOpen] = useState(false);
    const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    // Freelance Toolkit State
    const [modularBreakdown, setModularBreakdown] = useState<FreelanceBrief[] | null>(null);

    // Granular generation status
    const [gddGenerated, setGddGenerated] = useState<boolean>(false);
    const [pitchDeckGenerated, setPitchDeckGenerated] = useState<boolean>(false);
    const [mvpGenerated, setMvpGenerated] = useState<boolean>(false);
    const [tddSpecsGenerated, setTddSpecsGenerated] = useState<boolean>(false);
    const [tddDocGenerated, setTddDocGenerated] = useState<boolean>(false);
    const [assetListGenerated, setAssetListGenerated] = useState<boolean>(false);
    const [scopeReviewGenerated, setScopeReviewGenerated] = useState<boolean>(false);
    const [modularBreakdownGenerated, setModularBreakdownGenerated] = useState<boolean>(false);

    const [openSection, setOpenSection] = useState<'rich' | 'persona' | 'gdd' | 'pitch' | 'mvp' | 'tdd_specs' | 'tdd_final' | 'assets' | 'modular_breakdown' | 'scope_review' | null>('rich');
    const [isStableVersion, setIsStableVersion] = useState<boolean>(true);

    // Download and session completion state
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [downloadMessage, setDownloadMessage] = useState<string>('');
    
    // Cost Estimation State
    const [costReport, setCostReport] = useState<{ totalCostUSD: number } | null>(null);

    // UI Refs
    const chatEndRef = useRef<HTMLDivElement>(null);
    const userInputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- DYNAMIC CONSTANTS ---
    const activePitchDeckSlides = CREATIVE_PROJECT_PITCH_DECK_SLIDES;
    const activeVisualAssets = CREATIVE_PROJECT_VISUAL_ASSETS;

    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.js`;
        }
    }, []);

    const loadProjectIntoState = useCallback((project: ProjectSession | undefined) => {
        if (!project) {
             const newProj = createNewProject();
             setProjectHistories([newProj]);
             loadProjectIntoState(newProj);
             return;
        }
        setWorkflowState(project.workflowState);
        setProjectType(project.projectType);
        setChatHistory(project.chatHistory);
        setCritiqueData(project.critiqueData);
        setCritiqueAnswers(project.critiqueAnswers);
        setCritiqueRecord(project.critiqueRecord);
        setGenerationMetadata(project.generationMetadata);
        setTranscriptRecord(project.transcriptRecord || createTranscriptRecord(project.chatHistory || []));
        setMemoryEntries(project.memoryEntries || []);
        setConciergeMode(project.conciergeMode || (project.projectName === 'Untitled Project' ? 'project-name' : 'information-gatherer'));
        setUserProxy(project.userProxy); setRiskCritique(project.riskCritique); setSynthesis(project.synthesis);
        setProjectName(project.projectName);
        setExpandedText(project.expandedText);
        setGddContent(project.gddContent);
        setPitchDeckContent(project.pitchDeckContent);
        setGeneratedImages(project.generatedImages);
        setMvpDefinition(project.mvpDefinition);
        // Load structured MVP feature specs if present
        setMvpFeatureSpecs((project as any).mvpFeatureSpecs || null);
        setMvpFeatureSpecValidation(project.mvpFeatureSpecValidation || []);
        setGenerationDiagnostic(project.generationDiagnostic);
        setTddContent(project.tddContent);
        setTechnicalDesignDocument(project.technicalDesignDocument);
        setAssetList(project.assetList);
        setProductionBriefs(project.productionBriefs || null);
        setAssetMetadata(project.assetMetadata || null);
        setVisualPromptContracts(project.visualPromptContracts || null);
        setScopeReviewValidation(project.scopeReviewValidation);
        setPitchDeckValidation(project.pitchDeckValidation);
        setScopeReviewContent(project.scopeReviewContent);
        setScopeReviewLens(project.scopeReviewLens || null);
        setModularBreakdown(project.modularBreakdown);
        setGddGenerated(project.gddGenerated);
        setPitchDeckGenerated(project.pitchDeckGenerated);
        setMvpGenerated(project.mvpGenerated);
        setTddSpecsGenerated(project.tddSpecsGenerated);
        setTddDocGenerated(project.tddDocGenerated);
        setAssetListGenerated(project.assetListGenerated);
        setScopeReviewGenerated(project.scopeReviewGenerated);
        setModularBreakdownGenerated(project.modularBreakdownGenerated);
        setCostReport({ totalCostUSD: project.costUSD || 0 });

        setActiveProjectId(project.id);
        AIService.resetLMCostSession(project.costUSD || 0);
    }, []);

    // --- INITIAL DATA LOADING ---
    useEffect(() => {
        console.log("[Init] Starting data load from localStorage...");
        try {
            const saved = localStorage.getItem(HISTORIES_KEY);
            if (saved) {
                let histories: any[] = [];
                try {
                    histories = JSON.parse(saved);
                } catch (e) {
                    try {
                        const binaryString = atob(saved);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const decompressed = pako.inflate(bytes, { to: 'string' });
                        histories = JSON.parse(decompressed);
                    } catch (decompressionError) {
                        throw new Error("Data is corrupted or in an unknown format.");
                    }
                }

                if (Array.isArray(histories) && histories.length > 0) {
                     const validHistories = histories.filter(p => p && typeof p === 'object' && p.id && p.projectName);
                     if (validHistories.length > 0) {
                        setProjectHistories(validHistories);
                        const lastActive = [...validHistories].sort((a, b) => b.lastModified - a.lastModified)[0];
                        loadProjectIntoState(lastActive);
                        setLoadingState('success');
                        return;
                     }
                }
            }
            const newProj = createNewProject();
            setProjectHistories([newProj]);
            loadProjectIntoState(newProj);

        } catch (e) {
            console.error("CRITICAL: Failed to load or parse project histories.", e);
            setLoadingState('error');
        } finally {
             if (loadingState === 'loading') {
                setLoadingState('success');
            }
        }
    }, [loadProjectIntoState]);

    // --- DEBOUNCED PERSISTENCE ---
    const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (loadingState !== 'success' || projectHistories.length === 0) return;

        if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);

        persistTimeoutRef.current = setTimeout(() => {
            const trySave = (data: any[]) => {
                try {
                    const jsonString = JSON.stringify(data);
                    const compressed = pako.deflate(jsonString);
                    let binary = '';
                    const len = compressed.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(compressed[i]);
                    }
                    const base64 = btoa(binary);
                    
                    localStorage.setItem(HISTORIES_KEY, base64);
                    return true;
                } catch (e) {
                    if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                        if (data.length > 1) {
                            const sorted = [...data].sort((a, b) => a.lastModified - b.lastModified);
                            const pruned = data.filter(p => p.id !== sorted[0].id);
                            return trySave(pruned);
                        }
                    }
                    return false;
                }
            };
            trySave(projectHistories);
        }, 2000);

        return () => {
            if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        };
    }, [projectHistories, loadingState]);

    const activeProjectStateToSave = useMemo(() => ({
        projectName, workflowState, projectType, chatHistory, critiqueData, critiqueAnswers, critiqueRecord, generationMetadata, transcriptRecord, memoryEntries, conciergeMode, userProxy, riskCritique, synthesis,
        expandedText, gddContent, pitchDeckContent, generatedImages, mvpDefinition,
        // Persist structured MVP feature specs
        mvpFeatureSpecs,
        mvpFeatureSpecValidation,
        generationDiagnostic,
        tddContent, technicalDesignDocument, assetList, productionBriefs, assetMetadata, visualPromptContracts, scopeReviewValidation, pitchDeckValidation,
        scopeReviewContent, scopeReviewLens, modularBreakdown, gddGenerated, pitchDeckGenerated,
        mvpGenerated, tddSpecsGenerated, tddDocGenerated, assetListGenerated,
        scopeReviewGenerated, modularBreakdownGenerated,
        costUSD: costReport?.totalCostUSD || 0
    }), [
        projectName, workflowState, projectType, chatHistory, critiqueData, critiqueAnswers, critiqueRecord, generationMetadata, transcriptRecord, memoryEntries, conciergeMode, userProxy, riskCritique, synthesis,
        expandedText, gddContent, pitchDeckContent, generatedImages, mvpDefinition,
        mvpFeatureSpecs,
        mvpFeatureSpecValidation,
        generationDiagnostic,
        tddContent, technicalDesignDocument, assetList, productionBriefs, assetMetadata, visualPromptContracts, scopeReviewValidation, pitchDeckValidation,
        scopeReviewContent, scopeReviewLens, modularBreakdown, gddGenerated, pitchDeckGenerated,
        mvpGenerated, tddSpecsGenerated, tddDocGenerated, assetListGenerated,
        scopeReviewGenerated, modularBreakdownGenerated, costReport
    ]);
    
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedStateRef = useRef<string>('');

    useEffect(() => {
        if (!activeProjectId || loadingState !== 'success') return;
    
        const currentStateJson = JSON.stringify(activeProjectStateToSave);
        if (currentStateJson === lastSavedStateRef.current) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            setProjectHistories(currentHistories => {
                const activeProjectIndex = currentHistories.findIndex(p => p.id === activeProjectId);
                if (activeProjectIndex === -1) return currentHistories;
        
                const updatedHistories = [...currentHistories];
                updatedHistories[activeProjectIndex] = {
                    ...currentHistories[activeProjectIndex],
                    ...activeProjectStateToSave,
                    lastModified: Date.now(),
                };
                lastSavedStateRef.current = currentStateJson;
                return updatedHistories;
            });
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [activeProjectId, activeProjectStateToSave, loadingState]);

    useEffect(() => {
        setCostReport(AIService.getLMCostReport());
    }, [gddContent, pitchDeckContent, generatedImages, mvpDefinition, tddContent, scopeReviewContent]);

    // --- HISTORY MANAGEMENT HANDLERS ---
    const handleNewProject = useCallback(() => {
        const newProj = createNewProject();
        setProjectHistories(prev => [...prev, newProj]);
        loadProjectIntoState(newProj);
    }, [loadProjectIntoState]);

    const handleLoadProject = (id: string) => {
        if (id === activeProjectId) return;
        const projectToLoad = projectHistories.find(p => p.id === id);
        if (projectToLoad) loadProjectIntoState(projectToLoad);
    };

    const handleDeleteProject = (id: string) => {
        const projectToDelete = projectHistories.find(p => p.id === id);
        if (!projectToDelete) return;
        if (projectToDelete.projectName === 'Untitled Project') {
            setProjectHistories(currentHistories => currentHistories.filter(p => p.id !== id));
        }
    };
    
    useEffect(() => {
        if (activeProjectId && !projectHistories.find(p => p.id === activeProjectId)) {
            if (projectHistories.length > 0) {
                const nextProjectToLoad = [...projectHistories].sort((a, b) => b.lastModified - a.lastModified)[0];
                loadProjectIntoState(nextProjectToLoad);
            } else {
                handleNewProject();
            }
        }
    }, [projectHistories, activeProjectId, handleNewProject, loadProjectIntoState]);


    // --- ON-DEMAND GENERATION HANDLERS ---
    
    const getConversationText = () => chatHistory.map(m => `${m.sender}: ${m.text}`).join('\n');

    const ensureExpandedText = async (conversationText: string) => {
        if (expandedText) return expandedText;
        const newExpandedText = await AIService.getExpandedText(conversationText);
        setExpandedText(newExpandedText);
        return newExpandedText;
    };

    const ensureProjectName = async (conversationText: string) => {
        if (projectName && projectName !== 'New Project' && projectName !== 'Untitled Project') return projectName;
        const extractedName = await AIService.extractProjectName(conversationText);
        setProjectName(extractedName);
        return extractedName;
    };

    const handleGenerateGDD = async () => {
        if (generationStatus.isActive || gddGenerated) return;
        setWorkflowState(WorkflowStep.CRITIQUE);
    };

    const handleGeneratePitchDeck = async (overrideGdd?: GDDSection[]) => {
        console.log("[App] handleGeneratePitchDeck called");
        const isRefactoring = generationStatus.key === 'refactor';
        if ((generationStatus.isActive && !isRefactoring) || (pitchDeckGenerated && !overrideGdd) || (!gddGenerated && !overrideGdd)) return;
        
        try {
            setWorkflowError(null);
            if (!isRefactoring) {
                setGenerationStatus({ key: 'pitch', isActive: true, progress: 0, message: 'Starting...', title: 'Generating Pitch Deck' });
            }
            
            const conversationText = getConversationText();
            setGenerationStatus(prev => ({ ...prev, progress: 10, message: 'Expanding context...' }));
            const text = await ensureExpandedText(conversationText);
            const name = await ensureProjectName(conversationText);
            
            setGenerationStatus(prev => ({ ...prev, progress: 25, message: 'Writing slide content...' }));
            const slides = await AIService.generateFullPitchDeck(text, name, activePitchDeckSlides);
            setPitchDeckContent(slides);
            setPitchDeckValidation({ valid: true, errors: [], warnings: [] });

            setGenerationStatus(prev => ({ ...prev, progress: 50, message: 'Generating visual prompts...' }));
            const prompts = await AIService.generateAllVisualPrompts(text, activeVisualAssets);
            const newImages = { ...generatedImages };
            
            const IMAGE_CONCURRENCY = 2;
            for (let i = 0; i < activeVisualAssets.length; i += IMAGE_CONCURRENCY) {
                const batch = activeVisualAssets.slice(i, i + IMAGE_CONCURRENCY);
                await Promise.all(batch.map(async (asset, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    const progress = 50 + Math.round(((globalIndex + 1) / activeVisualAssets.length) * 50);
                    setGenerationStatus(prev => ({ ...prev, progress, message: `Generating visual for ${asset.key}...` }));
                    const prompt = prompts[asset.key] || `A concept for: ${asset.description}`;
                    const imageData = await AIService.generateImage(prompt, asset.aspectRatio);
                    if (imageData) newImages[asset.key] = imageData;
                }));
                
            }
            setGeneratedImages(newImages);
            
            setPitchDeckGenerated(true);
            setCostReport(AIService.getLMCostReport());
            setGenerationStatus(prev => ({ ...prev, progress: 100, message: 'Complete!' }));
            await new Promise(resolve => setTimeout(resolve, 1500));
            setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
        } catch (error) {
            console.error("Failed to generate Pitch Deck:", error);
            if (!isRefactoring) {
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error generating Pitch Deck.', title: 'Error' });
            }
        }
    };

    const handleGenerateMVP = async (overrideGdd?: GDDSection[]): Promise<MVPDefinition | null> => {
        console.log("[App] handleGenerateMVP called");
        const isRefactoring = generationStatus.key === 'refactor';
        if ((generationStatus.isActive && !isRefactoring) || (mvpGenerated && !overrideGdd) || (!gddGenerated && !overrideGdd)) return null;
        
        try {
            const contentToUse = overrideGdd || gddContent;
            
            if (!isRefactoring) {
                setGenerationStatus({ key: 'mvp', isActive: true, progress: 30, message: 'Defining MVP...', title: 'Defining MVP' });
            }
            
            const mvp = await AIService.defineMVP(contentToUse);
            setMvpDefinition(mvp);
            if (!isRefactoring) {
                setGenerationStatus(prev => ({ ...prev, progress: 100, message: 'Complete!' }));
            }
            setMvpGenerated(true);
            setCostReport(AIService.getLMCostReport());
            if (!isRefactoring) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
            }
            return mvp;
        } catch (error) {
            console.error("Failed to generate MVP:", error);
            if (!isRefactoring) {
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error defining MVP.', title: 'Error' });
            }
            return null;
        }
    };

    const handleGenerateTddSpecs = async (overrideGdd?: GDDSection[], overrideMvp?: MVPDefinition | null): Promise<TDDFeature[] | null> => {
        console.log("[App] handleGenerateTddSpecs called");
        const isRefactoring = generationStatus.key === 'refactor';
        if ((generationStatus.isActive && !isRefactoring) || (tddSpecsGenerated && !overrideGdd) || (!mvpGenerated && !overrideMvp)) return null;
        let attemptValidationOutcomes: MVPFeatureSpecValidationOutcome[] = [];
        
        try {
            setWorkflowError(null);
            setGenerationDiagnostic(undefined);
            if (!isRefactoring) {
                setGenerationStatus({ key: 'tdd_specs', isActive: true, progress: 0, message: 'Starting...', title: 'Generating MVP Feature Specs', substage: 'preparing', completed: 0, total: 0, activitySequence: 0 });
            }
            
            let mvp = overrideMvp || mvpDefinition;
            if (!mvp) {
                 const contentToUse = overrideGdd || gddContent;
                 setGenerationStatus(prev => ({ ...prev, progress: 10, message: 'Defining MVP scope...' }));
                 mvp = await AIService.defineMVP(contentToUse);
                 setMvpDefinition(mvp);
                 setMvpGenerated(true);
            }
            
            const resolvedFeatureSpecs: import('./types').MVPFeatureSpec[] = [];
            const validationOutcomes: MVPFeatureSpecValidationOutcome[] = [];
            attemptValidationOutcomes = validationOutcomes;
            const CONCURRENCY_LIMIT = 1;
            const featureTotal = mvp!.inScope.length;
            setGenerationStatus(prev => ({ ...prev, progress: 10, substage: 'feature-specs', completed: 0, total: featureTotal, message: `Preparing ${featureTotal} feature specifications...` }));
            
            for (let i = 0; i < mvp!.inScope.length; i += CONCURRENCY_LIMIT) {
                const batch = mvp!.inScope.slice(i, i + CONCURRENCY_LIMIT);
                const batchPromises = batch.map(async (feature, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    setGenerationStatus(prev => ({ ...prev, currentItem: feature, message: `Writing feature specification ${globalIndex + 1}/${featureTotal}: ${feature}...` }));
                    
                    return AIService.generateMVPFeatureSpec(feature, projectName, mvp!);
                });
                
                const batchResults = await Promise.all(batchPromises);
                validationOutcomes.push(...batchResults.map(result => result.outcome));
                resolvedFeatureSpecs.push(...batchResults.flatMap(result => result.featureSpec ? [result.featureSpec] : []));
                const completed = Math.min(i + batchResults.length, featureTotal);
                const completedFeature = batch[batchResults.length - 1] || '';
                setGenerationStatus(prev => ({
                    ...prev,
                    progress: 10 + Math.round((completed / Math.max(1, featureTotal)) * 55),
                    completed,
                    total: featureTotal,
                    currentItem: completedFeature,
                    activitySequence: (prev.activitySequence || 0) + 1,
                    message: `Completed feature specification ${completed}/${featureTotal}: ${completedFeature}`,
                }));
                
                if (i + CONCURRENCY_LIMIT < mvp!.inScope.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Safety valve between batches
                }
            }

            const collectionValidation = validateMVPFeatureSpecs(resolvedFeatureSpecs, { requireStrongContract: true });
            if (validationOutcomes.some(outcome => !outcome.valid) || !collectionValidation.valid || resolvedFeatureSpecs.length !== mvp!.inScope.length) {
                setMvpFeatureSpecValidation(validationOutcomes);
                const diagnostics = [
                    ...validationOutcomes.filter(outcome => !outcome.valid).flatMap(outcome => [`${outcome.requestedFeature}: ${[...outcome.parseErrors, ...outcome.errors, ...outcome.warnings].join('; ')}`]),
                    ...collectionValidation.errors,
                ].filter(Boolean).join(' | ');
                throw new Error(`Generated MVP feature specifications failed validation. ${diagnostics}`);
            }

            const technicalSpecifications: Awaited<ReturnType<typeof AIService.generateTechnicalSpecification>>[] = [];
            const projectText = (overrideGdd || gddContent).map(section => `${section.title}: ${section.content}`).join('\n');
            setGenerationStatus(prev => ({ ...prev, progress: 65, substage: 'technical-specs', completed: 0, total: resolvedFeatureSpecs.length, currentItem: '', message: `Preparing ${resolvedFeatureSpecs.length} technical specifications...` }));
            for (let index = 0; index < resolvedFeatureSpecs.length; index += 1) {
                const featureSpec = resolvedFeatureSpecs[index];
                setGenerationStatus(prev => ({ ...prev, currentItem: featureSpec.feature, message: `Designing technical specification ${index + 1}/${resolvedFeatureSpecs.length}: ${featureSpec.feature}...` }));
                technicalSpecifications.push(await AIService.generateTechnicalSpecification(featureSpec, projectText));
                const completed = index + 1;
                setGenerationStatus(prev => ({
                    ...prev,
                    progress: 65 + Math.round((completed / Math.max(1, resolvedFeatureSpecs.length)) * 30),
                    completed,
                    total: resolvedFeatureSpecs.length,
                    currentItem: featureSpec.feature,
                    activitySequence: (prev.activitySequence || 0) + 1,
                    message: `Completed technical specification ${completed}/${resolvedFeatureSpecs.length}: ${featureSpec.feature}`,
                }));
            }
            setGenerationStatus(prev => ({ ...prev, progress: 97, substage: 'collection-validation', completed: resolvedFeatureSpecs.length, total: resolvedFeatureSpecs.length, currentItem: '', message: 'Validating and assembling the feature collection...' }));
            const tddAssembly = assembleValidatedTDDFeatures(resolvedFeatureSpecs, technicalSpecifications.map(result => result.specification));
            const technicalErrors = technicalSpecifications.flatMap(result => result.valid ? [] : [...result.parseErrors, ...result.errors]);
            if (!tddAssembly.valid || technicalErrors.length) {
                throw new Error(`Generated technical specifications failed validation. ${[...technicalErrors, ...tddAssembly.errors].filter(Boolean).join(' | ')}`);
            }
            const resolvedTdd: TDDFeature[] = tddAssembly.tddFeatures;
            
            setTddContent(resolvedTdd);
            setMvpFeatureSpecs(resolvedFeatureSpecs);
            setMvpFeatureSpecValidation(validationOutcomes);
            setGenerationDiagnostic(undefined);
            
            setTddSpecsGenerated(true);
            setCostReport(AIService.getLMCostReport());
            if (!isRefactoring) {
                setGenerationStatus(prev => ({ ...prev, progress: 100, substage: 'complete', currentItem: '', activitySequence: (prev.activitySequence || 0) + 1, message: 'Complete!' }));
                await new Promise(resolve => setTimeout(resolve, 1500));
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
            }
            return resolvedTdd;
        } catch (error) {
            console.error("Failed to generate TDD Specs:", error);
            const message = error instanceof Error ? error.message : 'MVP Feature Specs could not be generated.';
            setWorkflowError(message);
            setGenerationDiagnostic({ stage: 'mvp-feature-specs', message, validationOutcomes: attemptValidationOutcomes });
            if (!isRefactoring) {
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error generating TDD Specs.', title: 'Error' });
            }
            return null;
        }
    };

    const handleGenerateTddDoc = async (overrideTddSpecs?: TDDFeature[]) => {
        console.log("[App] handleGenerateTddDoc called");
        const isRefactoring = generationStatus.key === 'refactor';
        if ((generationStatus.isActive && !isRefactoring) || (tddDocGenerated && !overrideTddSpecs) || (!tddSpecsGenerated && !overrideTddSpecs)) return;
        
        try {
            if (!isRefactoring) {
                setGenerationStatus({ key: 'tdd_doc', isActive: true, progress: 0, message: 'Starting...', title: 'Assembling Final TDD' });
            }
            
            const conversationText = getConversationText();
            setGenerationStatus(prev => ({ ...prev, progress: 20, message: 'Reading project documents...' }));
            const text = await ensureExpandedText(conversationText);
            
            const specsToUse = overrideTddSpecs || tddContent;
            if (!specsToUse) {
                console.error("Cannot generate TDD Doc without TDD Specs content.");
                if (!isRefactoring) {
                    setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error: Prerequisite missing.', title: 'Error' });
                }
                return;
            }
            
            setGenerationStatus(prev => ({ ...prev, progress: 50, message: `Assembling final document...` }));
            const finalTdd = await AIService.generateTechnicalDesignDocument(text, specsToUse);
            setTechnicalDesignDocument(finalTdd);
            
            setTddDocGenerated(true);
            setCostReport(AIService.getLMCostReport());
            if (!isRefactoring) {
                setGenerationStatus(prev => ({ ...prev, progress: 100, message: 'Complete!' }));
                await new Promise(resolve => setTimeout(resolve, 1500));
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
            }
        } catch (error) {
            console.error("Failed to generate TDD Doc:", error);
            if (!isRefactoring) {
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error generating TDD Doc.', title: 'Error' });
            }
        }
    };

    const handleGenerateAssetList = async (overrideGdd?: GDDSection[]) => {
        console.log("[App] handleGenerateAssetList called");
        const isRefactoring = generationStatus.key === 'refactor';
        if ((generationStatus.isActive && !isRefactoring) || (assetListGenerated && !overrideGdd) || (!gddGenerated && !overrideGdd)) return;
        
        try {
            const contentToUse = overrideGdd || gddContent;
            
            if (!isRefactoring) {
                setGenerationStatus({ key: 'assets', isActive: true, progress: 20, message: 'Scanning document for assets...', title: 'Generating Asset List' });
            }
            const gddText = contentToUse.map(s => `## ${s.title}\n${s.content}`).join('\n\n');
            
            if (!gddText.trim()) {
                throw new Error("The design document is empty. Please generate the GDD first.");
            }

            const structuredAssets = await AIService.generateAssetMetadata(gddText, projectName);
            const promptContracts = await AIService.generateVisualPromptContracts(gddText, structuredAssets.map(asset => ({ id: asset.id, description: asset.purpose, sourceReferences: asset.sourceReferences })));
            setAssetMetadata(structuredAssets);
            setVisualPromptContracts(promptContracts);
            setAssetList(projectAssetMetadataToLegacyList(structuredAssets));
            if (!isRefactoring) {
                setGenerationStatus(prev => ({ ...prev, progress: 100, message: 'Complete!' }));
            }
            setAssetListGenerated(true);
            setCostReport(AIService.getLMCostReport());
            if (!isRefactoring) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
            }
        } catch (error) {
            console.error("Failed to generate Asset List:", error);
            if (!isRefactoring) {
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error generating Asset List.', title: 'Error' });
            }
        }
    };

    const handleGenerateScopeReview = async () => {
        if (generationStatus.isActive || scopeReviewGenerated) return;
        setIsLensModalOpen(true);
    };

    const handleRunScopeReviewWithLens = async (lens: LensType) => {
        console.log(`[App] handleRunScopeReviewWithLens called with lens: ${lens}`);
        setIsLensModalOpen(false);
        setScopeReviewLens(lens);
        try {
            setGenerationStatus({ key: 'scope', isActive: true, progress: 20, message: `Applying ${lens} lens...`, title: 'Running Scope Critique' });
            const gddText = gddContent.map(s => `## ${s.title}\n${s.content}`).join('\n\n');
            
            if (!gddText.trim()) {
                throw new Error("The design document is empty. Please generate the GDD first.");
            }

            const review = await AIService.generateScopeReview(gddText, lens);
            setScopeReviewContent(review);
            setScopeReviewValidation({ valid: true, errors: [], warnings: [] });
            setScopeReviewGenerated(true);
            setCostReport(AIService.getLMCostReport());
            setGenerationStatus(prev => ({ ...prev, progress: 100, message: 'Complete!' }));
            await new Promise(resolve => setTimeout(resolve, 1500));
            setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
            setIsScopeReviewModalOpen(true);
        } catch (error) {
            console.error("[App] Failed to run Scope Review:", error);
            setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error running Scope Review.', title: 'Error' });
        }
    };
    
    const handleGenerateModularBreakdown = async (overrideGdd?: GDDSection[]) => {
        console.log("[App] handleGenerateModularBreakdown called");
        const isRefactoring = generationStatus.key === 'refactor';
        if ((generationStatus.isActive && !isRefactoring) || (modularBreakdownGenerated && !overrideGdd) || (!gddGenerated && !overrideGdd)) return;
        
        try {
            const contentToUse = overrideGdd || gddContent;
            
            if (!isRefactoring) {
                setGenerationStatus({ key: 'modular', isActive: true, progress: 20, message: 'Deconstructing project into briefs...', title: 'Generating Freelance Briefs' });
            }
            const gddText = contentToUse.map(s => `## ${s.title}\n${s.content}`).join('\n\n');
            const structuredBriefs = await AIService.generateProductionBriefs(gddText, projectName, JSON.stringify({ tddContent, assetMetadata }));
            setProductionBriefs(structuredBriefs);
            setModularBreakdown(projectProductionBriefsToLegacy(structuredBriefs));
            setModularBreakdownGenerated(true);
            setCostReport(AIService.getLMCostReport());
            if (!isRefactoring) {
                setGenerationStatus(prev => ({ ...prev, progress: 100, message: 'Complete!' }));
                await new Promise(resolve => setTimeout(resolve, 1500));
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
            }
        } catch (error) {
            console.error("Failed to generate Modular Breakdown:", error);
            if (!isRefactoring) {
                setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error generating Modular Breakdown.', title: 'Error' });
            }
        }
    };
    
    const handleStartRefactor = async (config: RefactorConfig) => {
        setIsRefactorModalOpen(false);
        setGenerationStatus({ key: 'refactor', isActive: true, progress: 0, message: 'Starting refactor...', title: 'Refactoring Documents' });
    
        try {
            const { instruction, documents } = config;
            
            const resetStates = () => {
                if (documents.includes('pitch')) { setPitchDeckContent([]); setGeneratedImages({}); setPitchDeckGenerated(false); }
                if (documents.includes('assets')) { setAssetList(null); setAssetMetadata(null); setVisualPromptContracts(null); setAssetListGenerated(false); }
                if (documents.includes('mvp')) { setMvpDefinition(null); setMvpGenerated(false); }
                if (documents.includes('tdd_specs')) { setMvpFeatureSpecs(null); setMvpFeatureSpecValidation([]); setTddContent(null); setTddSpecsGenerated(false); }
                if (documents.includes('tdd_final')) { setTechnicalDesignDocument(null); setTddDocGenerated(false); }
                if (documents.includes('modular_breakdown')) { setModularBreakdown(null); setProductionBriefs(null); setModularBreakdownGenerated(false); }
                if (documents.includes('scope')) { setScopeReviewContent(null); setScopeReviewGenerated(false); }
            };
            resetStates();
            
            setGenerationStatus(prev => ({ ...prev, progress: 10, message: 'Refactoring GDD...' }));
            const currentGddText = gddContent.map(s => `## ${s.title}\n${s.content}`).join('\n\n');
            const toc = gddContent.map(s => s.title);
            const newGdd = await AIService.refineGDD(currentGddText, toc, projectName, instruction);
            setGddContent(newGdd);
            setGenerationStatus(prev => ({ ...prev, progress: 25, message: 'GDD updated.' }));
    
            if (documents.includes('pitch')) {
                setGenerationStatus(prev => ({ ...prev, progress: 30, message: 'Regenerating Pitch Deck...' }));
                await handleGeneratePitchDeck(newGdd);
            }
            if (documents.includes('assets')) {
                setGenerationStatus(prev => ({ ...prev, progress: 45, message: 'Regenerating Asset List...' }));
                await handleGenerateAssetList(newGdd);
            }
            let currentMvp = mvpDefinition;
            if (documents.includes('mvp')) {
                setGenerationStatus(prev => ({ ...prev, progress: 60, message: 'Regenerating MVP...' }));
                currentMvp = await handleGenerateMVP(newGdd);
            }
            if (documents.includes('scope')) {
                setGenerationStatus(prev => ({ ...prev, progress: 70, message: 'Regenerating Scope Critique...' }));
                const gddTextForScope = newGdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n');
                const lensToUse = scopeReviewLens || 'indie';
                const review = await AIService.generateScopeReview(gddTextForScope, lensToUse);
                setScopeReviewContent(review);
                setScopeReviewGenerated(true);
            }
            let currentTddSpecs = tddContent;
            if (documents.includes('tdd_specs')) {
                setGenerationStatus(prev => ({ ...prev, progress: 75, message: 'Regenerating TDD Specs...' }));
                currentTddSpecs = await handleGenerateTddSpecs(newGdd, currentMvp);
            }
            if (documents.includes('tdd_final')) {
                setGenerationStatus(prev => ({ ...prev, progress: 85, message: 'Regenerating Final TDD...' }));
                await handleGenerateTddDoc(currentTddSpecs || undefined); 
            }
            if (documents.includes('modular_breakdown')) {
                setGenerationStatus(prev => ({ ...prev, progress: 95, message: 'Regenerating Freelance Briefs...' }));
                await handleGenerateModularBreakdown(newGdd);
            }
    
            setGenerationStatus({ key: 'refactor', isActive: true, progress: 100, message: 'Refactor Complete!', title: 'Refactoring Documents' });
            await new Promise(resolve => setTimeout(resolve, 2000));
    
        } catch (error) {
            console.error("Refactor failed:", error);
            alert("An error occurred during the refactor process. Check the console for details.");
        } finally {
            setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
        }
    };


    // --- WORKFLOW TRIGGERS ---
    useEffect(() => {
        const runCritique = async () => {
            if (workflowState === WorkflowStep.CRITIQUE && !critiqueData) {
                setIsGeneratingCritique(true);
                const conversationText = getConversationText();
                const critique = await AIService.performTechnicalCritique(conversationText);
                setCritiqueData(critique);
                setCritiqueAnswers(new Array(critique.questions.length).fill(''));
                setCritiqueRecord({ ...critique, answers: [], completed: false, source: 'technical-analyst' });
                setIsGeneratingCritique(false);
            }
        };
        runCritique();
    }, [workflowState, critiqueData, chatHistory]);


    // --- CHAT LOGIC ---
    useEffect(() => {
        setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [chatHistory]);

    const handleSendMessage = async (message: string, file?: AttachedFile | null) => {
        if ((!message.trim() && !file) || isLoading) return;
        
        const newHistory: ChatMessage[] = [...chatHistory, { sender: 'user', text: message, file: file || undefined }];
        setChatHistory(newHistory);
            setTranscriptRecord(createTranscriptRecord(newHistory));
        setUserInput('');
        setIsLoading(true);
        setIsAiThinking(true);
        
        const conversationText = newHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
        
        try {
            // Run conversation step and name extraction in parallel if we don't have a name yet
            const [responseText, extractedName] = await Promise.all([
                AIService.getNextConversationStep(conversationText, file, conciergeMode, memoryEntries),
                projectName === 'Untitled Project' 
                    ? AIService.extractProjectName(conversationText) 
                    : Promise.resolve(projectName)
            ]);
            
            if (extractedName && extractedName !== 'Untitled Project') {
                setProjectName(extractedName);
            }
            
            setCostReport(AIService.getLMCostReport());
            setIsAiThinking(false);
            setChatHistory(prev => [...prev, { sender: 'ai', text: responseText }]);
            const extractedMemory = await AIService.extractStructuredMemory(conversationText, memoryEntries);
            const mergedMemory = extractedMemory.entries.length ? mergeMemoryEntries(memoryEntries, extractedMemory.entries) : memoryEntries;
            if (extractedMemory.entries.length) setMemoryEntries(mergedMemory);
            setConciergeMode(deriveConciergeMode(extractedName || projectName, conversationText, mergedMemory));
        } catch (error) {
            console.error("Chat error:", error);
            setChatHistory(prev => [...prev, { sender: 'ai', text: "I'm sorry, I encountered an error. Please try again." }]);
            setIsAiThinking(false);
        } finally {
            setIsLoading(false);
            userInputRef.current?.focus();
        }
    };

    const handleGetChatSuggestion = async () => {
        if (isLoading || isHelperLoading) return;

        setIsHelperLoading(true);
        try {
            const conversationText = getConversationText();
            const suggestion = await AIService.getChatSuggestion(conversationText);
            setCostReport(AIService.getLMCostReport());
            setUserInput(suggestion);
            userInputRef.current?.focus();
        } finally {
            setIsHelperLoading(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            let mimeType = file.type;
            let data: string;

            if (mimeType.startsWith('image/')) {
                data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } else if (mimeType === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                const textPromises = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    textPromises.push(pdf.getPage(i).then(page => page.getTextContent()));
                }
                const textContents = await Promise.all(textPromises);
                data = textContents.map(tc => tc.items.map((item: any) => item.str).join(' ')).join('\n').trim();

            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                data = result.value;
            } else if (mimeType === 'text/plain') {
                 data = await file.text();
            } else {
                alert(`Unsupported file type: ${mimeType}. Please upload an image, PDF, DOCX, or TXT file.`);
                return;
            }
            
            const messageText = `I've uploaded a document for review: "${file.name}".`;
            const uploadedFile: AttachedFile = { name: file.name, data, mimeType };

            await handleSendMessage(messageText, uploadedFile);
             
        } catch (error) {
             console.error("Error processing file:", error);
             alert("Sorry, there was an error reading that file. Please try again.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const handleCritiqueResponseAndGenerate = async () => {
        console.log("[App] handleCritiqueResponseAndGenerate called");
        if (critiqueAnswers.some(a => !a.trim())) {
             alert("Please answer all critique questions before proceeding.");
             return;
        }
        
        try {
            const answersText = critiqueData?.questions.map((q, i) => `Question: ${q}\nAnswer: ${critiqueAnswers[i] || '(No answer provided)'}`).join('\n\n');
            
            const finalHistory: ChatMessage[] = [...chatHistory, {
                sender: 'user',
                text: `Here are my answers to the technical critique questions:\n\n${answersText}`
            }];
            setChatHistory(finalHistory);
            setTranscriptRecord(createTranscriptRecord(finalHistory));
            const conversationText = finalHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
            const completedCritique = { summary: critiqueData?.summary || '', questions: critiqueData?.questions || [], answers: critiqueAnswers, completed: true, source: 'technical-analyst' as const };
            if (!validateCritiqueRecord(completedCritique).valid) { alert('Please complete the technical critique before generating.'); return; }
            setCritiqueRecord(completedCritique);

            const specialistContext = buildPersonaSpecialistContext(conversationText, memoryEntries, completedCritique);
            let completedRiskCritique = riskCritique;
            setWorkflowError(null);
            setWorkflowState(WorkflowStep.GENERATING);
            setGenerationStatus({ key: 'persona', isActive: true, progress: 5, message: 'Senior Technical Analyst is reviewing completed critique answers...', title: 'Completing Persona Review' });
            try {
                const [completedUserProxy, generatedRiskCritique] = await Promise.all([
                    AIService.generateUserProxy(specialistContext),
                    AIService.generateRiskCritique(specialistContext),
                ]);
                setUserProxy(completedUserProxy);
                completedRiskCritique = generatedRiskCritique;
                setRiskCritique(completedRiskCritique);
            } catch (error) {
                console.error('Completed-critique persona specialist generation failed:', error);
                setWorkflowError('User Proxy or Senior Technical Analyst review could not be generated. Core document generation will continue, but retry the critique workflow if those records are required.');
            }

            setGenerationStatus({ key: 'gdd', isActive: true, progress: 10, message: 'Expanding conversation...', title: 'Generating Core Document' });

            const text = await AIService.getExpandedText(conversationText);
            setExpandedText(text);
            setCostReport(AIService.getLMCostReport());
            setGenerationStatus(prev => ({ ...prev, progress: 30, message: 'Creating table of contents...' }));
            
            const name = await AIService.extractProjectName(conversationText);
            setProjectName(name);
            setCostReport(AIService.getLMCostReport());

            const toc = await AIService.generateGDDTableOfContents(text);
            setCostReport(AIService.getLMCostReport());
            setGenerationStatus(prev => ({ ...prev, progress: 60, message: 'Generating document sections...' }));
            
            const gdd = await AIService.generateFullGDDV2(text, toc, name);
            setGddContent(gdd);
            const synthesized = await AIService.generateSynthesis(JSON.stringify({ gdd, memoryEntries, critique: completedCritique, risks: completedRiskCritique }), ['gdd', 'memory', 'critique', 'risks']);
            setSynthesis(synthesized);
            setGddGenerated(true);
            setGenerationStatus(prev => ({ ...prev, progress: 100, message: 'Complete!' }));
            
            setCostReport(AIService.getLMCostReport());
            setGenerationStatus({ key: null, isActive: false, progress: 0, message: '', title: '' });
            setWorkflowState(WorkflowStep.COMPLETE);
        } catch (error) {
            console.error("Failed to generate GDD:", error);
            setWorkflowError(error instanceof Error ? error.message : 'Core document generation failed.');
            setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error generating core document.', title: 'Error' });
        }
    };

    const handleRunUnifiedPipeline = async () => {
        if (generationStatus.isActive) return;
        setWorkflowState(WorkflowStep.GENERATING);
        setGenerationStatus({ key: 'pipeline', isActive: true, progress: 0, message: 'Starting full generation pipeline...', title: 'Running Full Pipeline' });
        try {
            const conversationText = getConversationText();
            const onProgress = (percent: number, message: string) => setGenerationStatus(prev => ({ ...prev, progress: percent, message }));
            const currentCritique = critiqueRecord || (critiqueData ? { summary: critiqueData.summary, questions: critiqueData.questions, answers: critiqueAnswers, completed: critiqueAnswers.length === critiqueData.questions.length && critiqueAnswers.every(answer => answer.trim()), source: 'technical-analyst' as const } : undefined);
            const pkg = await runUnifiedPipeline(conversationText, projectName, scopeReviewLens, activePitchDeckSlides, activeVisualAssets, onProgress, currentCritique, chatHistory);

            // Apply returned package to local state
            setExpandedText(pkg.expandedText);
            setGddContent(pkg.gddContent || []);
            setPitchDeckContent(pkg.pitchDeckContent || []);
            setGeneratedImages(pkg.generatedImages || {});
            setScopeReviewValidation(pkg.scopeReviewValidation);
            setPitchDeckValidation(pkg.pitchDeckValidation);
            setCritiqueRecord(pkg.critiqueRecord);
            setGenerationMetadata(pkg.generationMetadata);
            setTranscriptRecord(pkg.transcriptRecord || createTranscriptRecord(pkg.chatHistory || []));
            setMemoryEntries(pkg.memoryEntries || []);
            setConciergeMode(pkg.conciergeMode || 'information-gatherer');
            setProductionBriefs(pkg.productionBriefs || null);
            setAssetMetadata(pkg.assetMetadata || null);
            setVisualPromptContracts(pkg.visualPromptContracts || null);
            setMvpDefinition(pkg.mvpDefinition || null);
            setMvpFeatureSpecs(pkg.mvpFeatureSpecs || null);
            setMvpFeatureSpecValidation(pkg.mvpFeatureSpecValidation || []);
            setTddContent(pkg.tddContent || null);
            setTechnicalDesignDocument(pkg.technicalDesignDocument || null);
            setModularBreakdown(pkg.modularBreakdown || null);
            setAssetList(pkg.assetList || null);
            setScopeReviewContent(pkg.scopeReviewContent || null);

            setGddGenerated(!!(pkg.gddContent && pkg.gddContent.length));
            setPitchDeckGenerated(!!(pkg.pitchDeckContent && pkg.pitchDeckContent.length));
            setMvpGenerated(!!pkg.mvpDefinition);
            setTddSpecsGenerated(!!(pkg.tddContent && pkg.tddContent.length));
            setTddDocGenerated(!!(pkg.technicalDesignDocument && pkg.technicalDesignDocument.length));
            setModularBreakdownGenerated(!!(pkg.modularBreakdown && pkg.modularBreakdown.length));
            setAssetListGenerated(!!pkg.assetList);
            setScopeReviewGenerated(!!(pkg.scopeReviewContent && pkg.scopeReviewContent.length));

            setCostReport(AIService.getLMCostReport());
            setGenerationStatus({ key: null, isActive: false, progress: 100, message: 'Pipeline complete!', title: 'Done' });
            setWorkflowState(WorkflowStep.COMPLETE);
        } catch (err) {
            console.error('Pipeline error:', err);
            if (err instanceof UnifiedPipelineCritiqueGateError) alert(err.message);
            if (err instanceof MVPFeatureSpecGenerationError) {
                setMvpFeatureSpecValidation(err.outcomes);
            }
            setGenerationStatus({ key: null, isActive: false, progress: 0, message: 'Error running pipeline.', title: 'Error' });
        }
    };

    const handleCritiqueAnswerChange = (index: number, value: string) => {
        const newAnswers = [...critiqueAnswers];
        newAnswers[index] = value;
        setCritiqueAnswers(newAnswers);
    };

    const handleGetCritiqueHelp = async (index: number) => {
        if (critiqueHelperLoadingIndex !== null) return;

        setCritiqueHelperLoadingIndex(index);
        try {
            const question = critiqueData?.questions[index];
            if (question) {
                const conversationText = getConversationText();
                const suggestion = await AIService.getCritiqueAnswerSuggestion(conversationText, question);
                setCostReport(AIService.getLMCostReport());
                handleCritiqueAnswerChange(index, suggestion);
            }
        } finally {
            setCritiqueHelperLoadingIndex(null);
        }
    };

    // --- DOWNLOAD HANDLERS ---
    const assembleProjectPackage = (): ProjectPackage => {
        return {
            meta: { projectName, generatedAt: Date.now(), projectId: activeProjectId || undefined },
            chatHistory,
            critiqueQA: { summary: critiqueData?.summary || '', questions: critiqueData?.questions || [], answers: critiqueAnswers || [] },
            expandedText,
            gddContent,
            pitchDeckContent,
            generatedImages,
            critiqueRecord,
            generationMetadata,
            transcriptRecord,
            memoryEntries,
            conciergeMode,
            userProxy,
            riskCritique,
            synthesis,
            mvpDefinition,
            mvpFeatureSpecValidation,
            generationDiagnostic,
            mvpFeatureSpecs,
            tddContent,
            technicalDesignDocument,
            modularBreakdown,
            assetList,
            productionBriefs,
            assetMetadata,
            visualPromptContracts,
            scopeReviewValidation,
            pitchDeckValidation,
            scopeReviewContent,
        };
    };

    const currentProjectPackage = useMemo(() => assembleProjectPackage(), [
        activeProjectId, projectName, chatHistory, critiqueData, critiqueAnswers, critiqueRecord,
        generationMetadata, transcriptRecord, memoryEntries, conciergeMode, userProxy, riskCritique,
        synthesis, expandedText, gddContent, pitchDeckContent, generatedImages, mvpDefinition,
        mvpFeatureSpecs, mvpFeatureSpecValidation, generationDiagnostic, tddContent, technicalDesignDocument,
        modularBreakdown, assetList, productionBriefs, assetMetadata, visualPromptContracts,
        scopeReviewValidation, pitchDeckValidation, scopeReviewContent,
    ]);

    const startDownload = (filename: string) => {
        setIsDownloading(true);
        setDownloadProgress(0);
        setDownloadMessage(`Preparing ${filename}...`);
    };

    const handleDownloadMarkdown = async (sectionKey?: 'gdd' | 'pitch' | 'mvp' | 'tdd_specs' | 'tdd_final' | 'assets' | 'modular_breakdown' | 'scope_review') => {
        console.log(`[Download] Starting Markdown export for ${sectionKey || 'full project'}...`);
        const filename = sectionKey 
            ? `${projectName.replace(/\s+/g, '_')}_${sectionKey}.md`
            : `${projectName.replace(/\s+/g, '_')}_Project_Package.md`;

        startDownload(filename);

        try {
            setDownloadProgress(20);
            setDownloadMessage("Assembling Markdown document...");
            const pkg = assembleProjectPackage();
            const md = exportMarkdown(pkg);
            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setDownloadProgress(100);
            setDownloadMessage("Download complete!");
            finishDownload();
        } catch (error) {
            console.error("Markdown export failed:", error);
            setDownloadMessage("Export failed. Check console.");
            finishDownload();
        }
    };

    const handleDownloadText = async (sectionKey?: 'gdd' | 'pitch' | 'mvp' | 'tdd_specs' | 'tdd_final' | 'assets' | 'modular_breakdown' | 'scope_review') => {
        console.log(`[Download] Starting Plain Text export for ${sectionKey || 'full project'}...`);
        const filename = sectionKey 
            ? `${projectName.replace(/\s+/g, '_')}_${sectionKey}.txt`
            : `${projectName.replace(/\s+/g, '_')}_Project_Package.txt`;
        startDownload(filename);

        try {
            setDownloadProgress(20);
            setDownloadMessage("Assembling Text document...");
            const pkg = assembleProjectPackage();
            const txt = exportText(pkg);
            const blob = new Blob([txt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setDownloadProgress(100);
            setDownloadMessage("Download complete!");
            finishDownload();
        } catch (error) {
            console.error("Text export failed:", error);
            setDownloadMessage("Export failed. Check console.");
            finishDownload();
        }
    };

    const handleDownloadJSON = async () => {
        const filename = `${projectName.replace(/\s+/g, '_')}_Project_Package.json`;
        startDownload(filename);

        try {
            setDownloadProgress(20);
            setDownloadMessage("Assembling JSON package...");
            const json = exportJSON(assembleProjectPackage());
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setDownloadProgress(100);
            setDownloadMessage("Download complete!");
            finishDownload();
        } catch (error) {
            console.error("JSON export failed:", error);
            setDownloadMessage("Export failed. Check console.");
            finishDownload();
        }
    };

    const handleDownloadHTML = async (sectionKey?: 'gdd' | 'pitch' | 'mvp' | 'tdd_specs' | 'tdd_final' | 'assets' | 'modular_breakdown' | 'scope_review') => {
        console.log(`[Download] Starting HTML export for ${sectionKey || 'full project'}...`);
        const sectionNames: Record<string, string> = {
            'gdd': 'Design_Document',
            'pitch': 'Pitch_Deck',
            'mvp': 'MVP_Definition',
            'tdd_specs': 'MVP_Feature_Specifications',
            'tdd_final': 'Technical_Design_Document',
            'assets': 'Asset_List',
            'modular_breakdown': 'Freelance_Briefs',
            'scope_review': 'Scope_Review'
        };

        const filename = sectionKey 
            ? `${projectName.replace(/\s+/g, '_')}_${sectionNames[sectionKey]}.html`
            : `${projectName.replace(/\s+/g, '_')}_Project_Package.html`;
            
        startDownload(filename);
        
        try {
            setDownloadProgress(20);
            setDownloadMessage("Assembling HTML document...");

            const sections: string[] = [];
            const toc: { id: string; title: string }[] = [];

            const escape = (str: string) => str.replace(/[&<>"']/g, (m) => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[m] || m));

            const formatContent = (content: string | any[]) => {
                if (Array.isArray(content)) {
                    return content.map(item => {
                        if (typeof item === 'object' && item !== null) {
                            if ('story' in item) {
                                return `<div class="mb-6 pl-4 border-l-2 border-brand-primary/20">
                                    <p class="text-lg font-bold text-brand-text mb-2">As a player, I want to ${escape(item.story)}</p>
                                    <div class="space-y-1">
                                        <p class="text-sm font-semibold text-brand-text-muted uppercase tracking-wider">Acceptance Criteria:</p>
                                        <ul class="list-none space-y-1">
                                            ${(item.acceptanceCriteria as string[]).map(ac => `<li class="text-brand-text-muted flex gap-2"><span class="text-brand-primary font-bold">*</span> ${escape(ac)}</li>`).join('')}
                                        </ul>
                                    </div>
                                </div>`;
                            }
                            if ('component' in item) {
                                return `<div class="mb-6 pl-4 border-l-2 border-brand-primary/20">
                                    <p class="text-lg font-bold text-brand-text mb-2">${escape(item.component)}</p>
                                    <div class="prose prose-invert prose-sm max-w-none bg-brand-bg/30 p-4 rounded-lg border border-brand-border">
                                        ${marked.parse(cleanHtmlComments(item.details))}
                                    </div>
                                </div>`;
                            }
                        }
                        return `<div class="prose prose-invert prose-sm max-w-none mb-4">${marked.parse(cleanHtmlComments(String(item)))}</div>`;
                    }).join('');
                }
                
                return `<div class="prose prose-invert prose-sm max-w-none">${marked.parse(cleanHtmlComments(content))}</div>`;
            };

            if ((!sectionKey || sectionKey === 'gdd') && gddGenerated && gddContent.length > 0) {
                const id = 'section-gdd';
                toc.push({ id, title: 'Design Document (GDD/PRD)' });
                let gddHtml = `<details id="${id}" class="group mb-4 bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-lg">
                    <summary class="list-none p-6 bg-brand-secondary/10 cursor-pointer hover:bg-brand-secondary/20 transition-colors flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-brand-secondary">Design Document (GDD/PRD)</h2>
                        <div class="flex items-center gap-4">
                            <span class="text-brand-text-muted group-open:rotate-180 transition-transform text-2xl">▼</span>
                        </div>
                    </summary>
                    <div class="p-6 space-y-4 border-t border-brand-border">`;
                
                gddContent.forEach((section) => {
                    const style = getGDDSectionStyle(section.title);
                    const Tag = style.tag;
                    gddHtml += `<details class="group border border-brand-border/50 rounded-lg overflow-hidden">
                        <summary class="list-none p-4 bg-brand-bg/50 cursor-pointer hover:bg-brand-border/20 transition-colors flex justify-between items-center">
                            <${Tag} class="${style.className.replace('mt-8', 'mt-0').replace('mt-6', 'mt-0').replace('mt-4', 'mt-0')}">${escape(section.title)}</${Tag}>
                            <span class="text-brand-text-muted group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div class="p-6 border-t border-brand-border">
                            <div class="prose prose-invert prose-sm max-w-none">
                                ${marked.parse(cleanHtmlComments(section.content).replace(/^\s*-{3,}\s*$/gm, '').trim())}
                            </div>
                        </div>
                    </details>`;
                });
                
                gddHtml += `</div></details>`;
                sections.push(gddHtml);
            }

            if ((!sectionKey || sectionKey === 'pitch') && pitchDeckGenerated && pitchDeckContent.length > 0) {
                const id = 'section-pitch';
                toc.push({ id, title: 'Pitch Deck' });
                let pitchHtml = `<details id="${id}" class="group mb-4 bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-lg">
                    <summary class="list-none p-6 bg-brand-secondary/10 cursor-pointer hover:bg-brand-secondary/20 transition-colors flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-brand-secondary">Pitch Deck</h2>
                        <span class="text-brand-text-muted group-open:rotate-180 transition-transform text-2xl">▼</span>
                    </summary>
                    <div class="p-6 space-y-8 border-t border-brand-border">`;
                
                pitchDeckContent.forEach((slide, i) => {
                    const slideWithVisual = slide.visualPrompt && generatedImages[slide.visualPrompt];
                    pitchHtml += `<div class="bg-brand-bg border border-brand-border rounded-lg overflow-hidden flex flex-col min-h-[500px]">
                        <div class="px-6 py-4 bg-brand-surface/50 border-b border-brand-border">
                            <h4 class="text-xl font-bold text-brand-primary">SLIDE ${i + 1}: ${escape(slide.title)}</h4>
                        </div>
                        <div class="flex flex-col md:flex-row flex-grow">
                            ${slideWithVisual ? `
                                <div class="md:w-1/2 p-4 flex items-center justify-center bg-black/20">
                                    <img src="data:image/jpeg;base64,${generatedImages[slide.visualPrompt!]}" alt="${escape(slide.title)}" class="max-w-full max-h-96 object-contain rounded shadow-md"/>
                                </div>
                                <div class="md:w-1/2 p-8 flex flex-col justify-center">
                                    <div class="prose prose-invert prose-lg max-w-none">
                                        ${marked.parse(cleanHtmlComments(slide.content).replace(/^\s*-{3,}\s*$/gm, '').trim())}
                                    </div>
                                </div>
                            ` : `
                                <div class="w-full p-12 flex items-center justify-center text-center">
                                    <div class="prose prose-invert prose-2xl max-w-none">
                                        ${marked.parse(cleanHtmlComments(slide.content).replace(/^\s*-{3,}\s*$/gm, '').trim())}
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>`;
                });
                
                pitchHtml += `</div></details>`;
                sections.push(pitchHtml);
            }

            if ((!sectionKey || sectionKey === 'mvp') && mvpGenerated && mvpDefinition) {
                const id = 'section-mvp';
                toc.push({ id, title: 'MVP Definition' });
                let mvpHtml = `<details id="${id}" class="group mb-4 bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-lg">
                    <summary class="list-none p-6 bg-brand-secondary/10 cursor-pointer hover:bg-brand-secondary/20 transition-colors flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-brand-secondary">MVP Definition</h2>
                        <span class="text-brand-text-muted group-open:rotate-180 transition-transform text-2xl">▼</span>
                    </summary>
                    <div class="p-6 space-y-6 border-t border-brand-border">
                        <div class="p-4 bg-brand-bg/50 rounded-lg border border-brand-border">
                            <h3 class="text-lg font-bold text-brand-primary mb-2">Summary</h3>
                            <p class="text-brand-text-muted">${escape(mvpDefinition.summary)}</p>
                        </div>
                        <div class="grid md:grid-cols-2 gap-6">
                            <div class="p-4 bg-green-900/10 rounded-lg border border-green-500/30">
                                <h3 class="text-lg font-bold text-green-400 mb-3">In Scope</h3>
                                <ul class="space-y-2">
                                    ${(mvpDefinition.inScope as string[]).map(item => `<li class="text-brand-text-muted flex items-start gap-2"><span class="text-green-400">✓</span> ${escape(item)}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="p-4 bg-red-900/10 rounded-lg border border-red-500/30">
                                <h3 class="text-lg font-bold text-red-400 mb-3">Out of Scope</h3>
                                <ul class="space-y-2">
                                    ${(mvpDefinition.outOfScope as string[]).map(item => `<li class="text-brand-text-muted flex items-start gap-2"><span class="text-red-400">✕</span> ${escape(item)}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </details>`;
                sections.push(mvpHtml);
            }

            if ((!sectionKey || sectionKey === 'tdd_specs') && tddSpecsGenerated && tddContent) {
                const id = 'section-tdd-specs';
                toc.push({ id, title: 'MVP Feature Specifications' });
                let tddHtml = `<details id="${id}" class="group mb-4 bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-lg">
                    <summary class="list-none p-6 bg-brand-secondary/10 cursor-pointer hover:bg-brand-secondary/20 transition-colors flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-brand-secondary">MVP Feature Specifications</h2>
                        <span class="text-brand-text-muted group-open:rotate-180 transition-transform text-2xl">▼</span>
                    </summary>
                    <div class="p-6 space-y-4 border-t border-brand-border">`;
                
                tddContent.forEach((feature) => {
                    tddHtml += `<details class="group border border-brand-border/50 rounded-lg overflow-hidden">
                        <summary class="list-none p-4 bg-brand-bg/50 cursor-pointer hover:bg-brand-border/20 transition-colors flex justify-between items-center">
                            <h3 class="text-lg font-bold text-brand-primary">${escape(feature.feature)}</h3>
                            <span class="text-brand-text-muted group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div class="p-6 border-t border-brand-border/30 bg-brand-surface/30">
                            <div class="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h4 class="text-lg font-bold text-brand-primary mb-3 pb-2 border-b border-brand-border">User Stories & Criteria</h4>
                                    <div class="space-y-2">${formatContent(feature.userStories)}</div>
                                </div>
                                <div>
                                    <h4 class="text-lg font-bold text-brand-primary mb-3 pb-2 border-b border-brand-border">Technical Specifications</h4>
                                    <div class="space-y-2">${formatContent(feature.technicalSpecs)}</div>
                                </div>
                            </div>
                        </div>
                    </details>`;
                });
                
                tddHtml += `</div></details>`;
                sections.push(tddHtml);
            }

            if ((!sectionKey || sectionKey === 'tdd_final') && tddDocGenerated && technicalDesignDocument) {
                const id = 'section-tdd-final';
                toc.push({ id, title: 'Technical Design Document (TDD)' });
                let tddDocHtml = `<details id="${id}" class="group mb-4 bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-lg">
                    <summary class="list-none p-6 bg-brand-secondary/10 cursor-pointer hover:bg-brand-secondary/20 transition-colors flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-brand-secondary">Technical Design Document (TDD)</h2>
                        <span class="text-brand-text-muted group-open:rotate-180 transition-transform text-2xl">▼</span>
                    </summary>
                    <div class="p-6 space-y-4 border-t border-brand-border">`;
                
                technicalDesignDocument.forEach((section) => {
                    const style = getGDDSectionStyle(section.title);
                    const Tag = style.tag;
                    tddDocHtml += `<details class="group border border-brand-border/50 rounded-lg overflow-hidden">
                        <summary class="list-none p-4 bg-brand-bg/50 cursor-pointer hover:bg-brand-border/20 transition-colors flex justify-between items-center">
                            <${Tag} class="${style.className.replace('mt-8', 'mt-0').replace('mt-6', 'mt-0').replace('mt-4', 'mt-0')}">${escape(section.title)}</${Tag}>
                            <span class="text-brand-text-muted group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div class="p-6 border-t border-brand-border">
                            <div class="prose prose-invert prose-sm max-w-none font-mono">
                                ${marked.parse(cleanHtmlComments(section.content).replace(/^\s*-{3,}\s*$/gm, '').trim())}
                            </div>
                        </div>
                    </details>`;
                });
                
                tddDocHtml += `</div></details>`;
                sections.push(tddDocHtml);
            }

            if ((!sectionKey || sectionKey === 'assets') && assetListGenerated && assetList) {
                const id = 'section-assets';
                toc.push({ id, title: 'Asset List' });
                let assetHtml = `<details id="${id}" class="group mb-4 bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-lg">
                    <summary class="list-none p-6 bg-brand-secondary/10 cursor-pointer hover:bg-brand-secondary/20 transition-colors flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-brand-secondary">Asset List</h2>
                        <span class="text-brand-text-muted group-open:rotate-180 transition-transform text-2xl">▼</span>
                    </summary>
                    <div class="p-6 space-y-6 border-t border-brand-border">`;
                
                Object.entries(assetList).forEach(([category, items]) => {
                    assetHtml += `<div class="p-4 bg-brand-bg/50 rounded-lg border border-brand-border">
                        <h3 class="text-lg font-bold text-brand-primary mb-3 uppercase tracking-wider">${escape(category.replace(/_/g, ' '))}</h3>
                        <ul class="space-y-2">
                            ${(items as string[]).map(item => `<li class="text-brand-text-muted flex items-start gap-2"><span class="text-brand-primary">•</span> ${escape(item)}</li>`).join('')}
                        </ul>
                    </div>`;
                });
                
                assetHtml += `</div></details>`;
                sections.push(assetHtml);
            }

            if ((!sectionKey || sectionKey === 'modular_breakdown') && modularBreakdownGenerated && modularBreakdown) {
                const id = 'section-briefs';
                toc.push({ id, title: 'Freelance Briefs' });
                let briefHtml = `<details id="${id}" class="group mb-4 bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-lg">
                    <summary class="list-none p-6 bg-brand-secondary/10 cursor-pointer hover:bg-brand-secondary/20 transition-colors flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-brand-secondary">Freelance Briefs</h2>
                        <span class="text-brand-text-muted group-open:rotate-180 transition-transform text-2xl">▼</span>
                    </summary>
                    <div class="p-6 space-y-4 border-t border-brand-border">`;
                
                modularBreakdown.forEach((brief) => {
                    briefHtml += `<details class="group border border-brand-border/50 rounded-lg overflow-hidden">
                        <summary class="list-none p-4 bg-brand-bg/50 cursor-pointer hover:bg-brand-border/20 transition-colors flex justify-between items-center">
                            <h3 class="text-lg font-bold text-brand-primary">${escape(brief.title)}</h3>
                            <span class="text-brand-text-muted group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div class="p-6 text-brand-text-muted border-t border-brand-border">
                            <div class="prose prose-invert prose-sm max-w-none">
                                ${marked.parse(cleanHtmlComments(brief.content).trim())}
                            </div>
                        </div>
                    </details>`;
                });
                
                briefHtml += `</div></details>`;
                sections.push(briefHtml);
            }

            if ((!sectionKey || sectionKey === 'scope_review') && scopeReviewGenerated && scopeReviewContent) {
                const id = 'section-scope';
                toc.push({ id, title: 'Scope Critical Review' });
                let scopeHtml = `<details id="${id}" class="group mb-4 bg-brand-surface rounded-xl border border-brand-border overflow-hidden shadow-lg">
                    <summary class="list-none p-6 bg-brand-secondary/10 cursor-pointer hover:bg-brand-secondary/20 transition-colors flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-brand-secondary">Scope Critical Review</h2>
                        <span class="text-brand-text-muted group-open:rotate-180 transition-transform text-2xl">▼</span>
                    </summary>
                    <div class="p-6 space-y-6 border-t border-brand-border">`;
                
                scopeReviewContent.forEach((point) => {
                    scopeHtml += `<div class="p-6 bg-brand-bg/50 rounded-lg border border-brand-border">
                        <h3 class="text-xl font-bold text-brand-primary mb-2">${escape(point.feature)}</h3>
                        <div class="mb-4">
                            <span class="px-2 py-1 rounded text-xs font-bold uppercase ${
                                point.severity === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                point.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                'bg-green-500/20 text-green-400 border border-green-500/30'
                            }">Severity: ${point.severity}</span>
                        </div>
                        <div class="grid gap-4">
                            <div>
                                <h4 class="text-sm font-bold text-brand-text uppercase tracking-wider mb-1">Critique</h4>
                                <p class="text-brand-text-muted">${escape(point.critique)}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-brand-text uppercase tracking-wider mb-1">Suggestion</h4>
                                <p class="text-brand-text-muted">${escape(point.suggestion)}</p>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-brand-text uppercase tracking-wider mb-1">Reasoning</h4>
                                <p class="text-brand-text-muted">${escape(point.reasoning)}</p>
                            </div>
                        </div>
                    </div>`;
                });
                
                scopeHtml += `</div></details>`;
                sections.push(scopeHtml);
            }

            const tocHtml = toc.length > 1 ? `
                <nav id="toc" class="mb-12 p-6 bg-brand-surface rounded-xl border border-brand-border shadow-lg">
                    <h2 class="text-xl font-bold text-brand-primary mb-4">Table of Contents</h2>
                    <ul class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        ${toc.map(item => `<li><a href="#${item.id}" class="text-brand-text hover:text-brand-primary transition-colors flex items-center gap-2"><span class="text-brand-primary">→</span> ${item.title}</a></li>`).join('')}
                    </ul>
                </nav>
            ` : '';

            const fullHtml = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escape(projectName)} - ${sectionKey ? sectionNames[sectionKey].replace(/_/g, ' ') : 'Project Package'}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'brand-bg': '#0a0a0a',
                        'brand-surface': '#141414',
                        'brand-primary': '#00A99D',
                        'brand-secondary': '#6A4C93',
                        'brand-text': '#EAEAEA',
                        'brand-text-muted': '#9E9E9E',
                        'brand-border': '#262626',
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap');
        body { background-color: #0a0a0a; color: #EAEAEA; font-family: 'Inter', sans-serif; }
        summary::-webkit-details-marker { display: none; }
        details summary { list-style: none; }
        .whitespace-pre-wrap { white-space: pre-wrap; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: #00A99D; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: bold; }
        .markdown-content h4, .markdown-content h5, .markdown-content h6 { color: #EAEAEA; margin-top: 1.25rem; margin-bottom: 0.5rem; font-weight: bold; }
        .markdown-content p { margin-bottom: 1rem; line-height: 1.6; }
        .markdown-content ul, .markdown-content ol { margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc; }
        .markdown-content li { margin-bottom: 0.25rem; }
        .markdown-content code { background-color: #1E1E1E; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; color: #00FFCC; }
        .markdown-content pre { background-color: #1E1E1E; padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; border: 1px solid #333; }
        .markdown-content pre code { background-color: transparent; padding: 0; color: #EAEAEA; }
        .markdown-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; border: 1px solid #333; }
        .markdown-content th, .markdown-content td { border: 1px solid #333; padding: 0.75rem; text-align: left; }
        .markdown-content th { background-color: #1E1E1E; color: #00A99D; }
        .markdown-content tr:nth-child(even) { background-color: #1A1A1A; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #262626; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #333; }
    </style>
</head>
<body class="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto">
    <header class="mb-12">
        <div class="flex items-center justify-center gap-4 mb-4">
            <h1 class="text-4xl md:text-6xl font-bold text-brand-primary">${escape(projectName)}</h1>
            <span class="px-3 py-1 bg-brand-primary/20 text-brand-primary border border-brand-primary/30 rounded text-xs font-bold uppercase tracking-wider">
                Stable
            </span>
        </div>
        <p class="text-xl text-brand-text-muted text-center">${sectionKey ? sectionNames[sectionKey].replace(/_/g, ' ') : 'Complete Project Documentation Package'}</p>
    </header>
    
    ${tocHtml}

    <main>
        ${sections.join('\n')}
    </main>
    
    <footer class="mt-12 pt-8 border-t border-brand-border text-center text-brand-text-muted text-sm">
        Generated by Dev Doctor AI &bull; ${new Date().toLocaleDateString()}
    </footer>
</body>
</html>`;

            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setDownloadProgress(100);
            setDownloadMessage("Download complete!");
            setTimeout(() => finishDownload(), 1000);

        } catch (error) {
            console.error("Failed to generate HTML export:", error);
            setDownloadMessage("Export failed. Check console.");
            setTimeout(() => finishDownload(), 3000);
        }
    };

    const finishDownload = (pdf?: jsPDF, filename?: string) => {
        if (pdf && filename) {
            pdf.save(filename);
        }
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadMessage('');
    };

    const generateTextPdf = async (
        title: string,
        filename: string,
        contentBuilder: (pdf: jsPDF, y: { current: number }, checkPageBreak: (spaceNeeded: number) => void) => void | Promise<void>
    ) => {
        startDownload(filename);
        try {
            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            const pageMargin = 50;
            const pageHeight = pdf.internal.pageSize.getHeight();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const contentWidth = pageWidth - (pageMargin * 2);
            let y = { current: pageMargin };

            const checkPageBreak = (spaceNeeded: number) => {
                if (y.current + spaceNeeded > pageHeight - pageMargin) {
                    pdf.addPage();
                    y.current = pageMargin;
                }
            };

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(24);
            pdf.setTextColor('#00A99D');
            let textLinesResult: any = pdf.splitTextToSize(projectName, contentWidth);
            let textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
            pdf.text(textLines, pageWidth / 2, y.current, { align: 'center' });
            y.current += textLines.length * 24 + 10;
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(14);
            pdf.setTextColor('#9E9E9E');
            textLinesResult = pdf.splitTextToSize(title, contentWidth);
            textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
            pdf.text(textLines, pageWidth / 2, y.current, { align: 'center' });
            y.current += textLines.length * 14 + 30;

            await Promise.resolve(contentBuilder(pdf, y, checkPageBreak));

            finishDownload(pdf, filename);
        } catch (error) {
            console.error(`Failed to generate ${title} PDF:`, error);
            alert(`Sorry, an error occurred while generating the ${title} PDF.`);
            setIsDownloading(false);
        }
    };

    const renderDocumentSectionToPdf = (
        pdf: jsPDF,
        section: GDDSection | TechnicalDesignSection,
        y: { current: number },
        checkPageBreak: (spaceNeeded: number) => void
    ) => {
        const pageMargin = 50;
        const contentWidth = pdf.internal.pageSize.getWidth() - pageMargin * 2;
    
        const style = getGDDSectionStyle(section.title);
        let fontSize = 10;
        let isBold = false;
        let color = '#EAEAEA';
        let spaceBefore = 0;

        switch (style.tag) {
            case 'h2':
                fontSize = 18; isBold = true; color = '#6A4C93'; spaceBefore = 15; break;
            case 'h3':
                fontSize = 14; isBold = true; color = '#00A99D'; spaceBefore = 10; break;
            case 'h4':
                fontSize = 12; isBold = true; color = '#EAEAEA'; spaceBefore = 8; break;
        }

        checkPageBreak(fontSize + spaceBefore);
        y.current += spaceBefore;

        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.setFontSize(fontSize);
        pdf.setTextColor(color);
        let textLinesResult: any = pdf.splitTextToSize(section.title, contentWidth);
        let textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
        checkPageBreak(textLines.length * fontSize);
        pdf.text(textLines, pageMargin, y.current);
        y.current += (textLines.length * fontSize) + 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor('#9E9E9E');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanHtmlComments(section.content).trim();
        const plainTextContent = tempDiv.textContent || tempDiv.innerText || '';

        textLinesResult = pdf.splitTextToSize(plainTextContent, contentWidth);
        textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
        checkPageBreak(textLines.length * 10);
        pdf.text(textLines, pageMargin, y.current);
        y.current += (textLines.length * 10) + 15;
    };

    const handleDownloadGDD = async () => {
        if (gddContent.length === 0) return;
        const filename = `${projectName.replace(/\s+/g, '_')}_GDD.pdf`;
        await generateTextPdf('Design Document (GDD/PRD)', filename, (pdf, y, checkPageBreak) => {
            gddContent.forEach((section, i) => {
                const progress = Math.round(((i + 1) / gddContent.length) * 100);
                setDownloadProgress(progress);
                setDownloadMessage(`Processing: ${section.title}`);
                renderDocumentSectionToPdf(pdf, section, y, checkPageBreak);
            });
        });
    };

    const handleDownloadTddDoc = async () => {
        if (!technicalDesignDocument || technicalDesignDocument.length === 0) return;
        const filename = `${projectName.replace(/\s+/g, '_')}_TDD.pdf`;
        await generateTextPdf('Technical Design Document (TDD)', filename, (pdf, y, checkPageBreak) => {
            technicalDesignDocument.forEach((section, i) => {
                const progress = Math.round(((i + 1) / technicalDesignDocument.length) * 100);
                setDownloadProgress(progress);
                setDownloadMessage(`Processing: ${section.title}`);
                renderDocumentSectionToPdf(pdf, section, y, checkPageBreak);
            });
        });
    };
    
    const handleDownloadPitchDeck = async () => {
        if (pitchDeckContent.length === 0) return;
        const filename = `${projectName.replace(/\s+/g, '_')}_Pitch_Deck.pdf`;
        startDownload(filename);
    
        const pdf = new jsPDF({ orientation: 'l', unit: 'px', format: [1280, 720] });
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.position = 'absolute';
        hiddenContainer.style.left = '-9999px';
        hiddenContainer.style.width = '1280px';
        hiddenContainer.style.height = '720px';
        document.body.appendChild(hiddenContainer);
        const root = createRoot(hiddenContainer);
    
        try {
            for (let i = 0; i < pitchDeckContent.length; i++) {
                const slide = pitchDeckContent[i];
                const progress = Math.round(((i + 1) / pitchDeckContent.length) * 100);
                setDownloadProgress(progress);
                setDownloadMessage(`Rendering slide ${i + 1}/${pitchDeckContent.length}...`);
    
                const slideWithVisual = slide.visualPrompt && generatedImages[slide.visualPrompt];
    
                const SlideComponent = (
                    <div className="bg-brand-surface border border-brand-border rounded-lg shadow-lg overflow-hidden flex flex-col h-[720px] w-[1280px] relative font-sans text-brand-text">
                        <div className="px-6 py-4 flex-shrink-0">
                            <h4 className="text-3xl font-bold text-brand-primary">SLIDE {i + 1}: {slide.title}</h4>
                        </div>
                        {slideWithVisual ? (
                        <div className="flex-grow flex flex-col items-stretch min-h-0">
                            <div className="flex-[3_3_0%] p-4 flex items-center justify-center min-h-0">
                                <img src={`data:image/jpeg;base64,${generatedImages[slide.visualPrompt!]}`} alt={slide.title} className="max-w-full max-h-full object-contain rounded-md shadow-md"/>
                            </div>
                            <div className="flex-[2_2_0%] p-8 flex flex-col justify-center text-left overflow-y-auto">
                                <div className="text-3xl text-brand-text-muted markdown-content break-words" dangerouslySetInnerHTML={{ __html: marked.parse(cleanHtmlComments(slide.content)) }} />
                            </div>
                        </div>
                        ) : (
                        <div className="flex-grow p-6 flex flex-col items-center justify-center text-center">
                            <div className="text-4xl text-brand-text-muted markdown-content break-words" dangerouslySetInnerHTML={{ __html: marked.parse(cleanHtmlComments(slide.content)) }} />
                        </div>
                        )}
                    </div>
                );
    
                root.render(SlideComponent);
    
                await new Promise(resolve => {
                    const timer = setTimeout(() => resolve(null), 3000);
                    const images = hiddenContainer.getElementsByTagName('img');
                    if (images.length === 0) {
                        clearTimeout(timer);
                        setTimeout(() => resolve(null), 500);
                        return;
                    }
    
                    let loadedCount = 0;
                    const onImageLoad = () => {
                        loadedCount++;
                        if (loadedCount === images.length) {
                            clearTimeout(timer);
                            setTimeout(() => resolve(null), 100);
                        }
                    };
    
                    Array.from(images).forEach(img => {
                        if (img.complete) {
                            onImageLoad();
                        } else {
                            img.onload = onImageLoad;
                            img.onerror = onImageLoad;
                        }
                    });
                });
    
                const canvas = await html2canvas(hiddenContainer, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, 1280, 720);
            }
            pdf.save(filename);
        } catch(e) {
             console.error("Failed to generate Pitch Deck PDF:", e);
             alert("Sorry, there was an error creating the Pitch Deck PDF.");
        } finally {
            root.unmount();
            document.body.removeChild(hiddenContainer);
            setIsDownloading(false);
            setDownloadMessage('');
        }
    };
    
    const handleDownloadAssetList = async () => {
        if (!assetList) return;
        const filename = `${projectName.replace(/\s+/g, '_')}_Asset_List.pdf`;
        await generateTextPdf("Asset List", filename, (pdf, y, checkPageBreak) => {
            const contentWidth = pdf.internal.pageSize.getWidth() - 100;
            Object.entries(assetList).forEach(([category, items], index) => {
                setDownloadProgress(Math.round(((index + 1) / Object.keys(assetList).length) * 100));
                checkPageBreak(28);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(14);
                pdf.setTextColor('#00A99D');
                pdf.text(category.replace(/_/g, ' '), 50, y.current);
                y.current += 22;
                
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.setTextColor('#9E9E9E');
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        const textLinesResult: any = pdf.splitTextToSize(`• ${item}`, contentWidth - 10);
                        const textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
                        checkPageBreak(textLines.length * 10 + 5);
                        pdf.text(textLines, 60, y.current);
                        y.current += textLines.length * 10 + 5;
                    });
                }
                y.current += 10;
            });
        });
    };
    
    const handleDownloadMVP = async () => {
        if (!mvpDefinition) return;
        const filename = `${projectName.replace(/\s+/g, '_')}_MVP_Definition.pdf`;
        await generateTextPdf("MVP Definition", filename, (pdf, y, checkPageBreak) => {
            const contentWidth = pdf.internal.pageSize.getWidth() - 100;
            
            checkPageBreak(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor('#EAEAEA');
            pdf.text('Summary', 50, y.current);
            y.current += 20;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor('#9E9E9E');
            const summaryLinesResult: any = pdf.splitTextToSize(mvpDefinition.summary, contentWidth);
            const summaryLines = Array.isArray(summaryLinesResult) ? summaryLinesResult : [summaryLinesResult];
            checkPageBreak(summaryLines.length * 10);
            pdf.text(summaryLines, 50, y.current);
            y.current += summaryLines.length * 10 + 20;

            checkPageBreak(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor('#4ade80');
            pdf.text('In Scope for MVP', 50, y.current);
            y.current += 20;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
             mvpDefinition.inScope.forEach(item => {
                const textLinesResult: any = pdf.splitTextToSize(`• ${item}`, contentWidth - 10);
                const textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
                checkPageBreak(textLines.length * 10 + 5);
                pdf.setTextColor('#9E9E9E');
                pdf.text(textLines, 60, y.current);
                y.current += textLines.length * 10 + 5;
            });
             y.current += 20;

            checkPageBreak(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor('#f87171');
            pdf.text('Out of Scope for MVP', 50, y.current);
            y.current += 20;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            mvpDefinition.outOfScope.forEach(item => {
                const textLinesResult: any = pdf.splitTextToSize(`• ${item}`, contentWidth - 10);
                const textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
                checkPageBreak(textLines.length * 10 + 5);
                pdf.setTextColor('#9E9E9E');
                pdf.text(textLines, 60, y.current);
                y.current += textLines.length * 10 + 5;
            });
        });
    };

    const handleDownloadTddSpecs = async () => {
        if (!tddContent) return;
        const filename = `${projectName.replace(/\s+/g, '_')}_MVP_Feature_Specifications.pdf`;
        await generateTextPdf("MVP Feature Specifications", filename, (pdf, y, checkPageBreak) => {
            const contentWidth = pdf.internal.pageSize.getWidth() - 100;
            const processMarkdown = (content: string | any[]) => {
                if (Array.isArray(content)) {
                    content.forEach(item => {
                        if (typeof item === 'object' && item !== null) {
                            if ('story' in item) {
                                processMarkdown(`**${item.story}**`);
                                (item.acceptanceCriteria as string[]).forEach(ac => processMarkdown(`- ${ac}`));
                            } else if ('component' in item) {
                                processMarkdown(`**${item.component}**`);
                                processMarkdown(item.details);
                            }
                        } else {
                            processMarkdown(String(item));
                        }
                    });
                    return;
                }
                content.split('\n').forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                        checkPageBreak(15);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(10);
                        pdf.setTextColor('#EAEAEA');
                        pdf.text(trimmedLine.replace(/\*\*/g, ''), 60, y.current);
                        y.current += 15;
                    } else if (trimmedLine.startsWith('- ')) {
                        const textLinesResult: any = pdf.splitTextToSize(trimmedLine, contentWidth - 20);
                        const textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
                        checkPageBreak(textLines.length * 10 + 4);
                        pdf.setFont('helvetica', 'normal');
                        pdf.setFontSize(10);
                        pdf.setTextColor('#9E9E9E');
                        pdf.text(textLines, 70, y.current);
                        y.current += textLines.length * 10 + 4;
                    }
                });
            };

            tddContent.forEach((feature, index) => {
                setDownloadProgress(Math.round(((index + 1) / tddContent.length) * 100));
                checkPageBreak(30);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(16);
                pdf.setTextColor('#6A4C93');
                pdf.text(feature.feature, 50, y.current);
                y.current += 25;
                
                checkPageBreak(20);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.setTextColor('#00A99D');
                pdf.text("User Stories & Acceptance Criteria", 50, y.current);
                y.current += 20;
                processMarkdown(feature.userStories);
                y.current += 10;
                
                checkPageBreak(20);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.setTextColor('#00A99D');
                pdf.text("Technical Specifications", 50, y.current);
                y.current += 20;
                processMarkdown(feature.technicalSpecs);
                y.current += 20;
            });
        });
    };

    const handleDownloadModularBreakdown = async () => {
        if (!modularBreakdown) return;
        const filename = `${projectName.replace(/\s+/g, '_')}_Freelance_Briefs.pdf`;
    
        const renderBriefMarkdownToPdf = (
            pdf: jsPDF,
            content: string,
            y: { current: number },
            checkPageBreak: (spaceNeeded: number) => void
        ) => {
            const pageMargin = 50;
            const contentWidth = pdf.internal.pageSize.getWidth() - (pageMargin * 2);
            const lines = content.split('\n');
    
            lines.forEach(line => {
                const trimmed = line.trim();
                let textLines: string[] | string = [];
                if (trimmed.startsWith('### ')) {
                    checkPageBreak(18);
                    y.current += 4;
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(12);
                    pdf.setTextColor('#EAEAEA');
                    textLines = pdf.splitTextToSize(trimmed.substring(4), contentWidth);
                    pdf.text(textLines, pageMargin, y.current);
                    y.current += (Array.isArray(textLines) ? textLines.length : 1) * 12 + 6;
                } else if (trimmed.startsWith('## ')) {
                    checkPageBreak(22);
                    y.current += 6;
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(14);
                    pdf.setTextColor('#00A99D');
                    textLines = pdf.splitTextToSize(trimmed.substring(3), contentWidth);
                    pdf.text(textLines, pageMargin, y.current);
                    y.current += (Array.isArray(textLines) ? textLines.length : 1) * 14 + 8;
                } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                    checkPageBreak(15);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(10);
                    pdf.setTextColor('#EAEAEA');
                    textLines = pdf.splitTextToSize(trimmed.replace(/\*\*/g, ''), contentWidth);
                    pdf.text(textLines, pageMargin, y.current);
                    y.current += (Array.isArray(textLines) ? textLines.length : 1) * 10 + 4;
                } else if (trimmed.startsWith('- ')) {
                    checkPageBreak(14);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(10);
                    pdf.setTextColor('#9E9E9E');
                    textLines = pdf.splitTextToSize(`• ${trimmed.substring(2)}`, contentWidth - 10);
                    pdf.text(textLines, pageMargin + 10, y.current);
                    y.current += (Array.isArray(textLines) ? textLines.length : 1) * 10 + 4;
                } else if (trimmed !== '') {
                    checkPageBreak(14);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(10);
                    pdf.setTextColor('#9E9E9E');
                    textLines = pdf.splitTextToSize(trimmed, contentWidth);
                    pdf.text(textLines, pageMargin, y.current);
                    y.current += (Array.isArray(textLines) ? textLines.length : 1) * 10 + 4;
                } else {
                    y.current += 5;
                }
            });
        };
    
        await generateTextPdf("Freelance Briefs", filename, (pdf, y, checkPageBreak) => {
            modularBreakdown.forEach((brief, index) => {
                setDownloadProgress(Math.round(((index + 1) / modularBreakdown.length) * 100));
                
                checkPageBreak(30);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(16);
                pdf.setTextColor('#6A4C93');
                const titleLines = pdf.splitTextToSize(brief.title, pdf.internal.pageSize.getWidth() - 100);
                const titleLinesArray = Array.isArray(titleLines) ? titleLines : [titleLines];
                pdf.text(titleLinesArray, 50, y.current);
                y.current += titleLinesArray.length * 16 + 15;

                renderBriefMarkdownToPdf(pdf, brief.content, y, checkPageBreak);

                if (index < modularBreakdown.length - 1) {
                    pdf.addPage();
                    y.current = 50; 
                }
            });
        });
    };

    const handleDownloadScopeReview = async () => {
        if (!scopeReviewContent) return;
        const filename = `${projectName.replace(/\s+/g, '_')}_Scope_Review.pdf`;
        await generateTextPdf("Scope Review", filename, (pdf, y, checkPageBreak) => {
            const contentWidth = pdf.internal.pageSize.getWidth() - 100;
            scopeReviewContent.forEach((point, index) => {
                setDownloadProgress(Math.round(((index + 1) / scopeReviewContent.length) * 100));
                
                checkPageBreak(24);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(14);
                pdf.setTextColor('#00A99D');
                pdf.text(point.feature, 50, y.current);
                y.current += 20;

                pdf.setFontSize(10);
                pdf.setTextColor(point.severity === 'High' ? '#f87171' : point.severity === 'Medium' ? '#facc15' : '#4ade80');
                pdf.text(`Severity: ${point.severity}`, 50, y.current);
                y.current += 20;

                const addSection = (title: string, content: string, color: string) => {
                    checkPageBreak(18);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(color);
                    pdf.text(title, 50, y.current);
                    y.current += 15;
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor('#9E9E9E');
                    const textLinesResult: any = pdf.splitTextToSize(content, contentWidth - 10);
                    const textLines = Array.isArray(textLinesResult) ? textLinesResult : [textLinesResult];
                    checkPageBreak(textLines.length * 10);
                    pdf.text(textLines, 60, y.current);
                    y.current += textLines.length * 10 + 10;
                };

                addSection('Critique:', point.critique, '#EAEAEA');
                addSection('Suggestion:', point.suggestion, '#4ade80');
                addSection('Reasoning:', point.reasoning, '#facc15');
                y.current += 15;
            });
        });
    }
    
    // --- OTHER HANDLERS ---
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.download-dropdown-container')) {
                setIsDownloadDropdownOpen(false);
            }
        };

        if (isDownloadDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDownloadDropdownOpen]);

    const handleResetSession = () => {
        localStorage.removeItem(HISTORIES_KEY);
        AIService.resetLMCostSession();
        window.location.reload();
    };

    const ResetConfirmationModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] backdrop-blur-sm p-4" onClick={() => setIsResetModalOpen(false)}>
            <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-md border border-brand-border transform transition-all p-6" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                    <TrashIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-brand-primary mb-2">Reset All Data?</h2>
                    <p className="text-brand-text-muted mb-6">
                        Are you sure you want to delete ALL projects and start fresh? This will permanently clear all saved history. This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsResetModalOpen(false)}
                            className="flex-1 py-3 px-4 rounded-lg font-bold text-brand-text bg-brand-bg hover:bg-brand-border transition-colors border border-brand-border"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleResetSession}
                            className="flex-1 py-3 px-4 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                            Yes, Reset All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );


    // --- RENDER LOGIC ---

    const ScopeReviewModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setIsScopeReviewModalOpen(false)}>
            <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-4xl border border-brand-border transform transition-all flex flex-col" style={{maxHeight: '90vh'}}>
                <div className="p-6 border-b border-brand-border flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold text-brand-primary">Scope Critical Review: {projectName}</h2>
                    <button onClick={handleDownloadScopeReview} disabled={isDownloading} className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors bg-brand-secondary hover:bg-purple-700 disabled:opacity-50"><DownloadIcon className="w-5 h-5"/> Download PDF</button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {scopeReviewContent && <ScopeReviewViewer critiquePoints={scopeReviewContent} />}
                </div>
                 <div className="p-4 bg-brand-bg/50 border-t border-brand-border text-right flex-shrink-0">
                    <button
                        onClick={() => setIsScopeReviewModalOpen(false)}
                        className="font-bold py-2 px-6 rounded-lg transition-colors bg-brand-primary hover:bg-teal-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
    
    const LensSelectorModal = () => {
        const lenses: { key: LensType; name: string; description: string }[] = [
            { key: 'studio', name: 'Studio Lens', description: 'Analyze for scalability, performance, and live service viability.' },
            { key: 'indie', name: 'Indie Lens', description: 'Focus on skill gaps, simplify complex features for a small team.' },
            { key: 'freelance', name: 'Freelance Lens', description: 'Critique hiring risks, budget volatility, and communication overhead.' },
            { key: 'gamejam', name: 'Game Jam Lens', description: 'Ruthlessly cut scope for a 48-hour deadline.' },
        ];

        return (
             <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setIsLensModalOpen(false)}>
                <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-2xl border border-brand-border p-6" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-brand-primary mb-2">Select a Critique Lens</h2>
                    <p className="text-brand-text-muted mb-6">Choose a perspective to analyze your project's scope.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lenses.map(lens => (
                            <button
                                key={lens.key}
                                onClick={() => handleRunScopeReviewWithLens(lens.key)}
                                className="p-4 bg-brand-bg hover:bg-brand-border/50 border border-brand-border rounded-lg text-left transition-colors"
                            >
                                <h3 className="font-bold text-brand-secondary">{lens.name}</h3>
                                <p className="text-sm text-brand-text-muted mt-1">{lens.description}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderChatFooter = () => (
        <footer className="p-4 bg-brand-surface border-t border-brand-border z-10 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex items-center gap-3">
                     
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.docx,.txt"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="p-3 bg-brand-surface hover:bg-brand-border rounded-full text-brand-text-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            aria-label="Upload Document"
                        >
                            <PaperclipIcon className="w-6 h-6" />
                        </button>
                    
                    <textarea
                        ref={userInputRef}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(userInput);
                            }
                        }}
                        placeholder={
                            chatHistory.length <= 1
                                ? "To begin, describe your project, paste its content, or upload a document..."
                                : "Ask the Dev Doctor anything, or paste your template here..."
                        }
                        disabled={isLoading}
                        className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50 resize-none h-12"
                        aria-label="Your response"
                        rows={1}
                    />
                    <button
                        type="button"
                        onClick={handleGetChatSuggestion}
                        disabled={isLoading || isHelperLoading}
                        className="p-3 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-full text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        aria-label="Get AI suggestion"
                    >
                        {isHelperLoading ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <LightbulbIcon className="w-6 h-6" />}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !userInput.trim()}
                        className="p-3 bg-brand-primary hover:bg-teal-500 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        aria-label="Send message"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </footer>
    );

    const SectionDownloadDropdown = ({ sectionKey, title }: { sectionKey: any, title: string }) => {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors bg-brand-primary hover:bg-teal-500 disabled:opacity-50 text-white"
                    title={`Download ${title}`}
                >
                    <DownloadIcon className="w-5 h-5"/> Download
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-brand-surface border border-brand-border rounded-lg shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadHTML(sectionKey); setIsOpen(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-brand-bg transition-colors flex items-center gap-2 text-brand-text"
                        >
                            <GlobeIcon className="w-4 h-4 text-brand-primary" />
                            <span>HTML Format</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadMarkdown(sectionKey); setIsOpen(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-brand-bg transition-colors flex items-center gap-2 text-brand-text border-t border-brand-border"
                        >
                            <FileCodeIcon className="w-4 h-4 text-brand-secondary" />
                            <span>Markdown Format</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadText(sectionKey); setIsOpen(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-brand-bg transition-colors flex items-center gap-2 text-brand-text border-t border-brand-border"
                        >
                            <FileTextIcon className="w-4 h-4 text-orange-400" />
                            <span>Plain Text Format</span>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const ConciergeModeBadge = () => {
        const labels: Record<import('./types').ConciergeMode, string> = {
            'project-name': 'Project Name',
            'information-gatherer': 'Information Gatherer',
            'creative-brainstormer': 'Creative Brainstormer',
            'completion-gate': 'Completion Gate',
        };
        const label = labels[conciergeMode] || 'Information Gatherer';
        return (
            <div
                className="hidden sm:flex min-w-0 max-w-[24rem] items-center justify-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1.5 text-center"
                data-testid="concierge-mode-badge"
                title={`Concierge mode: ${label}`}
            >
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted">Concierge</span>
                <span className="truncate text-sm font-semibold text-brand-primary">{label}</span>
            </div>
        );
    };

    const renderMainContent = () => {
        if (!activeProjectId) {
            return (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-brand-primary">Welcome!</h2>
                        <p className="text-brand-text-muted mt-2">Select a project from the sidebar or create a new one to get started.</p>
                    </div>
                </div>
            );
        }
        
        if (workflowState === WorkflowStep.CRITIQUE || (workflowState === WorkflowStep.GENERATING && generationStatus.key === 'gdd')) {
            return (
                <div className="flex flex-col h-full">
                    <GenerationProgressIndicator 
                        isActive={workflowState === WorkflowStep.GENERATING} 
                        progress={generationStatus.progress} 
                        message={generationStatus.message} 
                        title={generationStatus.title}
                        stageKey={generationStatus.key}
                        substage={generationStatus.substage}
                        completed={generationStatus.completed}
                        total={generationStatus.total}
                        currentItem={generationStatus.currentItem}
                        activitySequence={generationStatus.activitySequence}
                    />
                    {isResetModalOpen && <ResetConfirmationModal />}
                    <header className="p-4 bg-brand-surface border-b border-brand-border grid grid-cols-[1fr_auto_1fr] items-center gap-3 z-10 flex-shrink-0">
                        <div className="flex items-center gap-3 truncate">
                            <h1 className="text-xl font-bold text-brand-primary truncate">{projectName}</h1>
                            {isStableVersion && (
                                <span className="px-2 py-0.5 bg-brand-primary/20 text-brand-primary border border-brand-primary/30 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                                    Stable
                                </span>
                            )}
                        </div>
                        <div className="justify-self-center">
                            <ConciergeModeBadge />
                        </div>
                        <div className="flex items-center justify-self-end gap-4">
                            <AIProviderSelector config={aiProviderConfig} onChange={handleProviderConfigChange} />
                            <button
                                onClick={() => setIsResetModalOpen(true)}
                                className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors text-white bg-red-500 hover:bg-red-600"
                                title="Delete ALL projects and start fresh."
                            >
                                <RefreshCwIcon className="w-5 h-5"/> Reset All
                            </button>
                            {costReport && <CostDisplay report={costReport} />}
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="max-w-4xl mx-auto">
                            {critiqueData && workflowState === WorkflowStep.CRITIQUE ? (
                                <div className="bg-brand-surface rounded-lg p-6 border border-brand-border">
                                    <h2 className="text-2xl font-bold text-brand-secondary mb-3">Technical Critique</h2>
                                    <p className="text-brand-text-muted mb-6">{critiqueData.summary}</p>
                                    <h3 className="text-lg font-semibold text-brand-primary mb-4">Please provide details for the following points:</h3>
                                    <div className="space-y-6">
                                        {critiqueData.questions.map((q, i) => (
                                            <div key={i}>
                                                <label htmlFor={`critique-q-${i}`} className="block text-brand-text mb-2">
                                                    <span className="font-semibold">{i + 1}.</span> {q}
                                                </label>
                                                <div className="flex items-start gap-2">
                                                    <textarea
                                                        id={`critique-q-${i}`}
                                                        value={critiqueAnswers[i] || ''}
                                                        onChange={(e) => handleCritiqueAnswerChange(i, e.target.value)}
                                                        placeholder="Provide a specific, detailed answer..."
                                                        className="flex-grow h-24 bg-brand-bg border border-brand-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                        aria-label={`Response to critique question ${i + 1}`}
                                                    />
                                                    <button
                                                        onClick={() => handleGetCritiqueHelp(i)}
                                                        disabled={critiqueHelperLoadingIndex !== null}
                                                        className="p-3 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-lg text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                                        aria-label={`Get AI suggestion for question ${i + 1}`}
                                                    >
                                                        {critiqueHelperLoadingIndex === i ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <LightbulbIcon className="w-6 h-6" />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleCritiqueResponseAndGenerate}
                                        disabled={critiqueAnswers.some(a => !a.trim())}
                                        className="mt-8 w-full bg-brand-primary hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Incorporate Feedback & Generate Document
                                    </button>
                                </div>
                            ) : (
                                 <div className="text-center p-8 bg-brand-surface rounded-lg">
                                    <LoaderIcon className="w-12 h-12 text-brand-primary animate-spin mx-auto" />
                                    <h2 className="mt-4 text-2xl font-bold text-brand-text">Preparing Critique...</h2>
                                    <p className="mt-2 text-brand-text-muted">The AI is reviewing your conversation to identify missing details.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            );
        }

        if (workflowState === WorkflowStep.CONVERSATION || workflowState === WorkflowStep.GENERATING) {
            return (
                 <div className="flex flex-col h-full">
                    <GenerationProgressIndicator 
                        isActive={generationStatus.isActive} 
                        progress={generationStatus.progress} 
                        message={generationStatus.message} 
                        title={generationStatus.title}
                        stageKey={generationStatus.key}
                        substage={generationStatus.substage}
                        completed={generationStatus.completed}
                        total={generationStatus.total}
                        currentItem={generationStatus.currentItem}
                        activitySequence={generationStatus.activitySequence}
                    />
                    {isScopeReviewModalOpen && <ScopeReviewModal />}
                    {isResetModalOpen && <ResetConfirmationModal />}
                    {isLensModalOpen && <LensSelectorModal />}
                    {isRefactorModalOpen && (
                        <RefactorModal 
                            onClose={() => setIsRefactorModalOpen(false)}
                            onStartRefactor={handleStartRefactor}
                            isRefactoring={generationStatus.key === 'refactor'}
                            gddGenerated={gddGenerated}
                            pitchDeckGenerated={pitchDeckGenerated}
                            assetListGenerated={assetListGenerated}
                            mvpGenerated={mvpGenerated}
                            tddSpecsGenerated={tddSpecsGenerated}
                            tddDocGenerated={tddDocGenerated}
                            modularBreakdownGenerated={modularBreakdownGenerated}
                            scopeReviewGenerated={scopeReviewGenerated}
                        />
                    )}
                    <header className="p-4 bg-brand-surface border-b border-brand-border grid grid-cols-[1fr_auto_1fr] items-center gap-3 z-10 flex-shrink-0">
                        <div className="flex items-center gap-3 truncate">
                            <h1 className="text-xl font-bold text-brand-primary truncate">{projectName}</h1>
                            {isStableVersion && (
                                <span className="px-2 py-0.5 bg-brand-primary/20 text-brand-primary border border-brand-primary/30 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                                    Stable
                                </span>
                            )}
                        </div>
                        <div className="justify-self-center">
                            <ConciergeModeBadge />
                        </div>
                        <div className="flex items-center justify-self-end gap-4">
                            <AIProviderSelector config={aiProviderConfig} onChange={handleProviderConfigChange} />
                            <button
                                onClick={() => setIsResetModalOpen(true)}
                                className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors text-white bg-red-500 hover:bg-red-600"
                                title="Delete ALL projects and start fresh."
                            >
                                <RefreshCwIcon className="w-5 h-5"/> Reset All
                            </button>
                            {costReport && <CostDisplay report={costReport} />}
                        </div>
                    </header>
                    
                    <div className="flex flex-1 overflow-hidden">
                        <main className="flex-1 flex flex-col">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
                                {chatHistory.map((msg, index) => (
                                    <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.sender === 'ai' && <BotIcon className="w-8 h-8 text-brand-primary flex-shrink-0 mt-1" />}
                                        
                                        <div className={`max-w-xl p-3 rounded-lg whitespace-pre-wrap break-words ${
                                            msg.sender === 'user' ? 'bg-brand-secondary text-white' : 'bg-brand-surface'
                                        }`}>
                                            {msg.file && (
                                                <div className="mb-2 p-2 bg-black/20 rounded-md">
                                                    {msg.file.mimeType.startsWith('image/') ? (
                                                        <img src={msg.file.data} alt={msg.file.name} className="max-w-xs max-h-48 rounded-md" />
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <FileCodeIcon className="w-6 h-6 text-brand-text-muted" />
                                                            <span className="text-brand-text-muted truncate">{msg.file.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {msg.text}
                                        </div>

                                        {msg.sender === 'user' && <UserIcon className="w-8 h-8 text-brand-secondary flex-shrink-0 mt-1" />}
                                    </div>
                                ))}
                                {isAiThinking && (
                                     <div className="flex items-start gap-3">
                                        <BotIcon className="w-8 h-8 text-brand-primary flex-shrink-0 mt-1" />
                                        <div className="max-w-xl p-3 rounded-lg bg-brand-surface flex items-center gap-2">
                                            <LoaderIcon className="w-5 h-5 animate-spin" />
                                            <span className="text-brand-text-muted">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                             {renderChatFooter()}
                        </main>
                        
                        <aside className="hidden md:block w-full max-w-sm border-l border-brand-border bg-brand-bg">
                            <OutputPanel 
                                projectType={projectType}
                                onGenerateGDD={handleGenerateGDD}
                                onGeneratePitchDeck={() => handleGeneratePitchDeck()}
                                onGenerateMvp={() => handleGenerateMVP()}
                                onGenerateTddSpecs={() => handleGenerateTddSpecs()}
                                onGenerateTddDoc={() => handleGenerateTddDoc()}
                                onGenerateAssetList={() => handleGenerateAssetList()}
                                onGenerateScopeReview={handleGenerateScopeReview}
                                onGenerateModularBreakdown={() => handleGenerateModularBreakdown()}
                                onRefactor={() => setIsRefactorModalOpen(true)}
                                gddGenerated={gddGenerated}
                                pitchDeckGenerated={pitchDeckGenerated}
                                mvpGenerated={mvpGenerated}
                                tddSpecsGenerated={tddSpecsGenerated}
                                tddDocGenerated={tddDocGenerated}
                                assetListGenerated={assetListGenerated}
                                scopeReviewGenerated={scopeReviewGenerated}
                                modularBreakdownGenerated={modularBreakdownGenerated}
                                isGeneratingKey={generationStatus.key}
                                workflowError={workflowError}
                            />
                        </aside>
                    </div>
                </div>
            );
        }
        
        // COMPLETE STATE ("RESULTS VIEW")
        return (
            <div className="flex flex-col h-full">
                 {isScopeReviewModalOpen && <ScopeReviewModal />}
                 {isLensModalOpen && <LensSelectorModal />}
                 {isResetModalOpen && <ResetConfirmationModal />}
                 {isRefactorModalOpen && (
                    <RefactorModal 
                        onClose={() => setIsRefactorModalOpen(false)}
                        onStartRefactor={handleStartRefactor}
                        isRefactoring={generationStatus.key === 'refactor'}
                        gddGenerated={gddGenerated}
                        pitchDeckGenerated={pitchDeckGenerated}
                        assetListGenerated={assetListGenerated}
                        mvpGenerated={mvpGenerated}
                        tddSpecsGenerated={tddSpecsGenerated}
                        tddDocGenerated={tddDocGenerated}
                        modularBreakdownGenerated={modularBreakdownGenerated}
                        scopeReviewGenerated={scopeReviewGenerated}
                    />
                 )}
                {isDownloading && <DownloadProgressIndicator progress={downloadProgress} message={downloadMessage} />}
                <GenerationProgressIndicator 
                    isActive={generationStatus.isActive} 
                    progress={generationStatus.progress} 
                    message={generationStatus.message} 
                    title={generationStatus.title}
                    stageKey={generationStatus.key}
                    substage={generationStatus.substage}
                    completed={generationStatus.completed}
                    total={generationStatus.total}
                    currentItem={generationStatus.currentItem}
                    activitySequence={generationStatus.activitySequence}
                />
                
                <header className="p-4 bg-brand-surface border-b border-brand-border grid grid-cols-[1fr_auto_1fr] items-center gap-3 z-40 flex-shrink-0">
                    <div className="flex items-center gap-3 truncate">
                        <h1 className="text-xl font-bold text-brand-primary truncate">{projectName}</h1>
                        {isStableVersion && (
                            <span className="px-2 py-0.5 bg-brand-primary/20 text-brand-primary border border-brand-primary/30 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                                Stable
                            </span>
                        )}
                    </div>
                    <div className="justify-self-center">
                        <ConciergeModeBadge />
                    </div>
                    <div className="flex items-center justify-self-end gap-4">
                        <AIProviderSelector config={aiProviderConfig} onChange={handleProviderConfigChange} />
                            <ShareButton
                                projectName={projectName}
                                projectType={projectType}
                                gddContent={gddContent}
                                pitchDeckContent={pitchDeckContent}
                                generatedImages={generatedImages}
                                mvpDefinition={mvpDefinition}
                                tddContent={tddContent}
                                projectPackage={currentProjectPackage}
                            />
                        <div className="relative download-dropdown-container">
                            <button
                                onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                                disabled={isDownloading}
                                className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors bg-brand-primary hover:bg-teal-500 disabled:opacity-50"
                                title="Download the entire project documentation."
                            >
                                <DownloadIcon className="w-5 h-5"/> Download Full Project
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isDownloadDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isDownloadDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-brand-surface border border-brand-border rounded-lg shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={() => {
                                            handleDownloadHTML();
                                            setIsDownloadDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-brand-bg transition-colors flex items-center gap-2 text-brand-text"
                                    >
                                        <GlobeIcon className="w-4 h-4 text-brand-primary" />
                                        <span>HTML Format</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleDownloadMarkdown();
                                            setIsDownloadDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-brand-bg transition-colors flex items-center gap-2 text-brand-text border-t border-brand-border"
                                    >
                                        <FileCodeIcon className="w-4 h-4 text-brand-secondary" />
                                        <span>Markdown Format</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleDownloadText();
                                            setIsDownloadDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-brand-bg transition-colors flex items-center gap-2 text-brand-text border-t border-brand-border"
                                    >
                                        <FileTextIcon className="w-4 h-4 text-orange-400" />
                                        <span>Plain Text Format</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleDownloadJSON();
                                            setIsDownloadDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-brand-bg transition-colors flex items-center gap-2 text-brand-text border-t border-brand-border"
                                    >
                                        <FileCodeIcon className="w-4 h-4 text-yellow-400" />
                                        <span>JSON Package</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <button
                            onClick={() => setIsResetModalOpen(true)}
                            className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors text-white bg-red-500 hover:bg-red-600"
                            title="Delete ALL projects and start fresh."
                        >
                            <RefreshCwIcon className="w-5 h-5"/> Reset All
                        </button>
                        {costReport && <CostDisplay report={costReport} />}
                    </div>
                </header>
                
                <div className="flex flex-1 overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
                        <div className="space-y-4">
                            <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden">
                                <button
                                    onClick={() => setOpenSection(openSection === 'rich' ? null : 'rich')}
                                    className="w-full flex justify-between items-center p-4 text-left hover:bg-brand-border/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                    aria-expanded={openSection === 'rich'}
                                >
                                    <div>
                                        <h2 className="text-xl font-bold text-brand-primary">Rich project package</h2>
                                        <p className="text-sm text-brand-text-muted mt-1">The same structured package powers this preview, HTML export, JSON export, and sharing.</p>
                                    </div>
                                    <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'rich' ? 'rotate-180' : ''}`} />
                                </button>
                                {openSection === 'rich' && (
                                    <div className="p-2 sm:p-4 border-t border-brand-border">
                                        <RichPackagePreview packageData={currentProjectPackage} />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-2">
                                <div>
                                    <h2 className="text-lg font-bold text-brand-text">Legacy section viewers</h2>
                                    <p className="text-sm text-brand-text-muted">Use the original focused viewers for individual document editing and review.</p>
                                </div>
                                <button
                                    onClick={() => setOpenSection(openSection && openSection !== 'rich' ? null : 'gdd')}
                                    className="flex-shrink-0 px-4 py-2 rounded-lg border border-brand-border text-brand-text hover:bg-brand-surface transition-colors"
                                >
                                    {openSection && openSection !== 'rich' ? 'Hide sections' : 'Show sections'}
                                </button>
                            </div>
                            <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden">
                                <button
                                    onClick={() => setOpenSection(openSection === 'persona' ? null : 'persona')}
                                    className="w-full flex justify-between items-center p-4 text-left hover:bg-brand-border/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                    aria-expanded={openSection === 'persona'}
                                >
                                    <div>
                                        <h2 className="text-xl font-bold text-brand-primary">Memory &amp; Persona Records</h2>
                                        <p className="text-sm text-brand-text-muted mt-1">Review the captured memory, Concierge mode, critique specialists, synthesis, and transcript status.</p>
                                    </div>
                                    <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'persona' ? 'rotate-180' : ''}`} />
                                </button>
                                {openSection === 'persona' && (
                                    <div className="p-4 sm:p-8 border-t border-brand-border">
                                        <PersonaRecordsViewer packageData={currentProjectPackage} />
                                    </div>
                                )}
                            </div>
                            {openSection !== 'rich' && (
                            <>
                            {gddGenerated && (
                                <div className="bg-brand-surface rounded-lg border border-brand-border">
                                    <div className="flex justify-between items-center p-4 hover:bg-brand-border/20 transition-colors relative rounded-t-lg">
                                        <button
                                            onClick={() => setOpenSection(openSection === 'gdd' ? null : 'gdd')}
                                            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                        >
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <h3 className="text-xl font-bold text-brand-secondary relative z-0">
                                                Design Document (GDD/PRD)
                                            </h3>
                                        </button>
                                        <div className="flex items-center gap-4 relative z-10">
                                           <SectionDownloadDropdown sectionKey="gdd" title="Design Document" />
                                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'gdd' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {openSection === 'gdd' && (
                                        <div className="p-4 sm:p-8 border-t border-brand-border">
                                            <div className="space-y-2">
                                                {gddContent.map((section, index) => {
                                                    const { tag: Tag, className } = getGDDSectionStyle(section.title);
                                                    const finalClassName = index === 0 ? className.replace(/mt-\d+/, 'mt-0') : className;
                                                    return (
                                                        <div key={index}>
                                                            <Tag className={finalClassName}>{section.title}</Tag>
                                                            <div className="mt-2 text-brand-text-muted markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(cleanHtmlComments(section.content)) }} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {pitchDeckGenerated && (
                                 <div className="bg-brand-surface rounded-lg border border-brand-border">
                                    <div className="flex justify-between items-center p-4 hover:bg-brand-border/20 transition-colors relative rounded-t-lg">
                                        <button
                                            onClick={() => setOpenSection(openSection === 'pitch' ? null : 'pitch')}
                                            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                        >
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <h3 className="text-xl font-bold text-brand-secondary relative z-0">Pitch Deck</h3>
                                        </button>
                                         <div className="flex items-center gap-4 relative z-10">
                                           <SectionDownloadDropdown sectionKey="pitch" title="Pitch Deck" />
                                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'pitch' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {openSection === 'pitch' && (
                                        <div className="p-4 sm:p-8 space-y-8 border-t border-brand-border">
                                            {pitchDeckContent.map((slide, index) => {
                                                const slideWithVisual = slide.visualPrompt && generatedImages[slide.visualPrompt];
                                                return (
                                                    <div key={index} className="bg-brand-bg border border-brand-border rounded-lg shadow-lg overflow-hidden flex flex-col min-h-[70vh] relative">
                                                        <div className="px-6 py-4 flex-shrink-0 bg-brand-surface/50">
                                                            <h4 className="text-xl font-bold text-brand-primary">SLIDE {index + 1}: {slide.title}</h4>
                                                        </div>
                                                        {slideWithVisual ? (
                                                            <div className="flex-grow flex flex-col min-h-0">
                                                                <div className="flex-[3_3_0%] p-4 flex items-center justify-center min-h-0">
                                                                    <img src={`data:image/jpeg;base64,${generatedImages[slide.visualPrompt!]}`} alt={slide.title} className="w-auto h-auto max-w-full max-h-full object-contain rounded-md shadow-md"/>
                                                                </div>
                                                                <div className="flex-[2_2_0%] p-8 flex flex-col justify-center text-left overflow-y-auto">
                                                                    <div className="text-2xl text-brand-text-muted markdown-content break-words" dangerouslySetInnerHTML={{ __html: marked.parse(cleanHtmlComments(slide.content)) }} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex-grow p-6 flex flex-col items-center justify-center text-center">
                                                                <div className="text-3xl text-brand-text-muted markdown-content break-words" dangerouslySetInnerHTML={{ __html: marked.parse(cleanHtmlComments(slide.content)) }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {assetListGenerated && (
                                 <div className="bg-brand-surface rounded-lg border border-brand-border">
                                    <div className="flex justify-between items-center p-4 hover:bg-brand-border/20 transition-colors relative rounded-t-lg">
                                        <button
                                            onClick={() => setOpenSection(openSection === 'assets' ? null : 'assets')}
                                            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                        >
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <h3 className="text-xl font-bold text-brand-secondary relative z-0">Asset List</h3>
                                        </button>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <SectionDownloadDropdown sectionKey="assets" title="Asset List" />
                                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'assets' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {openSection === 'assets' && <div className="p-4 sm:p-8 border-t border-brand-border"><AssetListViewer assets={assetList!} /></div>}
                                </div>
                            )}
                            {mvpGenerated && (
                                <div className="bg-brand-surface rounded-lg border border-brand-border">
                                    <div className="flex justify-between items-center p-4 hover:bg-brand-border/20 transition-colors relative rounded-t-lg">
                                        <button
                                            onClick={() => setOpenSection(openSection === 'mvp' ? null : 'mvp')}
                                            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                        >
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <h3 className="text-xl font-bold text-brand-secondary relative z-0">MVP Definition</h3>
                                        </button>
                                        <div className="flex items-center gap-4 relative z-10">
                                           <SectionDownloadDropdown sectionKey="mvp" title="MVP Definition" />
                                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'mvp' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {openSection === 'mvp' && <div className="p-4 sm:p-8 border-t border-brand-border"><MVPViewer mvp={mvpDefinition!} /></div>}
                                </div>
                            )}
                            {tddSpecsGenerated && tddContent && (
                                 <div className="bg-brand-surface rounded-lg border border-brand-border">
                                    <div className="flex justify-between items-center p-4 hover:bg-brand-border/20 transition-colors relative rounded-t-lg">
                                        <button
                                            onClick={() => setOpenSection(openSection === 'tdd_specs' ? null : 'tdd_specs')}
                                            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                        >
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <h3 className="text-xl font-bold text-brand-secondary relative z-0">
                                                MVP Feature Specifications
                                            </h3>
                                        </button>
                                        <div className="flex items-center gap-4 relative z-10">
                                           <SectionDownloadDropdown sectionKey="tdd_specs" title="MVP Feature Specifications" />
                                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'tdd_specs' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {openSection === 'tdd_specs' && <div className="p-4 sm:p-8 border-t border-brand-border">{mvpFeatureSpecs ? <MVPFeatureSpecViewer features={mvpFeatureSpecs} projectName={projectName} /> : <TDDViewer features={tddContent || []} />}</div>}
                                </div>
                            )}
                            {tddDocGenerated && technicalDesignDocument && (
                                 <div className="bg-brand-surface rounded-lg border border-brand-border">
                                    <div className="flex justify-between items-center p-4 hover:bg-brand-border/20 transition-colors relative rounded-t-lg">
                                        <button
                                            onClick={() => setOpenSection(openSection === 'tdd_final' ? null : 'tdd_final')}
                                            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                        >
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <h3 className="text-xl font-bold text-brand-secondary relative z-0">Technical Design Document (TDD)</h3>
                                        </button>
                                        <div className="flex items-center gap-4 relative z-10">
                                           <SectionDownloadDropdown sectionKey="tdd_final" title="Technical Design Document" />
                                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'tdd_final' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {openSection === 'tdd_final' && (
                                        <div className="p-4 sm:p-8 border-t border-brand-border">
                                            <div className="space-y-2">
                                                {(Array.isArray(technicalDesignDocument) ? technicalDesignDocument : []).map((section, index) => {
                                                    const { tag: Tag, className } = getGDDSectionStyle(section.title);
                                                    return <div key={index}><Tag className={className}>{section.title}</Tag><div className="mt-2 text-brand-text-muted markdown-content font-mono text-sm" dangerouslySetInnerHTML={{ __html: marked.parse(cleanHtmlComments(section.content))}} /></div>;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                             {modularBreakdownGenerated && (
                                 <div className="bg-brand-surface rounded-lg border border-brand-border">
                                    <div className="flex justify-between items-center p-4 hover:bg-brand-border/20 transition-colors relative rounded-t-lg">
                                        <button
                                            onClick={() => setOpenSection(openSection === 'modular_breakdown' ? null : 'modular_breakdown')}
                                            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                        >
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <h3 className="text-xl font-bold text-brand-secondary relative z-0">Freelance Briefs</h3>
                                        </button>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <SectionDownloadDropdown sectionKey="modular_breakdown" title="Freelance Briefs" />
                                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'modular_breakdown' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {openSection === 'modular_breakdown' && <div className="p-4 sm:p-8 border-t border-brand-border"><ModularBreakdownViewer breakdown={modularBreakdown!} /></div>}
                                </div>
                            )}

                            {scopeReviewGenerated && (
                                <div className="bg-brand-surface rounded-lg border border-brand-border">
                                    <div className="flex justify-between items-center p-4 hover:bg-brand-border/20 transition-colors relative rounded-t-lg">
                                        <button
                                            onClick={() => setOpenSection(openSection === 'scope_review' ? null : 'scope_review')}
                                            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                        >
                                            <span className="absolute inset-0" aria-hidden="true"></span>
                                            <h3 className="text-xl font-bold text-brand-secondary relative z-0">Scope Critical Review</h3>
                                        </button>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <SectionDownloadDropdown sectionKey="scope_review" title="Scope Review" />
                                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'scope_review' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {openSection === 'scope_review' && (
                                        <div className="p-4 sm:p-8 border-t border-brand-border">
                                            {scopeReviewContent && <ScopeReviewViewer critiquePoints={scopeReviewContent} />}
                                        </div>
                                    )}
                                </div>
                            )}
                            </>
                            )}
                        </div>
                    </main>
                     <aside className="hidden md:block w-full max-w-sm border-l border-brand-border bg-brand-bg">
                           <OutputPanel 
                                projectType={projectType}
                                onGenerateGDD={handleGenerateGDD}
                                onGeneratePitchDeck={() => handleGeneratePitchDeck()}
                                onGenerateMvp={() => handleGenerateMVP()}
                                onGenerateTddSpecs={() => handleGenerateTddSpecs()}
                                onGenerateTddDoc={() => handleGenerateTddDoc()}
                                onGenerateAssetList={() => handleGenerateAssetList()}
                                onGenerateScopeReview={handleGenerateScopeReview}
                                onGenerateModularBreakdown={() => handleGenerateModularBreakdown()}
                                onRefactor={() => setIsRefactorModalOpen(true)}
                                gddGenerated={gddGenerated}
                                pitchDeckGenerated={pitchDeckGenerated}
                                mvpGenerated={mvpGenerated}
                                tddSpecsGenerated={tddSpecsGenerated}
                                tddDocGenerated={tddDocGenerated}
                                assetListGenerated={assetListGenerated}
                                scopeReviewGenerated={scopeReviewGenerated}
                                modularBreakdownGenerated={modularBreakdownGenerated}
                                isGeneratingKey={generationStatus.key}
                                workflowError={workflowError}
                            />
                    </aside>
                </div>
            </div>
        );
    };

    // --- NEW TOP-LEVEL RENDER LOGIC WITH LOADING STATES ---
    if (loadingState === 'loading') {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-brand-bg">
                <LoaderIcon className="h-12 w-12 animate-spin text-brand-primary" />
            </div>
        );
    }
    
    if (loadingState === 'error') {
        return <DataCorruptionErrorScreen />;
    }

    if (window.location.hash.startsWith('#share_id=')) {
        return <ShareLandingPage />;
    }

    return (
        <div className="flex h-screen max-h-screen bg-brand-bg font-sans">
            <style dangerouslySetInnerHTML={{ __html: `
                .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: #00A99D; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: bold; }
                .markdown-content h4, .markdown-content h5, .markdown-content h6 { color: #EAEAEA; margin-top: 1.25rem; margin-bottom: 0.5rem; font-weight: bold; }
                .markdown-content p { margin-bottom: 1rem; line-height: 1.6; }
                .markdown-content ul, .markdown-content ol { margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: disc; }
                .markdown-content li { margin-bottom: 0.25rem; }
                .markdown-content code { background-color: #1E1E1E; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; color: #00FFCC; }
                .markdown-content pre { background-color: #1E1E1E; padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; border: 1px solid #333; }
                .markdown-content pre code { background-color: transparent; padding: 0; color: #EAEAEA; }
                .markdown-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; border: 1px solid #333; }
                .markdown-content th, .markdown-content td { border: 1px solid #333; padding: 0.75rem; text-align: left; }
                .markdown-content th { background-color: #1E1E1E; color: #00A99D; }
                .markdown-content tr:nth-child(even) { background-color: #1A1A1A; }
            `}} />
            <HistorySidebar 
                projects={projectHistories}
                activeProjectId={activeProjectId}
                onNewProject={handleNewProject}
                onLoadProject={handleLoadProject}
                onDeleteProject={handleDeleteProject}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                {renderMainContent()}
            </div>
        </div>
    );
};

export default App;