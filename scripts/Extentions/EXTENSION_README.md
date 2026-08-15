Dev Doctor Session Bridge (dev)

Files created in scripts/
- extension-manifest.json (copy this to extension/manifest.json when building the unpacked extension)
- extension-content-chat.js
- extension-content-local.js
- extension-background.js

How to load the extension (dev):
1. Create a folder `extension/` in the repo and copy these four files into it, renaming extension-manifest.json -> manifest.json.
2. Open chrome://extensions/, enable Developer Mode, click "Load unpacked" and select the extension/ folder.
3. Visit https://chat.openai.com and sign in (Google), then open http://localhost:3000. The extension will attempt to locate session-like data in localStorage on chat.openai.com and forward the best candidate value to the app.

Caveats:
- This is intentionally a brittle, developer-only bridge to mimic how Cline appears to reuse a browser session. It may break when OpenAI changes storage/keys.
- Do not use in production. Do not commit the extension folder to shared repos.
