import * as AIService from './lmStudioService';
import { ProjectPackage, LensType, MVPFeatureSpec, TDDFeature } from '../types';

export type ProgressCallback = (percent: number, message: string) => void;

export async function runUnifiedPipeline(conversationText: string, projectName: string, lens: LensType | null, slidesTemplate: any[], visualAssets: any[] = [], onProgress?: ProgressCallback): Promise<ProjectPackage> {
    try {
        onProgress?.(5, 'Expanding conversation...');
        const expandedText = await AIService.getExpandedText(conversationText);

        onProgress?.(15, 'Generating GDD table of contents...');
        const toc = await AIService.generateGDDTableOfContents(expandedText);

        onProgress?.(30, 'Generating GDD sections...');
        const gdd = await AIService.generateFullGDDV2(expandedText, toc, projectName);

        onProgress?.(45, 'Generating Pitch Deck content...');
        const pitchDeck = await AIService.generateFullPitchDeck(expandedText, projectName, slidesTemplate || []);

        onProgress?.(55, 'Generating visual prompts...');
        const prompts = await AIService.generateAllVisualPrompts(expandedText, visualAssets || []);
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
        const tddFeatures: TDDFeature[] = [];
        for (const feature of mvp.inScope) {
            onProgress?.(75 + Math.round((tddFeatures.length / Math.max(1, mvp.inScope.length)) * 10), `Spec'ing feature: ${feature}`);
            const featureSpec = await AIService.generateMVPFeatureSpec(feature, projectName, mvp);
            mvpFeatureSpecs.push(featureSpec);
            const userStories = featureSpec.userStory;
            const technicalSpecs = featureSpec.technicalNotes!;
            tddFeatures.push({ feature: featureSpec.feature, userStories, technicalSpecs });
        }

        onProgress?.(85, 'Assembling final Technical Design Document...');
        const finalTdd = await AIService.generateTechnicalDesignDocument(expandedText, tddFeatures);

        onProgress?.(90, 'Generating freelance briefs...');
        const modularBreakdown = await AIService.generateModularBreakdown(gdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n'), projectName);

        onProgress?.(92, 'Generating asset list...');
        const assetList = await AIService.generateAssetList(gdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n'));

        onProgress?.(95, 'Running scope review...');
        const reviewLens = lens || 'indie';
        const scopeReview = await AIService.generateScopeReview(gdd.map(s => `## ${s.title}\n${s.content}`).join('\n\n'), reviewLens);

        onProgress?.(100, 'Complete');

        const packageObj: ProjectPackage = {
            meta: { projectName, generatedAt: Date.now() },
            chatHistory: [],
            critiqueQA: { summary: '', questions: [], answers: [] },
            expandedText,
            gddContent: gdd,
            pitchDeckContent: pitchDeck,
            generatedImages: images,
            mvpDefinition: mvp,
            mvpFeatureSpecs,
            tddContent: tddFeatures,
            technicalDesignDocument: finalTdd,
            modularBreakdown,
            assetList,
            scopeReviewContent: scopeReview,
        };

        return packageObj;
    } catch (err) {
        throw err;
    }
}
