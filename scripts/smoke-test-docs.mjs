export const critiqueData = {
  summary: "The Picky Pet has an exceptionally strong, accessible core loop tailored for toddlers (2-5 years) with zero server infrastructure overhead. Key technical considerations focus on responsive 2D multi-touch physics on mobile tablets (iPad / Android), object pooling for falling shape entities, audio latency for comedic feedback, and offline parental gate compliance (COPPA/GDPR-K).",
  questions: [
    "How will multi-touch finger drags and shape hitboxes handle erratic toddler touch gestures?",
    "What 2D physics engine approach will ensure smooth 60fps falling shape physics and custom squish monster animations?",
    "How will the offline sound manager handle rapid audio layering without playback lag when toddlers spam incorrect shapes?",
    "What parental gate mechanism will be implemented to comply with Apple App Store Kids Category and Google Play Families policy?"
  ]
};

export const critiqueAnswers = [
  "Multi-touch will register single-primary drag with touch-slop tolerance; touching multiple shapes picks the highest z-index target without crashing.",
  "Engine will be lightweight Unity 2D (or Godot 4.3 Mobile) using 2D Box2D physics with simple colliders and 2D Spine / Sprite animations.",
  "An optimized in-memory SoundPool channel group with 4 simultaneous voice limit and pitch randomization (0.9x - 1.1x) to prevent audio fatigue.",
  "A simple multiplication/gesture math parental gate modal for any external links/settings with zero network telemetry or tracking IDs to guarantee 100% COPPA compliance."
];

export const expandedText = `Project Name: The Picky Pet
Target Platforms: iOS (iPad / iPhone) & Android Tablets / Phones
Target Audience: Toddlers & Preschoolers (Ages 2–5) and Parents
Core Aesthetic: "Cute-but-Gross" Saturday morning cartoon, squishy hand-drawn 2D monster character with expressive slapstick squash-and-stretch animation.
Core Mechanics: Single static screen, physics-based falling shapes from a top dispenser pipe, thought-bubble target matcher (Color + Shape combinations), touch drag-and-drop ingestion, immediate comedic audiovisual feedback (happy dance vs gross burp/spit-out).
Educational Goals: Shape recognition (Circle, Triangle, Square, Star), Color theory (Red, Blue, Yellow, Green), Sorting logic, Fine motor coordination.
Architecture & Infrastructure: 100% Client-side Offline architecture. Zero cloud backends, zero user accounts, zero remote telemetry. Direct-to-game instant boot. Highly modular item dispenser designed for future content packs (Letters, Numbers, Fruit, Animals).`;

export const gddContent = [
  {
    title: "1. Executive Summary & Core Pillars",
    content: "The Picky Pet is a single-screen, tactile preschool sorting game built around a quirky, squishy monster companion with an insatiable but peculiar appetite.\n\n### Core Pillars:\n- Invisible Education: Learning shapes and colors through comedic feedback.\n- Immediate Tactile Feedback: Juicy drag physics, squish deformations, and cartoon audio.\n- Zero-Friction Play: Instant launch directly into gameplay with 100% offline support."
  },
  {
    title: "2. Target Audience & Platform Strategy",
    content: "### Demographics:\n- Primary: Toddlers & Preschoolers (2-5 years)\n- Secondary: Parents seeking ad-free, safe offline games for travel.\n\n### Platforms:\n- iPadOS 15+ & iOS (iPhone), Android 10+ tablets and smartphones."
  },
  {
    title: "3. Core Gameplay Loop & Mechanics",
    content: "1. The Prompt: Monster rubs its belly, thought bubble displays target (e.g. Blue Triangle).\n2. The Drop: 3 to 6 physics shapes drop from overhead chute.\n3. The Action: Child drags matching shape into monster mouth.\n4. Feedback:\n   - Correct: Monster munches enthusiastically and does a happy dance.\n   - Incorrect: Monster puffs green cheeks and burps it out.\n5. Progression: 5 successful feeds awards celebration confetti and fun monster hats."
  },
  {
    title: "4. Visual Style & Audio",
    content: "Bright pastel cartoon art with thick bold outlines and fluid squash-and-stretch animations. Cheerful ukulele/marimba BGM and custom comedic voice gibberish, giggles, burps, and chomps."
  },
  {
    title: "5. Monetization & Privacy",
    content: "Premium $2.99 single purchase or Free-to-Try with one-time IAP unlock protected by parental gate. 100% COPPA and GDPR-K compliant with zero ads and zero data collection."
  }
];
