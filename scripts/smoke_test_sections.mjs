export const gddContent = [
  {
    title: "1. Executive Summary & Vision",
    content: "### 1.1 High Concept\n**The Picky Pet** is a whimsical, single-screen educational feeding game designed specifically for early childhood learners (ages 2–5). By disguising core cognitive sorting (colors, shapes, and patterns) behind an endearing, squishy creature with hilarious slapstick reactions, the game provides immediate sensory joy without classroom friction.\n\n### 1.2 Target Demographic & Platform\n- **Target Audience:** Toddlers and preschoolers (Ages 2–5) and their parents.\n- **Primary Hardware:** Apple iPad, iPhone, Android tablets and mobile devices.\n- **Design Pillars:** Instant Engagement (Zero Logins), Tactile Delight (Big Physics Targets), Comedic Slapstick (Playful Burp/Dance Feedback)."
  },
  {
    title: "2. Core Gameplay Mechanics",
    content: "### 2.1 The Core Feeding Loop\n1. **The Hunger Prompt:** The monster's belly rumbles with an interactive squish sound, and an animated thought bubble appears containing the target item (e.g., 'Red Square', 'Green Circle').\n2. **The Drop:** 2–4 colorful shapes drop from the overhead mechanical dispenser with soft 2D gravity.\n3. **Tactile Drag:** The child touches and drags the matching shape toward the monster's mouth. Touch hit-boxes are padded by 150% with vertical finger offset.\n4. **Dynamic Resolution:**\n   - **Correct Match:** The monster chomps with cartoon crunch effects, eyes sparkle, belly expands, and a celebratory victory dance plays (+1 Snack Counter).\n   - **Incorrect Match:** The monster makes a funny sour-lemon face, spits the shape out softly with a cartoon raspberry/burp sound, and re-displays the thought bubble with a gentle highlight."
  },
  {
    title: "3. Art Direction & Sensory Design",
    content: "### 3.1 Visual Aesthetic: 'Squishy & Goofy'\n- **Monster Design:** A lovable, gelatinous, bright-teal critter with expressive googly eyes, wobbly antennae, and a wide gummy grin. Highly reactive secondary physics on ears and belly.\n- **Color Palette:** High-contrast, vibrant primary and secondary hues (Sunny Yellow, Sky Blue, Berry Magenta, Lime Green) against a calming, warm pastel kitchen background.\n- **UI/UX Philosophy:** 100% iconographic. Zero text required for gameplay comprehension. Universal visual symbols."
  },
  {
    title: "4. Technical Architecture & Simplicity",
    content: "### 4.1 Scope Control & Engine Specifications\n- **Engine:** Unity 2D / Godot 4 / React Native Mobile Canvas.\n- **Rendering:** Fixed 1080p canvas with responsive aspect-ratio letterboxing (4:3 iPad to 19.5:9 modern phones).\n- **Physics:** 2D BoxCollider / CircleCollider with low gravity coefficient (0.35G) and gentle air drag.\n- **Local Privacy Architecture:** Zero server dependencies. 100% client-side execution complying with Apple Kids Category & Google Families Policy."
  },
  {
    title: "5. Roadmap & Modular Expansion",
    content: "### 5.1 Release Progression\n- **Phase 1 (MVP Launch):** 6 Basic Shapes (Circle, Square, Triangle, Star, Heart, Diamond) across 4 Primary Colors.\n- **Phase 2 (Content Update 1):** Alphabet Munch (Letters A–Z with phonetic pronunciation triggers).\n- **Phase 3 (Content Update 2):** Number Crunch (1–10 counting items with interactive stack physics)."
  }
];

export const pitchDeckContent = [
  {
    title: "The Picky Pet - Slide 1: Title & Hook",
    content: "## The Picky Pet\n### The Educational Game Toddlers Actually Beg to Play\n- An irresistible, squishy monster pet that makes early learning hilarious, tactile, and completely friction-free.\n- Zero logins. Zero ads. 100% pure slapstick fun.",
    visualPrompt: "A delightfully goofy, squishy teal monster sitting on a colorful kitchen floor, looking hungrily at a floating thought bubble with a sparkling blue triangle. Pixar-quality 3D render, vibrant lighting."
  },
  {
    title: "The Picky Pet - Slide 2: The Problem",
    content: "## The Problem with Preschool Apps\n1. **Too Academic:** Most educational apps feel like glorified multiple-choice worksheets that bore kids in 60 seconds.\n2. **Cluttered & Hostile:** Riddled with aggressive subscription pop-ups, external links, and confusing navigation menus.\n3. **Overengineered:** Bloated 3D engines that drain battery and require continuous cloud connectivity.",
    visualPrompt: "Split screen: frustrated toddler tapping an annoying subscription paywall popup vs happy toddler giggling at a simple cartoon game."
  },
  {
    title: "The Picky Pet - Slide 3: The Solution",
    content: "## The Solution: Pure Tactile Comedy\n- **One Simple Screen:** Instant launch directly into gameplay with zero setup.\n- **Slapstick Feedback:** Kids feed what the monster craves; wrong answers trigger hilarious burps; right answers trigger victory dances.\n- **Invisible Learning:** Develops shape, color, and sorting proficiency naturally through cause-and-effect tactile play.",
    visualPrompt: "Close-up of the squishy monster doing a joyous wiggle dance with confetti and star sparkles around its head."
  },
  {
    title: "The Picky Pet - Slide 4: Market & Growth",
    content: "## Market Opportunity & Expansion\n- **Addressable Market:** Over 120M tablets and mobile devices in households with toddlers ages 2–5.\n- **Premium Family Brand:** Positioned for $2.99–$4.99 premium purchase or Apple Arcade / Play Pass distribution.\n- **Franchise Expansion:** Plug-and-play asset system ready to scale to ABCs, 123s, Food Groups, and Emotion Recognition.",
    visualPrompt: "A sleek roadmap infographic showcasing modular cards for Shapes, Alphabet, Numbers, and Animal categories."
  }
];
