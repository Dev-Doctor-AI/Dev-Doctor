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

export const rawInput = `Project Brainstorm: "The Picky Pet" (Working Title)
Literally just had this thought while getting coffee. Throwing it down before I forget. Needs to be on the Apple store and Android, whatever the kids are using on their parents' iPads these days.

The Vision
Okay, so basically, it's an educational game, but we don't tell the kids it's educational. They hate that. We just give them a really funny, squishy little monster pet. We need to make sure the monster is totally custom and researched—not just some generic stock asset shortcut. We want a design that perfectly hits that cute-but-gross vibe that toddlers are obsessed with.

The Gameplay Loop
I don't really know how the coding engines work—like Unity or Java or whatever you guys type in—but the logic should be super basic to build.

The Setup: Just one static screen. No scrolling worlds, no crazy 3D camera angles. Keeps our scope tiny so we can actually finish it.

The Prompt: The monster's stomach grumbles, and a little thought bubble pops up over its head. Inside the bubble is a specific thing it wants to eat, like a "Blue Triangle."

The Action: A bunch of random shapes drop from a pipe at the top of the screen. The kid just has to drag with their finger to pull the blue triangle into the monster's mouth.

The Feedback: If they get it right, the monster chomps it down and does a little happy dance. If they feed it the wrong shape, it spits it out and makes a massive burp or fart noise. Kids think that stuff is hilarious. It's basically a money printer.

The Educational Angle
It teaches basic shape, color, and sorting logic without feeling like a classroom test. I figure making the shapes fall down from the ceiling is just a gravity toggle switch you turn on in the software, right? Should be pretty quick to whip up.

Tech "Requirements" (Keep it simple)
No Cloud Stuff: No making accounts, no logging in, no saving to the internet. You just tap the app icon and boom, you are feeding the monster. I don't want to deal with servers or databases because I hear that gets messy and expensive.

Future Proof: We start with just colors and shapes to keep the launch small. If it goes viral, we just swap the shape pictures out for alphabet letters or numbers later. Boom. Educational franchise.`;

export const projectName = 'The Picky Pet';

