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
  throw new Error('No available port found for the brainstorming smoke test.');
}

async function waitForUrl(url, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`${label} was not available at ${url}.`);
}

const modelsResponse = await fetch('http://127.0.0.1:1234/v1/models').catch(() => null);
if (!modelsResponse?.ok) throw new Error('LM Studio is unavailable. Start its local server first.');
const models = (await modelsResponse.json()).data?.map(model => model.id).filter(Boolean) || [];
if (!models.length) throw new Error('LM Studio has no loaded models.');

const proxy = spawn('npm', ['run', 'start-proxy'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await availablePort(3030);
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
  const messageSelector = 'main [class*="whitespace-pre-wrap"]';
  const firstRequest = 'The project is Blood and Ichor, a dark cooperative game. Help me brainstorm how Blood, Ichor, and a currency should work.';
  const firstCount = await page.locator(messageSelector).count();
  await input.fill(firstRequest);
  await input.press('Enter');

  const waitForAssistant = async (previousCount) => {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const messages = await page.locator(messageSelector).allTextContents();
      if (messages.length > previousCount + 1) return messages.at(-1).trim();
      await sleep(500);
    }
    throw new Error('Timed out waiting for a brainstorming response.');
  };

  const firstResponse = await waitForAssistant(firstCount);
  assert.match(firstResponse, /\?/, 'The first brainstorming response did not request feedback.');
  assert.equal((firstResponse.match(/\?/g) || []).length, 1, 'The first brainstorming response asked more than one question.');
  assert.match(firstResponse, /blood|ichor|currency/i, 'The first brainstorming response did not address a requested subtopic.');

  const secondCount = await page.locator(messageSelector).count();
  await input.fill('I like that idea.');
  await input.press('Enter');
  const secondResponse = await waitForAssistant(secondCount);
  assert.match(secondResponse, /\?/, 'The accepted brainstorm did not continue with a next-subtopic question.');
  assert.equal((secondResponse.match(/\?/g) || []).length, 1, 'The next-subtopic response asked more than one question.');
  assert.doesNotMatch(secondResponse, /what should we do next|which direction should we take|what would you like to explore next/i, 'The Concierge asked for permission instead of leading the brainstorm.');
  assert.equal(requestFailures.length, 0, `Browser request failures occurred: ${requestFailures.join(' | ')}`);
  assert.equal(browserErrors.length, 0, `Browser errors occurred: ${browserErrors.join(' | ')}`);

  console.log(JSON.stringify({
    model: models[0],
    firstResponse,
    secondResponse,
    checks: ['first subtopic proposal', 'one feedback question', 'acceptance advances to next subtopic', 'no browser/request errors'],
  }, null, 2));
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
  proxy.kill('SIGTERM');
}