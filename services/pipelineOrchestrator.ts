import * as AIService from './lmStudioService';
import { ChatMessage, CritiqueRecord, GenerationMetadata, MemoryEntry, ProjectPackage, LensType, MVPFeatureSpec, MVPFeatureSpecValidationOutcome, TDDFeature, TechnicalSpecification, StageOutputEnvelope } from '../types';
import { validateMVPFeatureSpecs } from './bddFeatureValidator';
import { assembleValidatedTDDFeatures } from './technicalSpecContract';
import { projectAssetMetadataToLegacyList, projectProductionBriefsToLegacy, projectVisualPromptsToLegacyMap } from './productionHandoffContract';
import { validatePitchSlides, validateScopeReview } from './scopePitchContract';
import { validateCritiqueRecord, validateGenerationMetadata } from './orchestrationContract';
import { buildCanonicalProjectContext } from './memoryPersonaContract';

export type ProgressCallback = (percent: number, message: string) => void;

export class MVPFeatureSpecGenerationError extends Error {
    constructor(public readonly outcomes: MVPFeatureSpecValidationOutcome[], diagnostics: string) {
        super(`Generated MVP feature specifications failed validation. ${diagnostics}`);
        this.name = 'MVPFeatureSpecGenerationError';
    }
}

export class UnifiedPipelineCritiqueGateError extends Error {
    constructor(public readonly diagnostics: string[]) {
        super(`Unified generation requires a completed technical critique. ${diagnostics.join('; ')}`);
        this.name = 'UnifiedPipelineCritiqueGateError';
    }
}

