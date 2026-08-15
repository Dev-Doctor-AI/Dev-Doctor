
import { ProjectType } from './types';

export const AI_SIGNATURE = '<!-- DD_AI_SIG_v1.0 -->';

// --- PITCH DECK & VISUALS (GENERIC) ---

export const CREATIVE_PROJECT_PITCH_DECK_SLIDES: { title: string; prompt: string; visual?: string }[] = [
  { title: "Title Slide", prompt: "Create a compelling title, the project's name, and a tagline.", visual: "project_logo" },
  { title: "The Problem", prompt: "Describe the gap in the market or the user desire this project fulfills." },
  { title: "The Solution: Your Project", prompt: "Introduce your project as the solution. High concept pitch.", visual: "concept_art_1" },
  { title: "Core Features & Loop", prompt: "Explain the core mechanics/features and what makes the experience compelling.", visual: "ui_mockup" },
  { title: "Unique Selling Proposition", prompt: "Detail what makes your project unique and better than the competition." },
  { title: "Target Audience", prompt: "Describe the ideal user for your project and the market size." },
  { title: "Art & Style", prompt: "Showcase the visual direction and aesthetic of the project.", visual: "concept_art_2" },
  { title: "The Team", prompt: "Briefly introduce the key team members and their expertise." },
  { title: "The Ask & Roadmap", prompt: "State what you are looking for (funding, publisher) and a high-level project timeline." },
  { title: "Contact Information", prompt: "Provide contact details for follow-up." },
];

export const CREATIVE_PROJECT_VISUAL_ASSETS: { key: string; description: string; aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' }[] = [
    { key: 'project_logo', description: 'A professional and iconic logo for the project.', aspectRatio: '1:1' },
    { key: 'concept_art_1', description: 'A key piece of concept art establishing the mood and a central character or scene.', aspectRatio: '16:9' },
    { key: 'concept_art_2', description: 'A second piece of concept art showcasing a different environment or a key moment.', aspectRatio: '16:9' },
    { key: 'ui_mockup', description: 'A mockup of the main screen or user interface (UI).', aspectRatio: '16:9' },
];