// background.js
// Listens for messages from content-chat and relays a chosen token to the Dev Doctor app tab.

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    if (message && message.type === 'CHATGPT_LOCS') {
      // message.payload is an object of localStorage keys -> values
      const payload = message.payload || {};
      // heuristics: look for anything containing 'session' or 'auth' or 'token'
      const flattened = Object.entries(payload).map(([k,v]) => ({ k, v }));
      let candidate = null;
      for (const {k,v} of flattened) {
        if (!v) continue;
        if (/session|auth|token|credential|passport|user/i.test(k) || /session|auth|token|user|access/i.test(v)) {
          candidate = { key: k, value: v }; break;
        }
      }

      if (!candidate) {
        // nothing obvious; store payload for debugging and return
        console.warn('dd-bridge: no token candidate found', Object.keys(payload));
        return sendResponse({ ok: false, reason: 'no_candidate' });
      }

      // Find the first tab that matches localhost:3000 and send token to it
      const tabs = await chrome.tabs.query({ url: 'http://localhost:3000/*' });
      if (!tabs || tabs.length === 0) return sendResponse({ ok: false, reason: 'no_local_tab' });
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { type: 'DD_SESSION_TOKEN', token: candidate.value }, (resp) => {
        sendResponse({ ok: true, tabId, resp });
      });
      // Indicate async response
      return true;
    }
  } catch (err) {
    console.error('dd-bridge background error', err);
    sendResponse({ ok: false, error: String(err) });
  }
});
