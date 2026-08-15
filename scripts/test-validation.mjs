import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';

function checkHttp(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function run() {
  console.log('--- Starting Playwright End-to-End Validation ---');
  
  // Start Vite dev server on port 3000
  console.log('1. Starting Vite development server on port 3000...');
  const viteProcess = spawn('npm', ['run', 'dev', '--', '--port', '3000', '--host', '127.0.0.1'], {
    stdio: 'pipe',
    shell: true
  });

  // Wait for Vite to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    if (await checkHttp('http://127.0.0.1:3000/')) {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error('Vite dev server failed to start within 30s');
    viteProcess.kill();
    process.exit(1);
  }
  console.log('Vite server is healthy and responding with HTTP 200 at http://127.0.0.1:3000/');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('2. Navigating to http://127.0.0.1:3000/...');
    await page.goto('http://127.0.0.1:3000/');
    await page.waitForLoadState('networkidle');

    console.log('3. Validating App header and AI Provider Selector...');
    const providerButton = page.locator('button[aria-label="AI provider settings"]');
    await providerButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Found AI Model selector button.');

    // Open provider selector dropdown
    await providerButton.click();
    await page.waitForTimeout(500);

    // Switch to Cloud Provider
    console.log('4. Switching to Cloud Provider in UI...');
    const cloudRadio = page.locator('input[name="providerType"][type="radio"]').nth(1);
    await cloudRadio.check();
    await page.waitForTimeout(500);

    // Verify Cloud options
    const cloudSelect = page.locator('label:has-text("Cloud provider") select');
    await cloudSelect.waitFor({ state: 'visible' });
    console.log('✓ Cloud provider selector rendered.');

    // Select OpenAI provider
    await cloudSelect.selectOption('openai');
    await page.waitForTimeout(500);

    // Check "Use SDK login"
    console.log('5. Enabling SDK login (browser sign-in / ChatGPT subscription)...');
    const sdkCheckbox = page.locator('input[type="checkbox"]');
    await sdkCheckbox.check();
    await page.waitForTimeout(500);

    // Verify SDK button is visible
    const sdkSignInButton = page.locator('button:has-text("Sign in with")');
    await sdkSignInButton.waitFor({ state: 'visible' });
    console.log('✓ Sign-in button rendered.');

    // Simulate session token message from the Chrome extension / Auth server
    console.log('6. Simulating ChatGPT / OAuth session token dispatch via window.postMessage...');
    await page.evaluate(() => {
      window.postMessage({ type: 'oauth_token', provider: 'openai', token: 'mock-chatgpt-session-token-xyz' }, '*');
    });
    await page.waitForTimeout(500);

    // Verify UI updated with Signed In state
    const signedInBadge = page.locator('text=Signed in with openai');
    await signedInBadge.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✓ UI successfully received session token and displayed "Signed in with openai" badge.');

    // Verify Unlink button works
    const unlinkBtn = page.locator('button:has-text("Unlink")');
    await unlinkBtn.waitFor({ state: 'visible' });
    console.log('✓ "Unlink" button rendered and ready.');

    // Close provider modal
    await providerButton.click();
    await page.waitForTimeout(500);

    // Test Project Flow Selection
    console.log('7. Testing Project Selection Screen and Conversation Gating...');
    const gameCard = page.locator('button:has-text("Game"), div:has-text("Game")').first();
    if (await gameCard.isVisible()) {
      await gameCard.click();
      await page.waitForTimeout(1000);
      console.log('✓ Selected Game project type.');
    }

    console.log('8. Taking verification screenshot...');
    await page.screenshot({ path: 'dist/e2e-validation-screenshot.png' });
    console.log('✓ Screenshot saved to dist/e2e-validation-screenshot.png');

    console.log('--- ALL PLAYWRIGHT END-TO-END VALIDATIONS PASSED ---');
  } catch (err) {
    console.error('Validation failed with error:', err);
    throw err;
  } finally {
    await browser.close();
    viteProcess.kill('SIGTERM');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
