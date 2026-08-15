import { TDDFeature, UserStory, TechnicalSpec } from '../../types';

// This parser is designed to take a raw string from the AI and convert it back
// into the structured TDDFeature[] format.
export const parseTDDString = (rawText: string): TDDFeature[] => {
    if (!rawText || typeof rawText !== 'string') return [];

    const features: TDDFeature[] = [];
    // Split the text into sections for each feature.
    const featureBlocks = rawText.split(/\nFeature: /).filter(block => block.trim() !== '');

    for (const block of featureBlocks) {
        const lines = block.trim().split('\n');
        const featureName = lines[0].trim();
        
        const newUserStories: UserStory[] = [];
        const newTechnicalSpecs: TechnicalSpec[] = [];

        let currentSection: 'stories' | 'specs' | null = null;
        let currentUserStory: UserStory | null = null;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('User Stories:')) {
                currentSection = 'stories';
                continue;
            } else if (line.startsWith('Technical Specifications:')) {
                currentSection = 'specs';
                currentUserStory = null; // Reset when moving to the next major section
                continue;
            }

            if (currentSection === 'stories') {
                if (line.startsWith('"')) { // A new user story
                    if (currentUserStory) newUserStories.push(currentUserStory);
                    currentUserStory = { story: line.replace(/"/g, ''), acceptanceCriteria: [] };
                } else if (line.startsWith('- ') && currentUserStory) { // Acceptance criteria
                    currentUserStory.acceptanceCriteria.push(line.substring(2));
                }
            }

            if (currentSection === 'specs') {
                if (line.includes(':')) { // Likely a new component
                    const [component, ...detailsParts] = line.split(':');
                    if (component.trim() && detailsParts.length > 0) {
                         newTechnicalSpecs.push({ component: component.trim(), details: detailsParts.join(':').trim() });
                    }
                }
            }
        }
        
        if (currentUserStory) newUserStories.push(currentUserStory);

        if (featureName) {
            features.push({
                feature: featureName,
                userStories: newUserStories,
                technicalSpecs: newTechnicalSpecs
            });
        }
    }

    return features;
};
