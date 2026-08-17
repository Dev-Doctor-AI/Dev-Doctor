import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const observedRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', request => { if (/gemini|generativelanguage|credential-status/.test(request.url())) observedRequests.push({ url: request.url(), method: request.method() }); });

try {
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: 'AI provider settings' }).click();
  await page.locator('input[type="radio"]').nth(1).check();
  await page.locator('select').filter({ has: page.locator('option[value="gemini"]') }).selectOption('gemini');
  await page.waitForTimeout(2_000);
  const modelSelect = page.locator('select').filter({ has: page.locator('option[value="gemini-3.7-flash"]') });
  if (await modelSelect.count()) await modelSelect.selectOption('gemini-3.7-flash');
  await page.waitForTimeout(2_500);
  const providerButton = await page.locator('button[aria-label="AI provider settings"]').innerText();
  const body = await page.locator('body').innerText();
  await page.getByRole('button', { name: 'Test connection' }).click();
  await page.getByRole('status').filter({ hasText: 'Success:' }).waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});
  const connectionStatus = await page.getByRole('status').allTextContents().catch(() => []);
  const providerEndpoint = await page.locator('input').filter({ has: undefined }).count().catch(() => 0);
  assert(observedRequests.some(request => request.url.includes('/provider/gemini/generate') || request.url.includes('/credential-status/gemini')), 'Secure Gemini proxy was not contacted.');
  assert(observedRequests.every(request => !request.url.includes('?key=') && !request.url.includes('&key=')), 'A Gemini API key appeared in a browser-observed request URL.');
  console.log(JSON.stringify({
    providerButton,
    credentialLoaded: body.includes('Credential loaded from macOS Keychain'),
    credentialUnavailable: body.includes('Keychain credential unavailable'),
    selectedModel: await page.locator('select').filter({ has: page.locator('option[value="gemini-3.7-flash"]') }).inputValue().catch(() => null),
    connectionStatus,
    secureProxyRequests: observedRequests.map(request => ({ path: new URL(request.url).pathname, method: request.method })),
    directGeminiKeyUrlObserved: observedRequests.some(request => request.url.includes('?key=') || request.url.includes('&key=')),
    errors,
  }, null, 2));
} finally {
  await browser.close();
}