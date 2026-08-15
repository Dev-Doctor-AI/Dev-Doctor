import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../Output Files');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export const projectName = 'The Picky Pet';
export const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export const rawConversation = [
  { sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?" },
  { sender: 'user', text: "Project Brainstorm: \"The Picky Pet\" (Working Title)\nLiterally just had this thought while getting coffee. Throwing it down before I forget. Needs to be on the Apple store and Android, whatever the kids are using on their parents' iPads these days." },
  { sender: 'ai', text: "I love that name — 'The Picky Pet' is super catchy and instantly evokes a fun, playful personality! A tablet-first experience on iOS and Android is the perfect home for this. Tell me about the core vision: what kind of pet is it, and what will players be doing with it?" },
  { sender: 'user', text: "Okay, so basically, it's an educational game, but we don't tell the kids it's educational. They hate that. We just give them a really funny, squishy little monster pet. We need to make sure the monster is totally custom and researched—not just some generic stock asset shortcut. We want a design that perfectly hits that cute-but-gross vibe that toddlers are obsessed with." },
  { sender: 'ai', text: "That 'cute-but-gross' sweet spot is pure magic with toddlers — think vibrant colors, bouncy squash-and-stretch animations, and delightful silly noises! How does the main gameplay loop work on screen from the moment a child taps to play?" },
  { sender: 'user', text: "The Setup: Just one static screen. No scrolling worlds, no crazy 3D camera angles. Keeps our scope tiny so we can actually finish it.\n\nThe Prompt: The monster's stomach grumbles, and a little thought bubble pops up over its head. Inside the bubble is a specific thing it wants to eat, like a \"Blue Triangle.\"\n\nThe Action: A bunch of random shapes drop from a pipe at the top of the screen. The kid just has to drag with their finger to pull the blue triangle into the monster's mouth.\n\nThe Feedback: If they get it right, the monster chomps it down and does a little happy dance. If they feed it the wrong shape, it spits it out and makes a massive burp or fart noise. Kids think that stuff is hilarious. It's basically a money printer." },
  { sender: 'ai', text: "That single-screen drag-and-feed loop is brilliantly scoped and intuitive for tiny fingers! The instant comedic feedback (burp/spit on wrong shape, happy dance on correct) gives immediate sensory reward without feeling like a test. What are your technical and scope rules for keeping this simple to build and launch?" },
  { sender: 'user', text: "Tech Requirements: No Cloud Stuff. No accounts, no login, no saving to the internet. Just tap the app icon and boom, you are feeding the monster. No servers or databases.\n\nFuture Proof: Start with just colors and shapes. If it goes viral, swap shape pictures for alphabet letters or numbers later." },
  { sender: 'ai', text: "This is fantastic. I have a crystal-clear vision for The Picky Pet now — a frictionless, offline-first 2D sensory sorting game with a hilarious custom monster mascot. Are you ready for me to compile this and begin the formal design critique?" },
  { sender: 'user', text: "Yes! Let's compile and do the critique!" }
];

export const critiqueData = {
  summary: "The Picky Pet establishes a tight, highly achievable 2D educational loop with high toddler engagement potential through physical comedy and tactile drag-and-drop feedback. The technical architecture benefits significantly from an offline-first, local-storage design. Key considerations center on multi-touch edge cases on touchscreens, 2D physics performance during shape spawner bursts, audio latency on low-end Android devices, and store compliance with COPPA/Google Families policies.",
  questions: [
    "How should the drag-and-drop interaction handle accidental multi-touch inputs from toddlers resting their palms or multiple fingers on the iPad glass?",
    "What is the maximum number of simultaneous falling shapes on screen to prevent physics bottlenecking on low-end Android tablets?",
    "Since this targets toddlers (ages 2–5), what specific COPPA and Google Play Families self-certification requirements must be met regarding data privacy and zero third-party SDK tracking?",
    "How will audio playback be buffered so comedic SFX (burps, chomps) trigger instantaneously without latency on mobile web/hybrid wrappers?"
  ]
};

export const critiqueAnswers = [
  "Single-Touch Pointer Lock: The game will enforce a single active pointer lock, ignoring secondary touch points and palm contacts outside the currently dragged shape.",
  "Deterministic Spawner Cap: Limit simultaneous falling shapes to a maximum of 5 on screen at once with linear kinematic falling physics and automatic despawning off the bottom edge.",
  "Strict COPPA/Families Compliance: Zero analytics SDKs, zero ads, zero external telemetry, zero internet permission requirements declared in manifest.",
  "Pre-Decoded Audio Buffers: All sound effects (chomps, burps, happy dances, grumbles) will be pre-decoded into memory on boot using WebAudio / native sound engine pools."
];

export const expandedText = `# The Picky Pet — Unified Project Brief

## High Concept
The Picky Pet is a frictionless, offline-first 2D toddler educational game designed for iOS and Android tablets. Disguised as a hilarious, tactile virtual pet toy, it teaches early shape, color, and sorting logic through physical comedy and instant sensory rewards without classrooms or grading.

## Target Audience & Platform
- **Primary Audience:** Toddlers & Preschoolers (Ages 2–5) and parents seeking safe, ad-free educational entertainment.
- **Target Platforms:** Apple iPadOS / iOS (App Store) & Android Tablets / Phones (Google Play Families).
- **Architecture:** 100% Offline-First, single-screen 2D viewport, zero account creation, zero cloud dependencies.

## Core Gameplay Loop
1. **The Hunger Prompt:** The squishy monster pet grumbles and displays a thought bubble containing a desired item (e.g., "Blue Triangle" or "Red Circle").
2. **Falling Shapes:** A top-mounted pipe spawns 3–5 randomized colored shapes descending via gentle gravity.
3. **Tactile Drag-and-Drop:** The toddler drags the target shape directly into the monster's mouth.
4. **Instant Comedic Feedback:**
   - *Correct Match:* Monster chomps vigorously, emits cheerful chewing sounds, performs a happy jiggle dance, and score/streak advances.
   - *Incorrect Match:* Monster spits out the shape with a comical cartoon burp or fart SFX, accompanied by silly eye-roll animations.
5. **Session Progression:** Progressive difficulty subtly introduces new color/shape combinations, with modular architecture ready for Letter/Number pack expansions.`;

export const gddContent = [
  {
    title: "Executive Summary & Vision",
    content: "### Project Name: The Picky Pet\n\n**The Picky Pet** is a whimsical, single-screen 2D sorting game created specifically for toddlers (ages 2–5). By combining the humor of a ravenous, squishy custom monster with tactile drag-and-drop mechanics, the game teaches fundamental shape and color recognition without feeling like an educational drill. The game requires zero setup, no user accounts, and no internet connection—allowing toddlers to open the app and instantly start playing on iPad and Android tablets."
  },
  {
    title: "Core Mechanics & User Experience",
    content: "### 1. Viewport & Setup\n- Fixed 16:9 landscape aspect ratio with safe-area padding for iPad and Android cutouts.\n- Static stage featuring the animated monster pet anchored at the bottom-center and a whimsical shape pipe at the top.\n\n### 2. The Thought Bubble Mechanic\n- Monster displays an animated grumble thought bubble indicating its hunger craving (Color + Geometric Primitive, e.g., 'Yellow Star').\n\n### 3. Kinematic Shape Spawner\n- Shapes (Circles, Triangles, Squares, Stars) drop at gentle velocities.\n- Toddlers can tap and drag any falling shape across the screen.\n- Single-pointer touch capture prevents accidental multi-touch cancellation.\n\n### 4. Interactive Feedback & Comedy\n- **Chomp Zone:** Bounding box around monster mouth with 25% forgiving touch radius.\n- **Success State:** Monster snaps jaws closed, plays crunchy eating SFX, squashes and stretches into a joyful dance, and awards colorful confetti particles.\n- **Mismatch State:** Monster makes a gagging expression, spits the item toward the screen edge with a cartoon burp/fart sound, prompting the child to try again."
  },
  {
    title: "Art, Animation & Audio Direction",
    content: "### Visual Style\n- Hand-crafted 2D vector art with bold outlines, vibrant pastel palettes, and expressive squash-and-stretch 2D skeletal rigs.\n- Custom monster mascot designed specifically to balance 'cute' and 'gross'—big expressive eyes, bouncy jelly physique, and silly facial reactions.\n\n### Audio Landscape\n- Cheerful, gentle ukulele background loop with adjustable volume.\n- Comedic, high-fidelity foley sound effects: squishy drag sounds, jaw snaps, cartoon burps, giggles, and celebration chimes.\n- Pre-decoded audio pool ensuring zero-latency touch response."
  },
  {
    title: "Technical Architecture & Offline Engine",
    content: "### Technical Pillars\n- **Engine:** Lightweight 2D engine (Unity 2D / Godot / React Native Skia / PixiJS) exporting native mobile binaries.\n- **Data Storage:** 100% local persistence using device key-value storage for high scores, unlocked monster skins, and audio preferences.\n- **Zero Network Footprint:** No backend servers, no analytics beacons, zero network permissions declared.\n- **Target Performance:** Solid 60 FPS on baseline iPad 9th Gen and low-tier Android tablets (e.g. Amazon Fire HD 8 / Samsung Tab A)."
  },
  {
    title: "Minimum Viable Product (MVP) Scope",
    content: "### MVP In-Scope\n- 1 Custom Monster Mascot with 5 core animation states (Idle, Grumble, Chewing, Happy Dance, Spit-Out Burp).\n- 4 Basic Shapes: Circle, Square, Triangle, Star.\n- 4 Primary Colors: Red, Blue, Yellow, Green.\n- Single-screen infinite loop with progressive shape spawn intervals.\n- Local high score and sound mute toggle.\n\n### Out of Scope for MVP\n- Alphabet and Number packs (Phase 2 expansion).\n- Monster skin customization shop.\n- Parent analytics dashboard."
  },
  {
    title: "COPPA & Privacy Compliance",
    content: "### Kid-Safe Certification\n- Meets all criteria for Apple Kids Category (Ages 5 and Under) and Google Play Designed for Families program.\n- Zero personally identifiable information (PII) collected.\n- No third-party ad networks or programmatic monetization SDKs.\n- Simple one-time upfront purchase or free base version with gated parental consent for any future expansion packs."
  },
  {
    title: "Production Roadmap & Milestone Schedule",
    content: "### Milestone Timeline (8-Week Fast Track)\n- **Weeks 1–2 (Prototype):** Basic 2D kinematic spawner, touch drag interaction, and Chomp collision detection.\n- **Weeks 3–4 (Art & Rigging):** Final 2D monster character design, Spine/Spriter animation integration, and sound design.\n- **Weeks 5–6 (Audio & Polish):** WebAudio/Native audio latency tuning, confetti particles, and multi-touch palm rejection testing.\n- **Weeks 7–8 (Certification & Launch):** Apple App Store Kids Category review, Google Play Families submission, and release."
  }
];

export const mvpDefinition = {
  summary: "The Picky Pet MVP is a standalone, kid-safe 2D drag-and-drop educational sorting game for iOS and Android tablets. It delivers an instant, offline play experience where toddlers feed a squishy, animated monster based on shape and color prompts.",
  inScope: [
    "1 Custom Monster Mascot with 5 expressive animation states (Idle, Grumble, Chewing, Happy Dance, Spit-Out Burp)",
    "4 Basic Shapes: Circle, Square, Triangle, Star",
    "4 Primary Colors: Red, Blue, Yellow, Green",
    "Single-screen 2D viewport with gravity-based shape spawner",
    "Tactile single-touch drag-and-drop mechanics with forgiving 25% collision radius",
    "Chomp, burp, and cheerful celebration audio feedback with local volume toggle",
    "Zero account creation, zero cloud services, zero data collection (100% COPPA compliant)"
  ],
  outOfScope: [
    "Alphabet and Number packs (Reserved for Phase 2 DLC expansion)",
    "Monster cosmetic skin customization shop",
    "Cloud syncing and cross-device account profiles",
    "Parent analytics reporting portal",
    "Third-party advertising SDKs"
  ]
};

export const tddContent = [
  {
    feature: "2D Kinematic Shape Spawner",
    userStories: "As a toddler, I want colorful shapes to gently float down from the top pipe so that I have items to feed the monster.",
    technicalSpecs: "Interval timer spawns random shape entity every 2 seconds. Kinematic 2D body with vertical velocity 120 px/sec and gentle sine wobble. Off-screen shape cleanup when y > screenHeight."
  },
  {
    feature: "Single-Touch Drag & Chomp Collision Detector",
    userStories: "As a toddler, I want to drag the target shape into the monster's mouth with my finger and see an instant reaction.",
    technicalSpecs: "Pointer capture updates coordinates. Monster mouth trigger zone (120x80 px) with 25% tolerance. Triggers chew dance on match and spit-out burp on mismatch."
  },
  {
    feature: "Zero-Latency Audio Sound Pool",
    userStories: "As a player, I want hilarious sounds to play immediately when the monster eats or burps.",
    technicalSpecs: "WebAudio API buffer pool preloaded on boot: crunchy eating SFX, comedic burp/fart SFX, celebration chimes, and ukulele loop."
  }
];



export const assetList = {
  "2D Art & Character Rigs": [
    "Custom Monster Mascot 2D Skeletal Mesh (Spine/Lottie) with 5 core animation states",
    "Grumble Thought Bubble UI Sprite with pulsating dynamic icon container",
    "4 Shape Vector Sprites (Circle, Triangle, Square, Star) across 4 color palettes",
    "Top-mounted mechanical pipe / delivery chute asset",
    "Vibrant 2D nursery playroom background illustration (16:9 4K optimized)"
  ],
  "Audio & Foley FX": [
    "Crunchy cartoon eating & chewing SFX (3 variations)",
    "Comedic cartoon burp and fart sound effects (4 variations)",
    "Toddler celebration fanfare and confetti chime FX",
    "Gentle acoustic ukulele background music track (seamless 60s loop)"
  ],
  "VFX & Particles": [
    "Confetti burst particle emitter (multi-colored, 40 particles/burst)",
    "Food crumbs & spark particle puff on mouth contact"
  ]
};

export const pitchDeckContent = [
  {
    title: "1. The Big Idea: The Picky Pet",
    content: "### Learning Disguised as Pure Comedy\n**The Picky Pet** turns foundational shape and color learning for toddlers (ages 2–5) into an interactive cartoon sitcom.\n- **The Premise:** A squishy, ravenous monster who craves specific shapes and reacts with hilarious physical comedy.\n- **Zero-Friction:** Tap the icon and immediately start playing. No signups, no ads, no internet required.",
    visualPrompt: "Vibrant cartoon slide showing an adorable squishy green monster pet receiving a glowing blue triangle, surrounded by colorful confetti."
  },
  {
    title: "2. The Problem & Solution",
    content: "### Tactile, Comedic Sensory Learning\n1. **Visual Demand:** Monster's thought bubble displays craving (e.g., 'Yellow Star').\n2. **Gentle Action:** Shapes fall gently; toddler drags target shape to monster.\n3. **Sensory Reward:** Comedic burps on error (encourages retry without shame); happy dance celebrations on match.",
    visualPrompt: "Step-by-step gameplay infographic showing Thought Bubble, Drag-and-drop finger trail, and hilarious monster eating reaction."
  },
  {
    title: "3. Market Opportunity & Compliance",
    content: "### 100% Kid-Safe Certification\n- Fully compliant with COPPA and Apple Kids Category guidelines.\n- Safe Monetization: High-converting $2.99 upfront premium purchase or free base tier with parent-gated expansion packs.",
    visualPrompt: "Clean market opportunity chart displaying growth in parent-approved premium educational apps and trusted safety badge certifications."
  }
];

export const modularBreakdown = [
  {
    title: "Freelance Brief: 2D Gameplay Developer",
    content: "Implement the single-screen 2D gameplay loop: Kinematic shape spawner, touch drag controller, mouth collision hitbox, animation triggers, and offline storage."
  },
  {
    title: "Freelance Brief: 2D Animator & Character Artist",
    content: "Design and rig the custom monster mascot with 5 animations (Idle, Grumble, Chew, Happy Dance, Spit-Out Burp) and create vector shapes in 4 primary colors."
  }
];

export const scopeReviews = [
  {
    feature: "Single-Screen Scope Constraint",
    critique: "A single static screen minimizes camera and physics overhead, guaranteeing an 8-week delivery.",
    suggestion: "Maintain zero world-scrolling in the MVP build.",
    reasoning: "Eliminating camera management reduces rendering bugs and speeds up release.",
    severity: "Low"
  },
  {
    feature: "Zero Cloud Architecture",
    critique: "Bypassing servers eliminates backend maintenance costs and satisfies strict COPPA guidelines.",
    suggestion: "Store high score and audio preferences strictly in local platform storage.",
    reasoning: "Parent trust is maximized when apps require no permissions or network access.",
    severity: "Low"
  }
];


async function runExports() {
  const outputDir = path.resolve("Output Files");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const projectName = "The Picky Pet";
  const slug = "The_Picky_Pet";
  const discoveryChatLog = rawConversation;

  console.log(`[Smoke Test] Generating complete export package for "${projectName}"...`);

  // 1. JSON Export
  const jsonExport = {
    projectName,
    generatedAt: new Date().toISOString(),
    projectType: "GAME",
    chatHistory: discoveryChatLog,
    expandedText,
    critiqueData,
    critiqueAnswers,
    gddContent,
    mvpDefinition,
    tddContent,
    assetList,
    pitchDeckContent,
    modularBreakdown,
    scopeReviews
  };
  fs.writeFileSync(path.join(outputDir, `${slug}_Package.json`), JSON.stringify(jsonExport, null, 2), 'utf-8');
  console.log(`✓ Generated: ${slug}_Package.json`);

  // 2. Markdown Export
  let mdPackage = `# ${projectName} — Complete Project Package\n\n`;
  mdPackage += `*Generated by Dev Doctor AI • ${new Date().toLocaleDateString()}*\n\n---\n\n`;
  mdPackage += `## Discovery Chat Log\n\n`;
  discoveryChatLog.forEach(turn => {
    mdPackage += `**${turn.sender === 'user' ? 'Founder' : 'Dev Doctor Concierge'}:** ${turn.text}\n\n`;
  });
  mdPackage += `---\n\n## Project Brief\n\n${expandedText}\n\n---\n\n`;
  mdPackage += `## Senior Technical Analyst Critique\n\n### Summary\n${critiqueData.summary}\n\n### Technical Q&A\n\n`;
  critiqueData.questions.forEach((q, i) => {
    mdPackage += `**Q${i+1}: ${q}**\n\n*Resolution:* ${critiqueAnswers[i] || 'Addressed in design specs.'}\n\n`;
  });
  mdPackage += `---\n\n## Game Design Document (GDD)\n\n`;
  gddContent.forEach(sec => {
    mdPackage += `### ${sec.title}\n\n${sec.content}\n\n`;
  });
  mdPackage += `---\n\n## Minimum Viable Product (MVP)\n\n**Summary:** ${mvpDefinition.summary}\n\n### In Scope\n`;
  mvpDefinition.inScope.forEach(item => { mdPackage += `- ${item}\n`; });
  mdPackage += `\n### Out of Scope\n`;
  mvpDefinition.outOfScope.forEach(item => { mdPackage += `- ${item}\n`; });
  mdPackage += `\n---\n\n## Production Asset List\n\n`;
  Object.entries(assetList).forEach(([cat, items]) => {
    mdPackage += `### ${cat}\n`;
    items.forEach(item => { mdPackage += `- ${item}\n`; });
    mdPackage += `\n`;
  });

  fs.writeFileSync(path.join(outputDir, `${slug}_Package.md`), mdPackage, 'utf-8');
  console.log(`✓ Generated: ${slug}_Package.md`);

  // 3. Plain Text Export
  let txtPackage = `================================================================================\n`;
  txtPackage += `${projectName.toUpperCase()} — COMPLETE 8-TOOL PROJECT PACKAGE\n`;
  txtPackage += `Generated by Dev Doctor AI • ${new Date().toLocaleDateString()}\n`;
  txtPackage += `================================================================================\n\n`;
  txtPackage += `--- DISCOVERY CHAT LOG ---\n\n`;
  discoveryChatLog.forEach(turn => {
    txtPackage += `[${turn.sender === 'user' ? 'FOUNDER' : 'DEV DOCTOR CONCIERGE'}]:\n${turn.text}\n\n`;
  });
  txtPackage += `--- 1. PROJECT BRIEF ---\n\n${expandedText.replace(/[#*`]/g, '')}\n\n`;
  txtPackage += `--- 2. SENIOR TECHNICAL CRITIQUE ---\n\nSummary:\n${critiqueData.summary}\n\n`;
  critiqueData.questions.forEach((q, i) => {
    txtPackage += `Q${i+1}: ${q}\nResolution: ${critiqueAnswers[i] || 'Addressed in design specs.'}\n\n`;
  });
  txtPackage += `--- 3. GAME DESIGN DOCUMENT (GDD) ---\n\n`;
  gddContent.forEach(sec => {
    txtPackage += `>> ${sec.title.toUpperCase()}\n${sec.content.replace(/[#*`]/g, '')}\n\n`;
  });
  txtPackage += `--- 4. PITCH DECK SLIDES ---\n\n`;
  pitchDeckContent.forEach((slide, i) => {
    txtPackage += `SLIDE ${i+1}: ${slide.title}\n${slide.content}\nVisual Prompt: ${slide.visualPrompt}\n\n`;
  });
  txtPackage += `--- 5. MINIMUM VIABLE PRODUCT (MVP) ---\n\nSummary: ${mvpDefinition.summary}\n\nIN SCOPE:\n`;
  mvpDefinition.inScope.forEach(item => { txtPackage += `• ${item}\n`; });
  txtPackage += `\nOUT OF SCOPE:\n`;
  mvpDefinition.outOfScope.forEach(item => { txtPackage += `• ${item}\n`; });
  txtPackage += `\n--- 6. TEST-DRIVEN DESIGN (TDD) ---\n\n`;
  tddContent.forEach(spec => {
    txtPackage += `FEATURE: ${spec.feature}\nUser Story: ${spec.userStories}\nTechnical Specs:\n${spec.technicalSpecs}\n\n`;
  });
  txtPackage += `--- 7. MODULAR FREELANCE BRIEFS ---\n\n`;
  modularBreakdown.forEach(brief => {
    txtPackage += `ROLE: ${brief.title}\n${brief.content}\n\n`;
  });
  txtPackage += `--- 8. PRODUCTION ASSET MANIFEST ---\n\n`;
  Object.entries(assetList).forEach(([cat, assets]) => {
    txtPackage += `[${cat}]\n${assets.map(a => `• ${a}`).join('\n')}\n\n`;
  });
  txtPackage += `--- 9. CRITICAL SCOPE REVIEWS ---\n\n`;
  scopeReviews.forEach(rev => {
    txtPackage += `FEATURE: ${rev.feature} (${rev.severity} Priority)\nCritique: ${rev.critique}\nSuggestion: ${rev.suggestion}\nReasoning: ${rev.reasoning}\n\n`;
  });

  fs.writeFileSync(path.join(outputDir, `${slug}_Package.txt`), txtPackage, 'utf-8');

  // 4. HTML Standalone Document
  const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectName)} — Project Package</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 p-8 max-w-5xl mx-auto font-sans leading-relaxed">
  <header class="mb-10 text-center border-b border-slate-700 pb-8">
    <span class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">Dev Doctor AI</span>
    <h1 class="text-4xl font-extrabold text-white mt-3">${escapeHtml(projectName)}</h1>
    <p class="text-slate-400 mt-1">Generated on ${new Date().toLocaleDateString()} • Full Blueprint Package</p>
  </header>

  <section class="mb-10 bg-slate-800 p-6 rounded-xl border border-slate-700">
    <h2 class="text-2xl font-bold text-blue-400 mb-4">💬 Discovery Chat Log</h2>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${discoveryChatLog.map(t => `<div class="p-3 rounded-lg ${t.sender === 'user' ? 'bg-blue-900/40 ml-6' : 'bg-slate-900 mr-6'}"><div class="text-xs font-bold uppercase ${t.sender === 'user' ? 'text-blue-400' : 'text-emerald-400'}">${t.sender === 'user' ? 'Founder' : 'Concierge'}</div><div class="text-sm mt-1">${escapeHtml(t.text)}</div></div>`).join('')}
    </div>
  </section>

  <section class="mb-10 bg-slate-800 p-6 rounded-xl border border-slate-700">
    <h2 class="text-2xl font-bold text-purple-400 mb-4">📋 Project Brief</h2>
    <div class="text-sm whitespace-pre-wrap">${escapeHtml(expandedText)}</div>
  </section>

  <section class="mb-10 bg-slate-800 p-6 rounded-xl border border-slate-700">
    <h2 class="text-2xl font-bold text-amber-400 mb-4">🔍 Senior Technical Critique</h2>
    <p class="text-sm mb-4">${escapeHtml(critiqueData.summary)}</p>
    <div class="space-y-3">
      ${critiqueData.questions.map((q, i) => `<div class="p-3 bg-slate-900 rounded-lg"><div class="font-bold text-sm text-blue-300">Q${i+1}: ${escapeHtml(q)}</div><div class="text-xs text-slate-400 mt-1">Resolution: ${escapeHtml(critiqueAnswers[i])}</div></div>`).join('')}
    </div>
  </section>

  <section class="mb-10 bg-slate-800 p-6 rounded-xl border border-slate-700">
    <h2 class="text-2xl font-bold text-emerald-400 mb-4">🎮 Game Design Document</h2>
    <div class="space-y-4">
      ${gddContent.map(s => `<div class="p-4 bg-slate-900 rounded-lg"><h3 class="font-bold text-lg text-white mb-2">${escapeHtml(s.title)}</h3><div class="text-sm whitespace-pre-wrap text-slate-300">${escapeHtml(s.content)}</div></div>`).join('')}
    </div>
  </section>

  <section class="mb-10 bg-slate-800 p-6 rounded-xl border border-slate-700">
    <h2 class="text-2xl font-bold text-indigo-400 mb-4">🎯 MVP Scope</h2>
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div class="p-4 bg-emerald-950/40 rounded-lg border border-emerald-800/40"><h3 class="font-bold text-emerald-400 mb-2">In Scope</h3><ul>${mvpDefinition.inScope.map(item => `<li>• ${escapeHtml(item)}</li>`).join('')}</ul></div>
      <div class="p-4 bg-red-950/40 rounded-lg border border-red-800/40"><h3 class="font-bold text-red-400 mb-2">Out of Scope</h3><ul>${mvpDefinition.outOfScope.map(item => `<li>• ${escapeHtml(item)}</li>`).join('')}</ul></div>
    </div>
  </section>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, `${slug}_Package.html`), htmlContent, 'utf-8');
  console.log(`✓ Generated: ${slug}_Package.html`);
  // Generate Individual HTML Files for all 8 Toolkit items + Chat Log
  const individualExports = [
    { name: '1_Design_Document', title: 'Game Design Document', html: gddHtml },
    { name: '2_Pitch_Deck', title: 'Pitch Deck', html: pitchHtml },
    { name: '3_MVP_Definition', title: 'MVP Definition', html: mvpHtml },
    { name: '4_TDD_Feature_Specs', title: 'MVP Feature Specifications', html: tddHtml },
    { name: '5_Technical_Design_Document', title: 'Technical Design Document (TDD)', html: tddDocHtml },
    { name: '6_Asset_Manifest', title: 'Production Asset Manifest', html: assetHtml },
    { name: '7_Freelance_Briefs', title: 'Modular Freelance Briefs', html: briefHtml },
    { name: '8_Scope_Review', title: 'Scope Critical Review', html: scopeHtml },
    { name: 'Discovery_Chat_Log', title: 'Discovery Chat Log', html: chatHtml },
  ];

  for (const item of individualExports) {
    const itemFullHtml = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - ${item.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              brand: {
                bg: '#121316',
                surface: '#1A1B1E',
                border: '#2C2E33',
                primary: '#4E95FF',
                secondary: '#A78BFA',
                text: '#E1E7EC',
                'text-muted': '#9CA3AF'
              }
            }
          }
        }
      }
    </script>
