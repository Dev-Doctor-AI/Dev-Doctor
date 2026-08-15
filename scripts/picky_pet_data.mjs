export const projectName = "The Picky Pet";

export const chatHistory = [
  { sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?" },
  { sender: 'user', text: `The project is called "The Picky Pet". Here is the brainstorm:\n\nProject Brainstorm: "The Picky Pet" (Working Title)\nNeeds to be on the Apple store and Android for kids on iPads. An educational game where kids feed a funny, squishy little monster pet with cute-but-gross toddler humor.\nSingle static screen: monster thinks of a shape (e.g. "Blue Triangle"). Shapes drop from an overhead chute. Kid drags the match to the mouth.\nCorrect match = happy dance. Wrong match = comical spit out with massive burp/fart sound.\n100% Offline: zero accounts, no cloud, instant play.` },
  { sender: 'ai', text: "I love 'The Picky Pet'! A cute-but-gross squishy monster that toddlers feed falling shapes on a single static screen is such a clear, focused, and joyful premise. For this mobile experience, what visual style and audio tone do you envision for the monster's hilarious burp/fart feedback to make kids giggle?" },
  { sender: 'user', text: "Bright cartoon 2D graphics with squishy physics animations! Juicy cartoon sound effects—boings, chomps, and funny comic burps/farts without being genuinely disgusting. Very vibrant primary colors." },
  { sender: 'ai', text: "That vibrant, squishy 2D cartoon style with slapstick audio will hit the sweet spot for toddlers and parents alike! Since the game runs completely offline without accounts or cloud databases, are you ready for me to compile this vision into the formal technical critique and project documentation package?" },
  { sender: 'user', text: "Yes! Let's compile and generate the complete documentation package." }
];

export const expandedText = `Project: The Picky Pet
Target Platforms: iOS (App Store) & Android (Google Play) — Mobile & Tablet (iPad focus)
Target Audience: Toddlers & Preschoolers (Ages 2–5) and their parents
Core Concept: A single-screen 2D casual educational sorting game featuring an expressive, squishy monster pet. The pet grumbles with a thought bubble displaying its desired food item (e.g. "Blue Triangle"). Shapes fall gently from an overhead pipe; children drag-and-drop the matching target shape into the pet's mouth.
Key Mechanics:
- Single-screen drag-and-drop tactile sorting mechanics with forgiving touch target hitboxes.
- Comedic, positive feedback loop: successful feeds trigger a joyful chew animation and happy dance; incorrect items trigger a comical spit-out with harmless cartoon burp/fart sound effects.
- 100% Offline, COPPA/GDPR-K compliant zero-login architecture (no accounts, no cloud dependencies, no analytics tracking).
- Extensible modular architecture allowing rapid content swaps (from basic geometric shapes and primary colors to alphabet letters, phonics items, and numbers).`;

export const critiqueData = {
  summary: "The Picky Pet features a remarkably tight, achievable MVP scope with a strong emotional hook for early learners. The primary technical considerations center around touch hitbox forgivingness for toddler fine-motor skills, 2D physics performance across low-end Android tablets, and strict privacy/COPPA compliance for offline kids' games.",
  questions: [
    "How will the touch input handle toddler multi-touch dragging and erratic finger taps on capacitive screens?",
    "What is the asset swapping strategy to transition from geometric shapes to alphabet/number expansion packs without code rewrites?",
    "How will difficulty scaling (fall velocity, distractor shape count, spawn rates) be paced without frustrating very young players?"
  ]
};

export const critiqueAnswers = [
  { question: "How will the touch input handle toddler multi-touch dragging and erratic finger taps on capacitive screens?", answer: "Single-pointer touch priority with an invisible 25% oversized touch radius around falling shapes. Multi-touch events will ignore secondary palm or resting finger inputs, locking onto the first active shape drag." },
  { question: "What is the asset swapping strategy to transition from geometric shapes to alphabet/number expansion packs without code rewrites?", answer: "Data-driven JSON item registry containing item IDs, sprite paths, audio cue keys, and categorization tags (color, shape, letter, number). The core spawner will read items dynamically from configuration arrays." },
  { question: "How will difficulty scaling (fall velocity, distractor shape count, spawn rates) be paced without frustrating very young players?", answer: "Adaptive toddler pacing: shapes fall at a relaxed velocity (maximum 2-3 active shapes on screen simultaneously). If a child misses or hesitates for 5+ seconds, the monster performs a gentle reminder wiggle." }
];
