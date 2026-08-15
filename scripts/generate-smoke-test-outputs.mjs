import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.resolve(rootDir, 'Output Files');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🚀 Running End-to-End Smoke Test & Export Generation for "The Picky Pet"...');
// Raw brainstorm input provided by the creator
const rawBrainstorm = `Project Brainstorm: "The Picky Pet" (Working Title)
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

const projectName = 'The Picky Pet';
const projectType = 'GAME';


const chatHistory = [
  { sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?" },
  { sender: 'user', text: rawBrainstorm },
  { sender: 'ai', text: `That concept is pure gold! "The Picky Pet" has that instant, delightful hook—kids adore squishy, goofy creatures with funny reactions, and disguising learning as feeding a hungry monster is textbook stealth-education.\n\nTo make the monster feel truly alive on that single screen: What kind of personality or visual theme should our squishy monster have? (For example: a gelatinous jelly blob with big goofy eyes, a fuzzy neon alien, or a chubby swamp monster?)` },
  { sender: 'user', text: "Definitely a chubby, jelly blob alien with one giant eye and a huge stretchy mouth. Vibrant neon colors like lime green and electric purple, and cute jiggly sound effects when you touch him." },
  { sender: 'ai', text: `A chubby neon-jelly cyclops with a stretchy mouth is going to look fantastic and give immediate visual charm!\n\nFor the falling objects and gameplay progression: How should the difficulty scale as the toddler keeps playing? Should shapes fall slightly faster, or should the monster start asking for combo foods (like 'Yellow Star' or 'Striped Circle')?` },
  { sender: 'user', text: "Start with just solid colors (Red, Blue, Yellow), then introduce basic shapes (Circle, Square, Triangle), then combine them (Red Circle). Keep the pace relaxed so toddlers never feel stressed, but add a streak counter with confetti for 5 in a row!" },
  { sender: 'ai', text: `I have a clear vision for The Picky Pet now. Are you ready for me to compile this and begin the formal design critique?` },
  { sender: 'user', text: "Yes, let's compile and do the critique!" }
];

const expandedText = `# The Picky Pet - Project Brief

## Executive Summary
"The Picky Pet" is a premium standalone 2D stealth-educational mobile/tablet game targeting toddlers and preschoolers (ages 2–5) on iOS (iPad/iPhone) and Android tablets. The core experience revolves around caring for and feeding a squishy, reactive neon-jelly cyclops monster whose hunger prompts introduce foundational color, shape, and sorting cognitive skills without clinical testing pressure.

## Core Gameplay Mechanics & Loop
1. Single-Screen Arena: A static, high-framerate 2D interactive environment with zero camera movement or complex navigation.
2. Hunger Thought Bubble: The monster's belly rumbles with an animated audio cue, displaying a clear visual target (e.g., "Blue Triangle").
3. Gravity Object Spawner: Colorful physics-enabled geometric snacks drop smoothly from an overhead chute.
4. Touch & Drag Interaction: Toddlers use intuitive single-finger drag physics to feed the target shape into the monster's stretchy mouth.
5. Dynamic Audio-Visual Feedback:
   - Correct Feed: Chomping animation, happy jiggle dance, cheerful audio cue, and progressive confetti streak rewards.
   - Incorrect Feed: Comical spit-out recoil animation with silly burp/honk sound effects that encourage immediate retry without punishment.
6. Progression Ladder:
   - Tier 1: Pure primary colors (Red, Blue, Yellow).
   - Tier 2: Geometric primitives (Circle, Square, Triangle).
   - Tier 3: Compound sorting attributes (e.g., "Green Square", "Striped Circle").

