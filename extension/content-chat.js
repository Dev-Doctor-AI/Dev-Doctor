// content-chat.js
// Runs on https://chat.openai.com/*
// Injects an in-page script to attempt to read the client-side session token or other non-HTTP-only artifacts

(function() {
  try {
    // Inject a script so we can access page JS context (content scripts run in an isolated world)
    const script = document.createElement('script');
    script.textContent = `
      (function(){
        try {
          // Heuristics: attempt to read localStorage keys that may hold session tokens
          const keys = Object.keys(window.localStorage || {});
          const candidates = {};
          keys.forEach(k => { try { candidates[k] = window.localStorage.getItem(k); } catch(e){} });
          // Post the candidate set to the page window so the extension content script can pick it up
          window.postMessage({ type: 'DD_BRIDGE_CHATGPT_LOCS', data: candidates }, '*');
        } catch(e){ console.error('dd-bridge inject error', e); }
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (err) {
    console.error('dd-bridge content injection failed', err);
  }

  // Listen for the posted message and forward to the extension background
  window.addEventListener('message', (ev) => {
    if (!ev.data || ev.data.type !== 'DD_BRIDGE_CHATGPT_LOCS') return;
    // Send the collected data to extension background
    try { chrome.runtime.sendMessage({ type: 'CHATGPT_LOCS', payload: ev.data.data }); } catch (e) { console.error('dd-bridge sendMessage failed', e); }
  }, false);
})();
