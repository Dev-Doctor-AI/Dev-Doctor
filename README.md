# Dev Doctor

AI-assisted game idea refinement and game-development documentation generation.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a2a6e343-80be-49e6-a937-28723c280456

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (if using Google Gemini)
3. Run the app:
   `npm run dev`


## Authentication & Provider Notes

- Local development: the app defaults to LM Studio at `http://localhost:1234` (configurable by `VITE_LM_ENDPOINT`). No cloud API keys are required for local LM Studio usage.
- Cloud providers (OpenAI, Anthropic, Google Gemini): these require a valid API key entered into the provider settings in the UI. Cloud API keys are held in memory only and are not persisted to project exports or logs.
- Important security change: OAuth/browser session tokens (for example, ChatGPT session tokens obtained via an extension or SDK sign-in) are NOT accepted as bearer credentials for the OpenAI Responses API. The UI may offer an SDK sign-in flow for convenience, but you must still provide an explicit OpenAI API key for the Responses API. This prevents accidental exposure of session tokens and avoids unsupported/undocumented auth flows.
- For production deployments, run a server-side proxy to keep cloud API keys off the browser and follow the README guidance for secure hosting.
