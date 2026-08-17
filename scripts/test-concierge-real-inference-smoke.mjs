import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function availablePort(preferred) {
  for (let port = preferred; port < preferred + 20; port += 1) {
    const available = await new Promise(resolve => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error(`No available port found from ${preferred}.`);
}

async function waitForUrl(url, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`${label} was not available at ${url}.`);
}

const modelsUrl = 'http://127.0.0.1:1234/v1/models';
const modelsResponse = await fetch(modelsUrl).catch(() => null);
if (!modelsResponse?.ok) throw new Error(`LM Studio is unavailable at ${modelsUrl}. Start its local server first.`);
const models = (await modelsResponse.json()).data?.map(model => model.id).filter(Boolean) || [];
if (!models.length) throw new Error('LM Studio has no loaded models.');

const proxy = spawn('npm', ['run', 'start-proxy'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await availablePort(3010);
const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;

try {
  await Promise.all([
    waitForUrl('http://127.0.0.1:1235/v1/models', 'LM Studio proxy'),
    waitForUrl(`http://127.0.0.1:${port}/`, 'Vite'),
  ]);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const browserErrors = [];
  const requestFailures = [];
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('requestfailed', request => requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'unknown failure'}`));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const input = page.locator('input, textarea').last();
  await input.fill('The project is Garden Quest, a cozy tablet game where families plant magical seeds, grow gardens, and harvest them together offline.');
  await input.press('Enter');

  const userMessage = 'The project is Garden Quest, a cozy tablet game where families plant magical seeds, grow gardens, and harvest them together offline.';
  const messageSelector = 'main [class*="whitespace-pre-wrap"]';
  let aiResponse = '';
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const messages = await page.locator(messageSelector).allTextContents();
    const assistantMessages = messages.filter(message => message !== userMessage && !message.includes('Hello! I\'m the Concierge'));
    if (assistantMessages.length) {
      aiResponse = assistantMessages.at(-1).trim();
      break;
    }
    await sleep(500);
  }

  assert(aiResponse, 'The live Concierge produced no rendered assistant response.');
  assert.match(aiResponse, /garden|quest|tablet|family|seed|offline/i, 'The response did not preserve the supplied project context.');
  assert.equal((aiResponse.match(/\?/g) || []).length, 1, 'The information-gatherer response did not ask exactly one follow-up question.');
  assert.doesNotMatch(aiResponse, /ready to (?:compile|begin|start)|formal design critique/i, 'The response advanced to the completion gate before the workflow selected it.');
  assert.equal(requestFailures.length, 0, `Browser request failures occurred: ${requestFailures.join(' | ')}`);
  assert.equal(browserErrors.length, 0, `Browser errors occurred: ${browserErrors.join(' | ')}`);

  const mode = await page.locator('[data-testid="concierge-mode-badge"]').innerText();
  console.log(JSON.stringify({
    model: models[0],
    mode,
    response: aiResponse,
    checks: ['rendered response', 'project context preserved', 'one follow-up question', 'no browser/request errors'],
  }, null, 2));
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
  proxy.kill('SIGTERM');
}