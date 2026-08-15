import { chromium } from 'playwright';
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

async function runSmokeTest() {
  console.log('=== STARTING END-TO-END SMOKE TEST ===');
  console.log(`Output folder: ${outputDir}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });

  const page = await context.newPage();

  try {
    console.log('1. Navigating to http://127.0.0.1:3000...');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle', timeout: 30000 });

    const rawData = `Project Brainstorm: "The Picky Pet" (Working Title)
Literally just had this thought while getting coffee. Throwing it down before I forget. Needs to be on the Apple store and Android.
The Vision: It's an educational game with a funny, squishy little monster pet with cute-but-gross vibe toddlers love.
Gameplay: One static screen. Monster stomach grumbles with a thought bubble (e.g. "Blue Triangle"). Shapes drop from pipe. Kid drags finger to feed monster.
Feedback: Happy dance on right shape, spits out with massive burp/fart on wrong shape.
No cloud accounts, start with colors & shapes.`;

    console.log('2. Submitting raw project brainstorm...');
    const textarea = page.locator('textarea').first();
    await textarea.fill(rawData);
    await textarea.press('Enter');
    await page.waitForTimeout(4000);

    const turn2 = `Yes! 2D colorful cartoon style, funny sound effects, 10 shapes and 6 colors on iOS and Android. Let's compile and start critique!`;
    await textarea.fill(turn2);
    await textarea.press('Enter');
    await page.waitForTimeout(4000);

    const headerTitle = await page.locator('header h1').first().textContent();
    console.log(`Detected Project Title: "${headerTitle}"`);

    console.log('3. Advancing to Critique Step...');
    const critiqueBtn = page.locator('button:has-text("Proceed to Critique"), button:has-text("Generate GDD")').first();
    if (await critiqueBtn.isVisible()) {
      await critiqueBtn.click();
      await page.waitForTimeout(4000);
    }

    console.log('4. Compiling GDD and Package Documents...');
    const compileBtn = page.locator('button:has-text("Compile Full Game Design Document"), button:has-text("Generate Design Document")').first();
    if (await compileBtn.isVisible()) {
      await compileBtn.click();
      await page.waitForTimeout(8000);
    }

    console.log('5. Triggering Package & Format Exports...');
    const downloadDropdownBtn = page.locator('button:has-text("Download Full Project")');
    if (await downloadDropdownBtn.isVisible()) {
      const exportFormat = async (label, ext) => {
        if (!(await page.locator(`button:has-text("${label}")`).isVisible())) {
          await downloadDropdownBtn.click();
          await page.waitForTimeout(400);
        }
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }),
          page.locator(`button:has-text("${label}")`).click(),
        ]);
        const filename = await download.suggestedFilename();
        const targetPath = path.join(outputDir, filename);
        await download.saveAs(targetPath);
        console.log(`  ✓ Saved ${ext.toUpperCase()}: ${filename} (${fs.statSync(targetPath).size} bytes)`);
      };

      await exportFormat('HTML Format', 'html');
      await exportFormat('Markdown Format', 'md');
      await exportFormat('Plain Text Format', 'txt');
      await exportFormat('JSON Package', 'json');
    }

    const screenshotPath = path.join(outputDir, 'smoke_test_view.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✓ Screenshot saved: ${screenshotPath}`);
    console.log('=== SMOKE TEST COMPLETE ===');
  } catch (err) {
    console.error('Smoke test error:', err);
  } finally {
    await browser.close();
  }
}

runSmokeTest();
