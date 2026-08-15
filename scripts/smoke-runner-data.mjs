import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const outputDir = path.resolve(__dirname, '../Output Files');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

export const projectName = 'The Picky Pet';
export const rawBrainstorm = `Project Brainstorm: "The Picky Pet" (Working Title)
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

export const chatHistory = [
  { sender: 'ai', text: "Hello! I'm the Concierge for Dev Doctor AI. To get started, what is the official name for this project?" },
  { sender: 'user', text: rawBrainstorm },
  { sender: 'ai', text: "I love this concept! 'The Picky Pet' has that instant, tactile charm toddlers adore—feeding a squishy, grumpy monster without feeling like a boring math lesson. To nail that cute-but-gross aesthetic, what specific monster animations and sound effects will make the feeding reactions unforgettable?" },
  { sender: 'user', text: "When fed right, it does a goofy wiggle dance and squeals happily with sparkling eyes. When fed wrong, its cheeks puff up green, it violently spits the shape at the camera, and lets out a massive comedic burp." },
  { sender: 'ai', text: "That comedic slapstick reward loop is pure toddler gold! I believe I have a clear vision for The Picky Pet now. Are you ready for me to compile this and begin the formal design critique?" }
];