## Technical & Architecture Constraints
- Client-Only Architecture: Zero server infrastructure, zero user accounts, and zero cloud dependencies. Instant cold-start to gameplay.
- COPPA & Privacy Compliant: Zero third-party ad networks, tracking SDKs, or in-app data capture.
- Modular Data-Driven Content: Shape/color attributes are defined via local JSON schemas, facilitating seamless future expansion into numbers, letters, and phonics.`;

const critiqueData = {
  summary: "The Picky Pet features a focused, age-appropriate single-screen loop with clear market potential. However, mobile toddler games face critical technical constraints around multi-touch interference, frame rate stability during physics dropping, audio channel overlap on rapid inputs, and strict Apple Kids Category/COPPA compliance.",
  questions: [
    "How will the engine handle multi-touch rejection when toddlers rest their palm or multiple fingers on the iPad screen while dragging?",
    "What physics simulation approach will ensure predictable shape falling without performance drops or chaotic tumbling on low-end Android devices?",
    "How will the audio system prevent harsh sound clipping or stuttering when incorrect and correct items are fed in rapid succession?",
    "How will asset management be structured to enable instant offline loading while keeping total app package size under 50MB?"
  ]
};

const critiqueAnswers = [
  "Implement a dedicated touch-capture filter that locks drag focus to the first active pointer index and ignores stationary multi-touch/palm contact.",
  "Utilize lightweight 2D rigid-body kinematics with fixed time steps, clamped angular velocities, and simple circle/box colliders for zero physics overhead.",
  "Employ an audio voice manager with sound prioritization, concurrency limits (max 3 concurrent sound FX), and pitch-randomized variations for chewing and burping.",
  "Optimize 2D vector and sprite sheets into compressed texture atlases (ASTC/ETC2) with embedded audio sprites, ensuring instant asset hydration and sub-35MB footprint."
];
const gddContent = [
  {
    title: "1. Executive Summary & Vision",
    content: `### 1.1 Project Identity\n- Title: The Picky Pet\n- Genre: 2D Interactive Educational Casual / Digital Pet\n- Target Audience: Toddlers and Preschoolers (Ages 2–5) & Parents\n- Platforms: iOS (iPadOS/iOS 15+) and Android (API Level 28+)\n- Monetization: Paid Upfront / Apple Arcade style (No Ads, No Microtransactions, 100% Kid Safe)\n\n### 1.2 Core Pillars\n1. Stealth Learning: Cognitive sorting and color/shape recognition masked behind slapstick comedy.\n2. Immediate Tactility: Squishy, spring-physics monster animations with instant audio-visual reactivity.\n3. Frictionless Play: Zero menus, tutorials, or accounts—launch the app and start playing in under two seconds.`
  },
  {
    title: "2. Core Gameplay Mechanics",
    content: `### 2.1 The Hunger Thought Bubble System\nAt the start of each round, the monster rubs its belly as a thought bubble emerges above its head containing the target item rendered with a gentle pulse effect.\n\n### 2.2 Drop Chute & Touch Physics\n- Items spawn from the top chute with randomized horizontal offsets.\n- Toddlers can tap and drag any falling or settled item across the screen.\n- Dragged items follow the finger with spring-smoothing interpolation.\n\n### 2.3 Consumption & Collision Logic\n- Dropping an item onto the monster's mouth bounding box triggers the swallow check.\n- Success Criteria: Item attributes match the current thought bubble target.\n- Reward Sequence: Monster chews with squash-and-stretch deformation, sound FX plays, bubble pops, and next target appears.\n- Failure Sequence: Monster coughs the item back out with a spring velocity bounce and silly sound effect; item returns to play area.`
  },
  {
    title: "3. Progression & Content Staging",
    content: `### 3.1 Level Stages\n- Stage 1 (Pure Colors): Red, Blue, Yellow, Green primary snacks.\n- Stage 2 (Geometric Primitives): Circle, Square, Triangle, Star snacks.\n- Stage 3 (Attribute Combos): Color + Shape combinations (e.g., "Blue Triangle", "Yellow Circle").\n- Stage 4 (Bonus Party): Confetti streak triggers a 10-second celebration where the monster gobbles anything on screen!\n\n### 3.2 Difficulty Calibration\n- Fall velocity starts at a gentle 150 px/sec.\n- No timer, life counter, or fail state—the game provides unconditional positive reinforcement.`
  },
  {
    title: "4. Art, Audio & Visual Direction",
    content: `### 4.1 Visual Aesthetic\n- Character: Chubby, lime-green neon jelly alien with one expressive oversized eye and jiggly purple spots.\n- Color Palette: High-contrast, vibrant pastels with clean outlines accessible to developing toddler vision.\n- UI & Environment: Clean pastel nursery backdrop with soft toy-box aesthetic.\n\n### 4.2 Audio & Sound Design\n- Music: Relaxing, upbeat acoustic ukulele and marimba background loop (60 BPM).\n- Sound Effects: Organic vocal squishes, comical chewing sounds, popping bubbles, and celebratory party horns.`
  },
  {
    title: "5. Technical Requirements & Architecture",
    content: `### 5.1 Technology Stack\n- Engine: Unity 2D / Godot Engine (C# / GDScript)\n- Target Resolution: Adaptive 4:3 to 19.5:9 (Optimized for iPad 10.2\", iPad Mini, and Android Tablets)\n- Framerate Target: Locked 60 FPS on baseline devices (A10 iPad / Snapdragon 660).\n\n### 5.2 Compliance & Safety\n- Full compliance with COPPA and Apple Kids Category guidelines.\n- Zero analytics tracking, zero external network requests, and zero in-app purchases.`
  }
];

const pitchDeckContent = [
  {
    title: "1. The Opportunity: Toddlers Love Slapstick, Parents Love Learning",
    content: "Most toddler educational apps look like dry digital worksheets. The Picky Pet bridges the gap with a high-charm, hilarious digital pet that teaches sorting and logic through slapstick comedy.",
    visualPrompt: "A vibrant concept illustration of a cute chubby lime-green jelly cyclops monster sitting with an open mouth, thought bubble showing a glowing blue triangle, colorful shapes falling around it, warm nursery playroom lighting, high quality 3D render style."
  },
  {
    title: "2. The Gameplay: Tap, Drag, Chomp",
    content: "Zero friction, zero tutorials. Toddlers intuitively drag the matching colored shape into the monster's mouth. Correct answers trigger happy dances; wrong answers produce hilarious burp sounds.",
    visualPrompt: "Close-up action shot of a toddler finger dragging a bright yellow star into the stretchy mouth of a squishy cartoon monster, joyful facial expressions, dynamic particle confetti, soft pastel background."
  },
  {
    title: "3. Built For Peace of Mind: 100% Kid Safe & Offline",
    content: "No accounts, no cloud servers, no ads, no trackers. A premium, parent-trusted experience that launches instantly on any family iPad or Android tablet without internet connection.",
    visualPrompt: "Parent and young child smiling together on a cozy couch playing an iPad showing The Picky Pet, warm ambient family living room setting, modern illustrative style."
  },
  {
    title: "4. Future Expansion: The Modular Learning Franchise",
    content: "The shape-sorting engine is 100% data-driven. Future expansion packs will swap shapes for alphabet phonics, numbers, and vocabulary, creating a scalable educational ecosystem.",
    visualPrompt: "Modular diagram showing The Picky Pet monster surrounded by floating educational modules: Alphabet Letters, Numbers, Fruit Snacks, and Musical Notes, bright clean vector art."
  }
];