export const chatHistory = [
  { sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?" },
  { sender: 'user', text: rawInput },
  { sender: 'ai', text: "That squishy, cute-but-gross monster idea is pure toddler gold! The single-screen gravity drop with instant funny sound rewards is a brilliantly tight MVP loop.\n\nTo help lock in the art direction and audio scope: what kind of visual style and personality traits do you imagine for our monster friend (e.g. vibrant 2D cartoon jelly blob with big goofy eyes)?" },
  { sender: 'user', text: "Yes! A bouncy 2D pastel jelly blob with big expressive googly eyes and funny cartoon sound effects for the burps and chomps. Touch screen only for tablets and phones." },
  { sender: 'ai', text: "I love that bouncy pastel jelly aesthetic with oversized googly eyes—it will immediately charm toddlers while keeping 2D animation budgets super lean.\n\nI believe I have a clear vision for The Picky Pet now. Are you ready for me to compile this and begin the formal design critique?" },
  { sender: 'user', text: "Yes! Let's compile and do the critique." }
];

export const critiqueData = {
  summary: "The Picky Pet has an extraordinarily focused core loop suitable for a high-retention toddler educational game. The single-screen 2D physics setup avoids camera and world complexity, but touch-drag collision hitboxes and object pool performance for dropping shapes require precise tuning on low-end parent tablets.",
  questions: [
    "How will the touch drag-and-drop mechanic handle multi-touch interference or accidental toddler screen-palming on tablets?",
    "What is the deterministic shape-spawning rate and maximum on-screen object count to prevent visual clutter and maintain 60 FPS on older mobile hardware?",
    "How will audio assets (burps, chomps, happy tunes) and localized voice prompts be compressed for instant offline loading under 50MB?",
    "What fail-safe mechanism prevents unwinnable drops (e.g., ensuring the requested target shape spawns within a guaranteed 3-second window)?"
  ]
};

export const critiqueAnswers = [
  { question: critiqueData.questions[0], answer: "Implement single-finger gesture locking with palm rejection so only the first active touch point drags shapes, ignoring accidental palm rests." },
  { question: critiqueData.questions[1], answer: "Cap active on-screen shapes at 6 simultaneous items using an object pool with gentle fall speeds calibrated for toddler motor coordination." },
  { question: critiqueData.questions[2], answer: "Package all 2D sprite sheets and audio as high-efficiency OGG/AAC bundles directly in the standalone app binary for zero-latency, 100% offline gameplay under 35MB." },
  { question: critiqueData.questions[3], answer: "Use a weighted deterministic bag spawner that guarantees at least one valid target shape drops every 2-3 seconds." }
];
export const gddContent = [
  {
    title: "1. Executive Summary & Vision",
    content: "### Project Overview\n**The Picky Pet** is an offline, single-screen 2D educational sorting game for iOS and Android tablets and smartphones.\n\n### Core Value Proposition\nStealth education: children learn shape, color, and sorting logic through humorous cause-and-effect physical interactions with a squishy, reactive monster pet rather than punitive quiz mechanics."
  },
  {
    title: "2. Core Gameplay Mechanics & Loop",
    content: "### Primary Game Loop\n1. **Hunger Prompt**: The monster's thought bubble displays a target item (e.g. \"Blue Triangle\").\n2. **Gravity Conveyor**: Colorful geometric shapes drop gently from an overhead dispenser pipe.\n3. **Drag-to-Feed Interaction**: The player touches and drags the matching shape into the monster's open mouth.\n4. **Reward / Feedback**:\n   - **Correct**: Crunchy chomp animation, confetti particle puff, happy wiggle, +1 score streak.\n   - **Incorrect**: Playful rejection spit with a comical burp/raspberry sound effect; shape bounces away safely without score penalties.\n\n### Difficulty & Progression\n- **Tier 1 (Shapes)**: Circle, Square, Triangle (single color).\n- **Tier 2 (Colors & Shapes)**: Red/Blue/Green variants.\n- **Tier 3 (Counting & Speed)**: Mild speed increase and multi-item requests (e.g., '2 Yellow Stars')."
  },
  {
    title: "3. Technical & Platform Architecture",
    content: "### Architecture Principles\n- **Zero Backend / 100% Offline**: No network calls, telemetry, accounts, or cloud storage required. Instant launch.\n- **Target Engine**: Unity 2D (C#) or Godot 4 (GDScript) exporting native iOS (iPadOS 14+) and Android (API 26+) builds.\n- **Object Pooling**: Pre-instantiated physics rigidbodies (2D circle/box colliders) for falling food items to prevent runtime GC frame drops.\n- **Touch Input Architecture**: Multi-touch filter that isolates active drags and suppresses secondary palm touches."
  },
  {
    title: "4. Art, Animation & Audio Direction",
    content: "### Visual Style\n- **Character**: \"Gloop\" — a soft pastel jelly monster with dynamic squash-and-stretch physics and oversized googly eyes that track touch points.\n- **Color Palette**: High-contrast, friendly pastels (Mint Green, Warm Orange, Sky Blue, Berry Pink).\n\n### Audio Experience\n- Bouncy, acoustic rhythm track (ukulele/xylophone).\n- Slapstick foley sound effects: squishy squelches, cartoon chomps, cheerful burps, and triumphant bells."
  },
  {
    title: "5. Production Roadmap & Milestone Plan",
    content: "### Milestone 1: Core Physics & Drag Prototype (Week 1-2)\n- Single static scene with falling shapes and drag-drop mouth trigger.\n- Basic correct/incorrect feedback states.\n\n### Milestone 2: Character Rigging & Audio Polish (Week 3-4)\n- 2D squash-and-stretch monster sprite rig with eye tracking.\n- Audio integration and comedic sound feedback.\n\n### Milestone 3: Content Expansion & Store Packaging (Week 5-6)\n- Shape/color progression tiers.\n- Standalone App Store / Google Play packaging under 50MB."
  }
];

export const mvpDefinition = {
  summary: "A zero-cloud, single-screen 2D mobile game featuring 1 squishy monster, 4 basic shapes, 3 primary colors, drag-and-drop physics, and humorous audio feedback.",
  inScope: [
    "Single static 2D play arena optimized for tablet landscape/portrait",
    "One custom pastel monster character with 4 animation states (Idle, Anticipation/Eye-Track, Happy Chomp, Playful Spit)",
    "Gravity spawner with 4 basic shapes (Circle, Square, Triangle, Star) in 3 colors (Red, Blue, Yellow)",
    "Touch drag-and-drop with single-touch lock and palm rejection",
    "Audio system with 1 looping background music track and 8 reactive sound effects",
    "Standalone offline local score tracking and streak counter"
  ],
  outOfScope: [
    "Cloud saves, login systems, and multiplayer",
    "In-App Purchases (IAP) or advertising SDKs for initial MVP launch",
    "Complex 3D graphics or multi-room environments",
    "Alphabet, phonics, and handwriting tracing modes (reserved for v2 franchise expansion)"
  ]
};
export const tddContent = [
  {
    feature: "Drag-and-Drop Feeding Interaction",
    userStories: "As a toddler player, I want to drag a falling shape into the monster's mouth with my finger so that the pet can eat it.",
    technicalSpecs: "### Technical Specification: Feeding Gesture & Collision\n- **Input Handler**: `TouchInputManager.cs` listens for `TouchPhase.Began` on 2D colliders tagged `FoodItem`.\n- **Drag Translation**: `Camera.main.ScreenToWorldPoint` maps continuous pointer position with smooth lerp (t=0.25).\n- **Drop Target**: Monster mouth utilizes a `CircleCollider2D(isTrigger=true)`. When `FoodItem` is released within trigger bounds, invoke `FeedEvent(itemData)`.\n- **Palm Rejection**: Ignore any new finger IDs while an active `FingerDragInstance` is non-null."
  },
  {
    feature: "Deterministic Shape Spawner & Object Pool",
    userStories: "As a player, I want the correct shape to appear regularly so that I never get stuck waiting for food.",
    technicalSpecs: "### Technical Specification: Shape Pool & Spawning Queue\n- **Pool Size**: 12 pre-warmed `FoodItemController` GameObjects with `Rigidbody2D` and dynamic gravity scale (0.4f - 0.7f).\n- **Spawn Cadence**: `SpawnInterval = 1.8f` seconds.\n- **Guarantee Algorithm**: A pseudo-random shuffle bag ensures the requested item appears at least once every 3 drops."
  },
  {
    feature: "Reactive Character Animation State Controller",
    userStories: "As a player, I want the monster to look at my finger and react funny when fed so that playing feels rewarding.",
    technicalSpecs: "### Technical Specification: Monster State Controller\n- **Eye Tracking**: Pupil transforms look toward active screen touch coordinate clamped to a 15-degree radius.\n- **State Machine**: States `IDLE` -> `DRAGGING_NEAR` -> `CHOMP_SUCCESS` | `SPIT_REJECT`.\n- **Animation**: 2D bone squash/stretch driven via Unity Animator or Spine2D."
  }
];

export const modularBreakdown = [
  {
    title: "Brief: 2D Character Artist & Animator",
    content: "### Scope of Work\nDesign and animate the hero character 'Gloop':\n- 1x High-resolution 2D monster character sheet (Pastel Jelly aesthetic with large googly eyes).\n- Animations: Idle breathing loop, Anticipation/Open-mouth, Happy chew/dance, Disgusted spit-take.\n- Deliverables: Spine2D project file or clean PNG sprite atlas with normal maps."
  },
  {
    title: "Brief: Unity 2D / Mobile Gameplay Developer",
    content: "### Scope of Work\nBuild the complete single-scene interactive game loop in Unity 2022 LTS / Godot 4:\n- Implement touch drag-drop physics and mouth trigger detection.\n- Implement object pool and deterministic shape bag spawner.\n- Build offline score tracker and responsive UI scaling for iPad and Android tablets.\n- Deliverables: Clean C#/GDScript repository with documented scene architecture."
  },
  {
    title: "Brief: Sound Designer & Foley Artist",
    content: "### Scope of Work\nCreate wholesome, comedic cartoon sound effects and background music:\n- 1x 60-second seamless looping cheerful background track.\n- 6x Slapstick sound effects: Happy chomp, comical burp, raspberry spit, sparkle cheer, suction drop, squishy tap.\n- Deliverables: 44.1kHz 16-bit WAV masters and compressed OGG/AAC game-ready assets."
  }
];

export const scopeReview = [
  {
    feature: "Single-Screen Architecture",
    critique: "A single static screen keeps development velocity exceptionally high and reduces QA surface area.",
    suggestion: "Maintain strict boundary checks to ensure falling physics bodies despawn cleanly at screen bottom.",
    reasoning: "Prevents memory leaks and off-screen collision processing on prolonged play sessions.",
    severity: "Low"
  },
  {
    feature: "No-Backend / Offline Guarantee",
    critique: "Completely eliminating cloud databases accelerates time-to-market and bypasses COPPA/GDPR compliance bottlenecks for child accounts.",
    suggestion: "Save sound toggle and high-score records locally via encrypted PlayerPrefs / SQLite local store.",
    reasoning: "Protects child privacy and guarantees 100% offline play in cars and airplanes.",
    severity: "Low"
  },
  {
    feature: "Touch Drag & Multi-Touch Interference",
    critique: "Young children frequently place multiple fingers or entire palms on tablet glass while playing.",
    suggestion: "Implement a dedicated multi-touch sanitizer in the input layer during Milestone 1.",
    reasoning: "Eliminates frustrating dropped-drag bugs that cause young players to abandon the app.",
    severity: "Medium"
  }
];


