export const mvpDefinition = {
  summary: "The Minimum Viable Product focuses exclusively on a single-screen 2D interactive feeding arena with 6 core geometric shapes, 4 primary colors, tactile touch drag, and responsive monster slapstick audio-visual feedback loops.",
  inScope: [
    "Single static 2D screen with overhead shape dispenser and animated monster center-stage",
    "Thought-bubble visual prompt system with random shape/color pairing",
    "Touch drag-and-drop controller with 150% hit-box padding and finger offset",
    "Happy Dance celebration sequence upon correct feed",
    "Comedic Spit/Raspberry/Burp sequence upon incorrect feed",
    "Fully offline local storage for sound toggles and highest snack streak"
  ],
  outOfScope: [
    "User authentication or cloud save accounts",
    "Complex 3D graphics or multiple camera viewpoints",
    "In-app ad networks or third-party tracking SDKs",
    "Multi-monster selection (reserved for v1.5 update)",
    "Alphabet and Number expansion packs (reserved for v2.0)"
  ]
};

export const tddContent = [
  {
    feature: "Touch Drag & Drop Controller",
    userStories: "As a toddler playing on an iPad, I want to easily grab falling shapes with my finger and drag them into the monster's mouth without losing grip.",
    technicalSpecs: "### Technical Implementation\n- **Input Handler:** PointerDown / TouchStart listener bound to 2D Physics raycaster.\n- **Touch Smoothing:** Lerp interpolation (alpha = 0.35) between finger coordinates and sprite center to smooth out jittery toddler touch inputs.\n- **Target Detection:** OverlapBox collision check when finger releases over the MonsterMouthZone Collider."
  },
  {
    feature: "Prompt & Dispenser System",
    userStories: "As a player, I want the monster to clearly show what it wants to eat so I know which shape to look for.",
    technicalSpecs: "### Technical Implementation\n- **State Machine:** `IdleState` -> `PromptState` -> `DropState` -> `FeedingState` -> `ReactionState`.\n- **RNG Generator:** Selects target shape ID and color ID, then spawns 1 matching item and 2 non-matching distractors."
  }
];

export const modularBreakdown = [
  {
    title: "2D Character Animator & Illustrator Brief",
    content: "**Deliverables:** 1 Custom Squishy Monster Sprite Sheet (Idle, Hunger Rumbling, Chomping, Happy Dance, Spit/Burp Rejection) in PNG/Atlas format at 4K resolution."
  },
  {
    title: "Sound Designer & Slapstick Audio FX Brief",
    content: "**Deliverables:** 12 High-fidelity cartoon sound effects (stomach rumble, suction grab, squishy stretch, juicy chomp, triumphant fanfare, comical burp, silly raspberry spit)."
  },
  {
    title: "Unity 2D / Mobile Gameplay Engineer Brief",
    content: "**Deliverables:** Complete single-screen gameplay scene with 2D physics gravity, touch dragging, state machine prompt logic, and responsive screen scaling."
  }
];

export const assetList = {
  "Visual & 2D Sprites": [
    "Monster Character Sprite Sheet (Idle, Open Mouth, Chomp, Dance, Spit)",
    "Feeder Pipe & Dispenser Spigot (Top UI)",
    "6 Basic Shape Sprites (Circle, Square, Triangle, Star, Heart, Diamond)",
    "Thought Bubble UI Frame & Glow Effect",
    "Particle FX (Confetti stars, food crumbs, burp smoke puff)"
  ],
  "Audio & Sound Effects": [
    "Whimsical looping background theme (Ukulele & Glockenspiel, 110 BPM)",
    "Monster Belly Grumble SFX",
    "Item Drag & Release 'Pop' SFX",
    "Crunchy Chewing & Gulp SFX",
    "Triumphant 'Yay!' Celebration Fanfare SFX",
    "Comedic Cartoon Burp & Raspberry SFX"
  ],
  "UI & Production": [
    "Parental Gate Screen (Simple math verification)",
    "Audio Toggle (Music On/Off, SFX On/Off)",
    "App Store Icon (1024x1024) and Feature Graphic"
  ]
};

export const scopeReviewContent = [
  {
    feature: "2D Physics Multi-Touch Collision",
    critique: "Multiple toddlers tapping simultaneously can cause physics bodies to glitch or lock.",
    suggestion: "Enforce single-active-drag touch tracking, ignoring auxiliary touch pointers during an active drag.",
    reasoning: "Toddlers often rest their palms on tablet screens while playing.",
    severity: "High"
  },
  {
    feature: "App Store Privacy & Kids Category Compliance",
    critique: "Apple and Google enforce stringent requirements on Kids Category apps regarding tracking and external links.",
    suggestion: "Strip all analytics SDKs, ad networks, and place any parental settings behind a robust age gate.",
    reasoning: "Prevents App Store review rejection and protects young users.",
    severity: "High"
  },
  {
    feature: "Audio Repetition & Parent Fatigue",
    critique: "Excessively loud or frequent burp sounds may annoy parents after extended play sessions.",
    suggestion: "Include 4 randomized humorous variations of the rejection sound and a quick-mute icon on the pause screen.",
    reasoning: "Keeps the game enjoyable for parents in household environments.",
    severity: "Medium"
  }
];