</head>
<body class="bg-brand-bg text-brand-text font-sans p-4 md:p-8 min-h-screen">
    <div class="max-w-5xl mx-auto space-y-6">
        <header class="mb-8 p-6 bg-brand-surface rounded-xl border border-brand-border shadow-lg">
            <h1 class="text-3xl font-extrabold text-brand-primary mb-2">${projectName}</h1>
            <h2 class="text-xl font-bold text-brand-secondary">${item.title}</h2>
            <p class="text-xs text-brand-text-muted mt-2">Generated by Dev Doctor AI • ${new Date().toLocaleDateString()}</p>
        </header>
        ${item.html}
    </div>
</body>
</html>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, `${projectName.replace(/\s+/g, '_')}_${item.name}.html`), itemFullHtml, 'utf8');
  }


  // Individual exports
  fs.writeFileSync(path.join(outputDir, `${slug}_GDD.md`), `# ${projectName} — Game Design Document\n\n` + gddContent.map(s => `## ${s.title}\n\n${s.content}\n\n`).join(''), 'utf-8');
  fs.writeFileSync(path.join(outputDir, `${slug}_PitchDeck.md`), `# ${projectName} — Pitch Deck\n\n` + pitchDeckContent.map((s, i) => `## Slide ${i+1}: ${s.title}\n\n${s.content}\n\n*Visual Prompt:* \`${s.visualPrompt}\`\n\n`).join(''), 'utf-8');
  fs.writeFileSync(path.join(outputDir, `${slug}_TDD.md`), `# ${projectName} — Test-Driven Design Specs\n\n` + tddContent.map(s => `## ${s.feature}\n\n**User Story:** ${s.userStories}\n\n${s.technicalSpecs}\n\n`).join(''), 'utf-8');
  fs.writeFileSync(path.join(outputDir, `${slug}_ChatLog.txt`), `Discovery Chat Log for ${projectName}\n\n` + discoveryChatLog.map(t => `[${t.sender.toUpperCase()}]:\n${t.text}\n\n`).join(''), 'utf-8');

  console.log(`\n🎉 All export packages and individual files successfully generated in "${outputDir}"!`);
}

runExports().catch(console.error);