export async function runUnifiedPipeline(conversationText: string, projectName: string, lens: LensType | null, slidesTemplate: any[], visualAssets: any[] = [], onProgress?: ProgressCallback, critiqueRecord?: CritiqueRecord, chatHistory: ChatMessage[] = [], memoryEntries: MemoryEntry[] = []): Promise<ProjectPackage> {
    try {
        const critiqueValidation = validateCritiqueRecord(critiqueRecord);
        if (!critiqueRecord || !critiqueRecord.completed || !critiqueValidation.valid) throw new UnifiedPipelineCritiqueGateError(critiqueValidation.errors.length ? critiqueValidation.errors : ['A completed critique record is required.']);
        const startedAt = Date.now();
        const runId = `run_${startedAt}`;
        const stages: StageOutputEnvelope[] = [];
        const completeStage = (stage: StageOutputEnvelope['stage'], outputReferences: string[]) => stages.push({ stage, status: 'completed', generatedAt: Date.now(), outputReferences });
        completeStage('critique', ['critiqueRecord']);
        onProgress?.(5, 'Expanding conversation...');
        const canonicalContext = buildCanonicalProjectContext(projectName, conversationText, memoryEntries, critiqueRecord);
        const expandedText = await AIService.getExpandedTextFromCanonicalContext(canonicalContext);
        completeStage('conversation', ['expandedText']);

        onProgress?.(15, 'Generating GDD table of contents...');
        const toc = await AIService.generateGDDTableOfContents(expandedText);

        onProgress?.(30, 'Generating GDD sections...');
        const gdd = await AIService.generateFullGDDV2(expandedText, toc, projectName);
        completeStage('gdd', ['gddContent']);

        onProgress?.(45, 'Defining MVP...');
        const mvp = await AIService.defineMVP(gdd, JSON.stringify(canonicalContext));

        onProgress?.(55, 'Generating MVP feature specs...');
        const mvpFeatureSpecs: MVPFeatureSpec[] = [];
        const mvpFeatureSpecValidation: MVPFeatureSpecValidationOutcome[] = [];
        for (const feature of mvp.inScope) {
            onProgress?.(75 + Math.round((mvpFeatureSpecValidation.length / Math.max(1, mvp.inScope.length)) * 10), `Spec'ing feature: ${feature}`);
            const generated = await AIService.generateMVPFeatureSpec(feature, projectName, mvp, JSON.stringify({ canonicalContext, gdd, mvp }));
            mvpFeatureSpecValidation.push(generated.outcome);
            if (generated.featureSpec) mvpFeatureSpecs.push(generated.featureSpec);
        }

        const collectionValidation = validateMVPFeatureSpecs(mvpFeatureSpecs, { requireStrongContract: true });
        if (mvpFeatureSpecValidation.some(outcome => !outcome.valid) || !collectionValidation.valid || mvpFeatureSpecs.length !== mvp.inScope.length) {
            const diagnostics = [
                ...mvpFeatureSpecValidation.filter(outcome => !outcome.valid).flatMap(outcome => [`${outcome.requestedFeature}: ${[...outcome.parseErrors, ...outcome.errors, ...outcome.warnings].join('; ')}`]),
                ...collectionValidation.errors,
            ].filter(Boolean).join(' | ');
            throw new MVPFeatureSpecGenerationError(mvpFeatureSpecValidation, diagnostics);
        }

        onProgress?.(70, 'Generating architect technical specifications...');
        const technicalSpecifications: Array<TechnicalSpecification | null> = [];
        const technicalErrors: string[] = [];
        for (const featureSpec of mvpFeatureSpecs) {
            const generated = await AIService.generateTechnicalSpecification(featureSpec, `${expandedText}\n\nCanonical project context:\n${JSON.stringify(canonicalContext)}\n\nGDD/MVP dependency context:\n${JSON.stringify({ gdd, mvp })}`);
            if (!generated.valid || !generated.specification) {
                technicalErrors.push(`${featureSpec.feature}: ${[...generated.parseErrors, ...generated.errors].join('; ')}`);
            }
            technicalSpecifications.push(generated.specification);
        }
        const tddAssembly = assembleValidatedTDDFeatures(mvpFeatureSpecs, technicalSpecifications);
        if (technicalErrors.length || !tddAssembly.valid) {
            throw new Error(`Generated technical specifications failed validation. ${[...technicalErrors, ...tddAssembly.errors].filter(Boolean).join(' | ')}`);
        }
        const tddFeatures: TDDFeature[] = tddAssembly.tddFeatures;
        completeStage('mvp', ['mvpDefinition', 'mvpFeatureSpecs']);

        onProgress?.(78, 'Assembling final Technical Design Document...');
        const finalTdd = await AIService.generateTechnicalDesignDocument(`${expandedText}\n\nCanonical project context:\n${JSON.stringify(canonicalContext)}`, tddFeatures);
        if (!finalTdd.length) throw new Error('Technical Design Document produced no validated sections.');
        completeStage('tdd', ['tddContent', 'technicalDesignDocument']);

        onProgress?.(83, 'Generating freelance briefs...');
        const handoffText = JSON.stringify({ canonicalContext, gdd, tddFeatures, assetRequirements: visualAssets || [] });
        const productionBriefs = await AIService.generateProductionBriefs(gdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n'), projectName, handoffText);
        const modularBreakdown = projectProductionBriefsToLegacy(productionBriefs);

        onProgress?.(87, 'Generating asset catalog...');
        const assetMetadata = await AIService.generateAssetMetadata(gdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n'), projectName, JSON.stringify({ productionBriefs, tddFeatures, canonicalContext }));
        const assetList = projectAssetMetadataToLegacyList(assetMetadata);
        onProgress?.(90, 'Generating visual prompts...');
        const visualPromptContracts = await AIService.generateVisualPromptContracts(expandedText, (visualAssets || []).map(asset => ({ id: asset.key, description: asset.description, aspectRatio: asset.aspectRatio, sourceReferences: [asset.key] })));
        const prompts = projectVisualPromptsToLegacyMap(visualPromptContracts);
        const images: Record<string, string> = {};
        for (const asset of visualAssets || []) {
            const prompt = prompts[asset.key] || `A concept for: ${asset.description}`;
            const imageData = await AIService.generateImage(prompt, asset.aspectRatio);
            if (imageData) images[asset.key] = imageData;
            onProgress?.(90 + Math.round((Object.keys(images).length / Math.max(1, visualAssets.length)) * 4), `Generated image for ${asset.key}...`);
        }
        completeStage('production', ['productionBriefs', 'assetMetadata', 'visualPromptContracts']);

        onProgress?.(94, 'Generating Pitch Deck content...');
        const sourceIds = ['expanded-conversation', 'gdd', 'mvp', 'tdd', 'production-handoffs', 'assets', 'visual-prompts'];
        const pitchSource = JSON.stringify({ canonicalContext, expandedText, gdd, mvp, tddFeatures, productionBriefs, assetMetadata, visualPromptContracts });
        const pitchDeck = await AIService.generateFullPitchDeck(pitchSource, projectName, slidesTemplate || [], sourceIds);
        const pitchDeckValidation = validatePitchSlides(pitchDeck, (slidesTemplate || []).map(slide => slide.title), sourceIds, true);
        if (!pitchDeckValidation.valid) throw new Error(`Pitch deck failed validation. ${pitchDeckValidation.errors.join('; ')}`);
        completeStage('pitch', ['pitchDeckContent']);

        onProgress?.(97, 'Running scope review...');
        const reviewLens = lens || 'indie';
        const scopeReview = await AIService.generateScopeReview(JSON.stringify({ canonicalContext, gdd, mvp, tddFeatures, productionBriefs, assetMetadata }), reviewLens);
        const scopeValidation = validateScopeReview(scopeReview, reviewLens);
        if (!scopeValidation.valid) throw new Error(`Scope review failed validation. ${scopeValidation.errors.join('; ')}`);
        completeStage('scope', ['scopeReviewContent']);
        const generationMetadata: GenerationMetadata = { runId, startedAt, completedAt: Date.now(), stages };
        const metadataValidation = validateGenerationMetadata(generationMetadata);
        if (!metadataValidation.valid) throw new Error(`Generation metadata failed validation. ${metadataValidation.errors.join('; ')}`);

        onProgress?.(100, 'Complete');

        const packageObj: ProjectPackage = {
            meta: { projectName, generatedAt: Date.now() },
            chatHistory,
            critiqueQA: { summary: critiqueRecord.summary, questions: critiqueRecord.questions, answers: critiqueRecord.answers },
            critiqueRecord,
            generationMetadata,
            expandedText,
            gddContent: gdd,
            pitchDeckContent: pitchDeck,
            generatedImages: images,
            mvpDefinition: mvp,
            mvpFeatureSpecs,
            mvpFeatureSpecValidation,
            tddContent: tddFeatures,
            technicalDesignDocument: finalTdd,
            modularBreakdown,
            assetList,
            productionBriefs,
            assetMetadata,
            visualPromptContracts,
            scopeReviewValidation: scopeValidation,
            pitchDeckValidation,
            scopeReviewContent: scopeReview,
        };

        return packageObj;
    } catch (err) {
        throw err;
    }
}
