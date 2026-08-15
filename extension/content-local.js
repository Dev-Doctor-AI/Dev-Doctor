// content-local.js
// Runs on the Dev Doctor UI (http://localhost:3000/*). Listens for messages from the extension background and posts them to the page.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message && message.type === 'DD_SESSION_TOKEN') {
      // Relay the token into the page context
      window.postMessage({ type: 'oauth_token', provider: 'openai', token: message.token }, '*');
      sendResponse({ ok: true });
    }
  } catch (err) {
    console.error('dd-bridge content-local error', err);
  }
});
