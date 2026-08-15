import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../Output Files');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const projectName = "The Picky Pet";
const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const chatHistory = [
  { sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?" },
  { sender: 'user', text: "The Picky Pet" },
  { sender: 'ai', text: "I love the name \"The Picky Pet\"! It instantly paints a playful, curious picture. Tell me, who are we making this wonderful experience for, and what makes your little creature so unique?" },
  { sender: 'user', text: "Project Brainstorm: \"The Picky Pet\" (Working Title)\nLiterally just had this thought while getting coffee. Throwing it down before I forget. Needs to be on the Apple store and Android, whatever the kids are using on their parents' iPads these days.\n\nThe Vision\nOkay, so basically, it's an educational game, but we don't tell the kids it's educational. They hate that. We just give them a really funny, squishy little monster pet. We need to make sure the monster is totally custom and researched—not just some generic stock asset shortcut. We want a design that perfectly hits that cute-but-gross vibe that toddlers are obsessed with.\n\nThe Gameplay Loop\nI don't really know how the coding engines work—like Unity or Java or whatever you guys type in—but the logic should be super basic to build.\n\nThe Setup: Just one static screen. No scrolling worlds, no crazy 3D camera angles. Keeps our scope tiny so we can actually finish it.\n\nThe Prompt: The monster's stomach grumbles, and a little thought bubble pops up over its head. Inside the bubble is a specific thing it wants to eat, like a \"Blue Triangle.\"\n\nThe Action: A bunch of random shapes drop from a pipe at the top of the screen. The kid just has to drag with their finger to pull the blue triangle into the monster's mouth.\n\nThe Feedback: If they get it right, the monster chomps it down and does a little happy dance. If they feed it the wrong shape, it spits it out and makes a massive burp or fart noise. Kids think that stuff is hilarious. It's basically a money printer.\n\nThe Educational Angle\nIt teaches basic shape, color, and sorting logic without feeling like a classroom test. I figure making the shapes fall down from the ceiling is just a gravity toggle switch you turn on in the software, right? Should be pretty quick to whip up.\n\nTech \"Requirements\" (Keep it simple)\nNo Cloud Stuff: No making accounts, no logging in, no saving to the internet. You just tap the app icon and boom, you are feeding the monster. I don't want to deal with servers or databases because I hear that gets messy and expensive.\n\nFuture Proof: We start with just colors and shapes to keep the launch small. If it goes viral, we just swap the shape pictures out for alphabet letters or numbers later. Boom. Educational franchise." },
  { sender: 'ai', text: "This is pure gold! A squishy, cute-but-gross toddler monster feeding game with zero cloud friction, instant drag-and-drop tactile delight, and comedic burp/fart feedback is an absolute winner for toddlers on iPads and phones.\n\nI believe I have a clear vision for The Picky Pet now. Are you ready for me to compile this and begin the formal design critique?" },
  { sender: 'user', text: "Yes, let's compile and generate the complete design package!" }
];

export { outputDir, projectName, dateStr, chatHistory };
