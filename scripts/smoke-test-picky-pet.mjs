import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'Output Files');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('[Smoke Test] Generating full multi-format packages for "The Picky Pet"...');
const projectName = 'The Picky Pet';
const projectType = 'DIRECT_CHAT';

const chatHistory = [
  { sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. What is the working title or idea for your project?" },
  { sender: 'user', text: `Project Brainstorm: "The Picky Pet" (Working Title)\nLiterally just had this thought while getting coffee. Throwing it down before I forget. Needs to be on the Apple store and Android, whatever the kids are using on their parents' iPads these days.\n\nThe Vision\nOkay, so basically, it's an educational game, but we don't tell the kids it's educational. They hate that. We just give them a really funny, squishy little monster pet. We need to make sure the monster is totally custom and researched—not just some generic stock asset shortcut. We want a design that perfectly hits that cute-but-gross vibe that toddlers are obsessed with.\n\nThe Gameplay Loop\nThe Setup: Just one static screen. No scrolling worlds, no crazy 3D camera angles. Keeps our scope tiny so we can actually finish it.\nThe Prompt: The monster's stomach grumbles, and a little thought bubble pops up over its head. Inside the bubble is a specific thing it wants to eat, like a "Blue Triangle".\nThe Action: A bunch of random shapes drop from a pipe at the top of the screen. The kid just has to drag with their finger to pull the blue triangle into the monster's mouth.\nThe Feedback: If they get it right, the monster chomps it down and does a little happy dance. If they feed it the wrong shape, it spits it out and makes a massive burp or fart noise. Kids think that stuff is hilarious.\n\nTech Requirements\nNo Cloud Stuff: No making accounts, no logging in, no saving to the internet. 100% offline.\nFuture Proof: Start with colors and shapes, expand to alphabet letters or numbers later.` },
  { sender: 'ai', text: "I love this concept! 'The Picky Pet' has that playful, tactile charm that toddlers instantly connect with. Having a squishy creature crave specific shapes/colors while keeping the screen static is a brilliant way to keep development scoped while maximizing fun.\n\nTo help define the visual vibe: what kind of art style do you envision for our squishy monster (e.g., hand-drawn claymation, bright 2D vector cartoon, or soft plush textures)?" },
  { sender: 'user', text: "Bright colorful 2D vector cartoon with big googly eyes, jiggly physics, and funny sound effects!" },
  { sender: 'ai', text: "That cartoon style with jiggly physics will look adorable on iPad screens! I believe I have a clear vision for The Picky Pet now. Are you ready for me to compile this and begin the formal design critique?" }
];

const critiqueData = {
  summary: "The Picky Pet has a clear, accessible core loop well-suited for early childhood touch interaction. Technical focus must be placed on responsive drag-and-drop hitboxes for small fingers, reliable 2D physics performance on mobile tablets, and strict compliance with COPPA / App Store Kids Category guidelines.",
  questions: [
    "How will the touch drag-and-drop handle toddler finger inaccuracy (e.g. hitbox padding, magnetic snapping near the mouth)?",
    "What frame rate target and 2D engine (e.g. Unity 2D or Godot) will ensure smooth physics without draining mobile battery?",
    "How will the game guarantee 100% offline COPPA compliance with zero telemetry or third-party ad tracking?"
  ]
};

const critiqueAnswers = [
  "We will use generous hitbox padding (at least 64x64px touch target) and gentle magnetic snapping so young toddlers don't get frustrated when dragging shapes to the monster's mouth.",
  "We will target 60 FPS using lightweight 2D sprite rendering and simple circle/box rigidbodies in Unity or Godot to minimize battery draw on older iPads.",
  "Zero analytics, zero cloud SDKs, zero ads. The game is 100% self-contained offline, fully compliant with COPPA and Apple's strict Kids Category guidelines."
];


import fs from 'fs';
import path from 'path';

// Output directory
const OUTPUT_DIR = path.resolve(process.cwd(), 'Output Files');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
const gddContent = [
  {
    title: "1. Executive Summary & Vision",
    content: "### Project Name: The Picky Pet\n**Platform**: iOS & Android (Tablet/Phone)\n**Genre**: Early Childhood Educational / Casual Sorting Game\n**Target Audience**: Toddlers & Preschoolers (Ages 2–5) and their parents.\n\n**Vision Statement**:\nProvide young children with an irresistibly funny, squishy virtual companion who loves to eat specific shapes and colors. By disguising learning mechanics inside slapstick monster reactions, children master shape recognition, color discrimination, and fine motor skills naturally without test anxiety."
  },
  {
    title: "2. Core Gameplay Loop & Mechanics",
    content: "### The Core Loop\n1. **The Craving**: The monster's stomach rumbles with an animation, and a clear visual thought bubble appears (e.g., *Blue Triangle* or *Red Circle*).\n2. **The Feeding**: Objects with varied colors and shapes gently fall from the top pipe under soft gravity. The player drags candidate objects into the monster's mouth.\n3. **The Payoff**:\n   - *Correct Choice*: Monster chews with squash-and-stretch animation, displays hearts/stars, and plays a rewarding sound.\n   - *Incorrect Choice*: Monster makes a silly face, spits the item back out, and emits a harmless, humorous cartoon burp or toot sound that makes kids giggle.\n4. **Progression**: After 3–5 successful snacks, the monster does a celebration jig, and a new food category or color theme is introduced."
  },
  {
    title: "3. User Interface & Controls",
    content: "### Minimalist Toddler Interface\n- **Zero Text Dependency**: All gameplay instructions, cravings, and feedback are purely visual and auditory.\n- **Generous Touch Targets**: Minimum 72x72 pt touch boundaries with magnetic suction radius (30px) around the mouth to accommodate developing motor coordination.\n- **Protected Settings**: Simple parental gate (e.g., 'Hold for 3 seconds') for audio/volume settings."
  },
  {
    title: "4. Visual & Audio Design",
    content: "### Art Direction\n- **Visual Style**: High-vibrancy 2D vector animation with expressive squash-and-stretch deformation, oversized googly eyes, and jiggly jelly-like body physics.\n- **Audio Landscape**: Playful ukulele/marimba background music, squishy tactile popping sounds for touch interaction, cheerful chomps, and exaggerated comedic sound effects."
  },
  {
    title: "5. Technical Architecture & Privacy",
    content: "### Zero-Cloud Privacy Model\n- **100% Offline**: All game assets, sound files, and logic are packaged locally within the app binary. No internet connection required.\n- **COPPA & Store Compliance**: Complies strictly with Apple App Store Kids Category Guidelines and Google Designed for Families program."
  }
];

const pitchDeckContent = [
  {
    title: "Slide 1: Title & Hook",
    content: "# The Picky Pet\n### The Squishy Educational Companion Kids Actually Want to Play\n*Educational sorting disguised as pure slapstick fun for toddlers.*",
    visualPrompt: "Vibrant cartoon banner showing a cute, chubby green monster with huge googly eyes opening its mouth while colorful 2D shapes fall from above."
  },
  {
    title: "Slide 2: The Problem & Opportunity",
    content: "### Learning Apps Feel Like Work\n- Most educational apps for ages 2–5 feel like digital flashcards that kids quickly abandon.\n- Parents want guilt-free screen time that stimulates cognitive growth without aggressive ads or hidden subscriptions.",
    visualPrompt: "Split concept art: bored child looking at boring flashcard app vs smiling toddler laughing while playing with a funny squishy pet."
  },
  {
    title: "Slide 3: Core Solution & Gameplay",
    content: "### Feed the Monster's Cravings\n- **Thought Bubble Quests**: The monster craves specific shapes and colors.\n- **Tactile Drag & Drop**: Toddlers drag falling items into the monster's mouth.\n- **Instant Joy**: Correct foods trigger celebration dances; wrong items trigger hilarious cartoon burps.",
    visualPrompt: "In-game screen mockup of The Picky Pet with thought bubble containing a glowing blue star and colorful shapes tumbling down."
  },
  {
    title: "Slide 4: Privacy & Parent Trust",
    content: "### Safe, Calm, and 100% Offline\n- No user accounts, no logins, no server infrastructure.\n- Zero ads, zero tracking, guaranteed COPPA and Apple Kids Category compliance.\n- High parent trust leading to organic word-of-mouth recommendations.",
    visualPrompt: "A sleek tablet displaying a shield badge with '100% Safe Offline Play - Certified Kids Safe'."
  },
  {
    title: "Slide 5: Scalable Expansion Roadmap",
    content: "### A Modular Educational Franchise\n- **Launch MVP**: Basic Shapes (Triangle, Square, Circle) & Primary Colors.\n- **Phase 2 Expansion**: Numbers (1–10) and Animal Sorting.\n- **Phase 3 Expansion**: Alphabet phonics and multi-monster themed packs.",
    visualPrompt: "Diagram showing the modular roadmap from Shapes/Colors to Alphabet and Numbers with themed monster variants."
  }
];
const mvpDefinition = {
  summary: "The Picky Pet MVP establishes the single-screen tactile feeding loop with 4 basic shapes, 4 primary colors, local score celebration, and 100% offline operation on iOS and Android tablets.",
  inScope: [
    "Single static play screen with pipe dropper and squishy 2D monster",
    "4 Geometric Shapes: Circle, Square, Triangle, Star",
    "4 Primary/Secondary Colors: Red, Blue, Green, Yellow",
    "Touch drag-and-drop with magnetic mouth suction zone",
    "Correct chomp & incorrect funny burp audio/visual reactions",
    "Local session streak counter and celebration dances",
    "Offline-first build with zero network requests"
  ],
  outOfScope: [
    "Alphabet phonics or complex number sequencing",
    "Cloud save sync and cross-device account management",
    "In-app purchases or subscription billing",
    "Multiplayer or social sharing features",
    "3D rendering or complex physics simulations"
  ]
};

const tddContent = [
  {
    feature: "Touch Drag & Drop with Magnetic Snapping",
    userStories: "As a toddler player, I want to easily drag falling shapes into the monster's mouth even if my finger is slightly off target so that I feel successful and have fun.",
    technicalSpecs: "Implement Unity / Godot 2D PointerDragHandler with minimum 64x64px touch collider. Compute distance vector d = ||touchPos - mouthCenter||. If d < 45px, apply suction lerp: touchPos = Lerp(touchPos, mouthCenter, Time.deltaTime * 12.0f)."
  },
  {
    feature: "Craving Evaluator & Feedback State Machine",
    userStories: "As a player, I want the monster to clearly react when I feed it the correct or incorrect item so that I understand if I followed its craving.",
    technicalSpecs: "Enum CravingState { Idle, Demanding, Eating, Rejecting, Celebrating }. When object collides with mouth trigger, evaluate: droppedItem.shape == activeCraving.shape && droppedItem.color == activeCraving.color. If match: trigger Eating state and emit reward particle; else: trigger Rejecting state with impulse velocity and play comical audio FX."
  },
  {
    feature: "Zero-Telemetry COPPA Enforcer",
    userStories: "As a parent, I want complete confidence that my child's app does not track data or connect to external servers.",
    technicalSpecs: "Disable all network permissions in AndroidManifest.xml and Info.plist. Ensure zero external third-party SDK analytics packages are imported into build pipeline."
  }
];

const modularBreakdown = [
  {
    title: "1. 2D Unity/Godot Gameplay Engineer Brief",
    content: "### Objective\nImplement the single-screen 2D gameplay loop, touch input handling, magnetic suction snapping, and collision state machine in Unity or Godot.\n\n### Deliverables\n- Standalone testable build running at 60 FPS on iPad and Android tablets.\n- Modular shape dropper prefab system supporting configurable gravity and drop rates.\n- Unit tests for Craving Evaluator logic."
  },
  {
    title: "2. Character Animator & 2D Artist Brief",
    content: "### Objective\nCreate the signature 'Picky Pet' monster character in Spine 2D or frame animation with full squash-and-stretch keyframes.\n\n### Deliverables\n- Monster Idle loop, Stomach Grumble, Mouth Open, Happy Chomp, and Funny Spitting animations in SVG / 2D Atlas format.\n- 4 Shape sprites in 4 vivid colors with friendly rounded edges."
  },
  {
    title: "3. Sound Designer & Audio FX Brief",
    content: "### Objective\nCompose a cheerful, soothing background music track and record punchy, comical cartoon sound effects.\n\n### Deliverables\n- 60-second looping marimba/acoustic background music track (uncompressed WAV + OGG).\n- 12 cartoon sound FX: Pop, Whoosh, Chomp, Giggle, Chew, Cartoon Burp, Cartoon Toot, Party Horn."
  }
];

const assetList = {
  "2D Art & Character Sprites": [
    "Squishy Monster base sprite with Spine 2D rigging",
    "Thought Bubble UI element with pulsing animation",
    "Pipe Dropper top-screen asset",
    "Geometric Shape Sprites: Circle, Square, Triangle, Star in Red, Blue, Green, Yellow",
    "Particle Sprites: Sparkles, Confetti, Star Bursts"
  ],
  "Audio & Sound Effects": [
    "Background Theme Music (Playful Acoustic Loop)",
    "Item Touch / Grab Pop SFX",
    "Magnetic Snapping Whoosh SFX",
    "Correct Food Chomp & Munch SFX",
    "Victory Celebration Horn & Giggle SFX",
    "Silly Spit / Comical Burp / Toot SFX"
  ],
  "UI & Packaging Assets": [
    "High-res App Icon (1024x1024 for App Store & Google Play)",
    "Store Screenshots for iPad (12.9\") and Android Tablet (10\")",
    "Parental Gate Modal with Multi-Touch Prompt"
  ]
};

const scopeReviewContent = [
  {
    feature: "Physics-Driven Shape Spawner",
    severity: "Low",
    critique: "Complex 2D rigidbodies with excessive physics bounces can create chaotic pile-ups that overwhelm young children.",
    suggestion: "Use gentle constant linear fall speed with soft damping rather than unbounded bouncy physics.",
    reasoning: "Toddlers need predictable, slow-moving targets to successfully coordinate drag-and-drop gestures."
  },
  {
    feature: "Offline Kids Category Compliance",
    severity: "High",
    critique: "Apple and Google strictly reject Kids category apps that contain hidden analytics libraries or third-party web views.",
    suggestion: "Audit all build dependencies and strip any analytics, crashlytics, or advertising pods from production bundles.",
    reasoning: "App Store Kids category review is unforgiving; 100% offline compliance guarantees instant approval."
  },
  {
    feature: "App Scope & Reusability",
    severity: "Low",
    critique: "Hardcoding shapes and colors in code would require rebuilding the app for future alphabet or number releases.",
    suggestion: "Store shape definitions, cravings, and sprite references in a simple local JSON configuration file.",
    reasoning: "Enables rapid creation of sequel packs (Letters, Numbers, Animals) without modifying core engine logic."
  }
];



console.log('Output directory confirmed:', OUTPUT_DIR);
