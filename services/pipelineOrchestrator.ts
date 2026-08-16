import * as AIService from './lmStudioService';
import { ChatMessage, CritiqueRecord, GenerationMetadata, ProjectPackage, LensType, MVPFeatureSpec, MVPFeatureSpecValidationOutcome, TDDFeature, TechnicalSpecification, StageOutputEnvelope } from '../types';
import { validateMVPFeatureSpecs } from './bddFeatureValidator';
import { assembleValidatedTDDFeatures } from './technicalSpecContract';
import { projectAssetMetadataToLegacyList, projectProductionBriefsToLegacy, projectVisualPromptsToLegacyMap } from './productionHandoffContract';
import { validatePitchSlides, validateScopeReview } from './scopePitchContract';
import { validateCritiqueRecord, validateGenerationMetadata } from './orchestrationContract';

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

export async function runUnifiedPipeline(conversationText: string, projectName: string, lens: LensType | null, slidesTemplate: any[], visualAssets: any[] = [], onProgress?: ProgressCallback, critiqueRecord?: CritiqueRecord, chatHistory: ChatMessage[] = []): Promise<ProjectPackage> {
    try {
        const critiqueValidation = validateCritiqueRecord(critiqueRecord);
        if (!critiqueRecord || !critiqueRecord.completed || !critiqueValidation.valid) throw new UnifiedPipelineCritiqueGateError(critiqueValidation.errors.length ? critiqueValidation.errors : ['A completed critique record is required.']);
        const startedAt = Date.now();
        const runId = `run_${startedAt}`;
        const stages: StageOutputEnvelope[] = [];
        const completeStage = (stage: StageOutputEnvelope['stage'], outputReferences: string[]) => stages.push({ stage, status: 'completed', generatedAt: Date.now(), outputReferences });
        completeStage('critique', ['critiqueRecord']);
        onProgress?.(5, 'Expanding conversation...');
        const expandedText = await AIService.getExpandedText(conversationText);
        completeStage('conversation', ['expandedText']);

        onProgress?.(15, 'Generating GDD table of contents...');
        const toc = await AIService.generateGDDTableOfContents(expandedText);

        onProgress?.(30, 'Generating GDD sections...');
        const gdd = await AIService.generateFullGDDV2(expandedText, toc, projectName);
        completeStage('gdd', ['gddContent']);

        onProgress?.(45, 'Generating Pitch Deck content...');
        const sourceIds = ['expanded-conversation', 'gdd', 'mvp', 'tdd', 'production-handoffs'];
        const pitchDeck = await AIService.generateFullPitchDeck(expandedText, projectName, slidesTemplate || [], sourceIds);
        const pitchDeckValidation = validatePitchSlides(pitchDeck, (slidesTemplate || []).map(slide => slide.title), sourceIds, true);
        if (!pitchDeckValidation.valid) throw new Error(`Pitch deck failed validation. ${pitchDeckValidation.errors.join('; ')}`);
        completeStage('pitch', ['pitchDeckContent']);

        onProgress?.(55, 'Generating visual prompts...');
        const visualPromptContracts = await AIService.generateVisualPromptContracts(expandedText, (visualAssets || []).map(asset => ({ id: asset.key, description: asset.description, aspectRatio: asset.aspectRatio, sourceReferences: [asset.key] })));
        const prompts = projectVisualPromptsToLegacyMap(visualPromptContracts);
        const images: Record<string, string> = {};
        for (const asset of visualAssets || []) {
            const prompt = prompts[asset.key] || `A concept for: ${asset.description}`;
            const imageData = await AIService.generateImage(prompt, asset.aspectRatio);
            if (imageData) images[asset.key] = imageData;
            onProgress?.(55 + Math.round((Object.keys(images).length / Math.max(1, visualAssets.length)) * 10), `Generated image for ${asset.key}...`);
        }

        onProgress?.(65, 'Defining MVP...');
        const mvp = await AIService.defineMVP(gdd);

        onProgress?.(75, 'Generating MVP feature specs...');
        const mvpFeatureSpecs: MVPFeatureSpec[] = [];
        const mvpFeatureSpecValidation: MVPFeatureSpecValidationOutcome[] = [];
        for (const feature of mvp.inScope) {
            onProgress?.(75 + Math.round((mvpFeatureSpecValidation.length / Math.max(1, mvp.inScope.length)) * 10), `Spec'ing feature: ${feature}`);
            const generated = await AIService.generateMVPFeatureSpec(feature, projectName, mvp);
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

        onProgress?.(84, 'Generating architect technical specifications...');
        const technicalSpecifications: Array<TechnicalSpecification | null> = [];
        const technicalErrors: string[] = [];
        for (const featureSpec of mvpFeatureSpecs) {
            const generated = await AIService.generateTechnicalSpecification(featureSpec, expandedText);
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
        completeStage('tdd', ['tddContent', 'technicalDesignDocument']);

        onProgress?.(85, 'Assembling final Technical Design Document...');
        const finalTdd = await AIService.generateTechnicalDesignDocument(expandedText, tddFeatures);

        onProgress?.(90, 'Generating freelance briefs...');
        const handoffText = JSON.stringify({ tddFeatures, assetRequirements: visualAssets || [] });
        const productionBriefs = await AIService.generateProductionBriefs(gdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n'), projectName, handoffText);
        const modularBreakdown = projectProductionBriefsToLegacy(productionBriefs);

        onProgress?.(92, 'Generating asset list...');
        const assetMetadata = await AIService.generateAssetMetadata(gdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n'), projectName, JSON.stringify(productionBriefs));
        const assetList = projectAssetMetadataToLegacyList(assetMetadata);
        completeStage('production', ['productionBriefs', 'assetMetadata', 'visualPromptContracts']);

        onProgress?.(95, 'Running scope review...');
        const reviewLens = lens || 'indie';
        const scopeReview = await AIService.generateScopeReview(gdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n'), reviewLens);
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
