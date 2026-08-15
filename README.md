# Dev Doctor

Dev Doctor is an AI-assisted game-development planning workspace. It guides a game concept through discovery and critique, then produces implementation-ready project documentation that can be exported as a consolidated project package.

## What it does

- Runs a guided discovery chat to turn an initial game idea into a defined project concept.
- Generates a Game Design Document (GDD / PRD), pitch deck, and asset list.
- Reviews project scope and defines an MVP.
- Produces MVP feature specifications, a final Technical Design Document (TDD), and role-specific freelance briefs.
- Lets users revisit and regenerate generated documents.
- Exports a project package containing the discovery chat and generated project documents.

## Stack

- React 19 and TypeScript
- Vite 6
- LM Studio through its OpenAI-compatible local API (the default provider)
- Optional OpenAI, Anthropic, and Google Gemini provider selection in the UI

## Prerequisites

- Node.js 20 or later
- npm
- For local AI generation: [LM Studio](https://lmstudio.ai/) running with a loaded model and its local server enabled

## Quick start: local LM Studio

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start LM Studio's local server on its default endpoint (`http://127.0.0.1:1234`).

3. Start the browser CORS proxy in a separate terminal:

   ```bash
   npm run start-proxy
   ```

   The proxy listens on `http://127.0.0.1:1235` and forwards requests to LM Studio. To use a non-default LM Studio server, set `LM_UPSTREAM` before starting the proxy:

   ```bash
   LM_UPSTREAM=http://127.0.0.1:1234 npm run start-proxy
   ```

4. Create a local `.env.local` file with the browser-facing proxy endpoint:

   ```dotenv
   VITE_LM_ENDPOINT=http://127.0.0.1:1235/v1/chat/completions
   ```

5. Start the Vite development server:

   ```bash
   npm run dev
   ```

6. Open the URL shown by Vite, select **Local (LM Studio)** if needed, and begin a discovery session.

`.env.local` is ignored by Git. The checked-in `.env.production` retains the direct default LM Studio endpoint; use a server-side proxy appropriate to your deployment when hosting beyond local development.

## AI providers and credentials

- **LM Studio** is the default local provider and does not require a cloud API key.
- **OpenAI, Anthropic, and Google Gemini** can be selected in the provider UI and require their respective API keys.
- Cloud API keys entered in the UI are held in memory and are not included in exported project packages or logs.
- ChatGPT/browser session tokens are **not** accepted as OpenAI Responses API credentials. Use an explicit OpenAI API key for OpenAI API requests.

`npm run start-auth` starts an optional local OAuth helper on port `1236`. It requires the relevant OAuth client-ID and client-secret environment variables; it is not needed for the standard LM Studio workflow.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run the TypeScript type check (`tsc --noEmit`). |
| `npm run start-proxy` | Start the local LM Studio CORS proxy on port `1235`. |
| `npm run start-auth` | Start the optional OAuth helper on port `1236`. |
| `npm run test:e2e` | Run the browser-based, helper-driven LM Studio end-to-end test. |

## Validation

Run the standard checks with:

```bash
npm run lint
npm run build
npm run test:e2e
```

The E2E test requires LM Studio to be running with a model available. It exercises the discovery flow, generated documents, and project-package export.

> Vite currently emits a non-blocking warning because the primary production bundle exceeds 500 kB after minification.

## Exports and repository hygiene

Generated project packages are downloaded by the browser. Local generated exports under `Output Files/`, dependency installs, build output, local environment files, logs, and process-ID files are ignored by Git to keep the repository focused on source and documentation.

## Project structure

```text
App.tsx             Application workflow and state orchestration
components/         Document viewers, modals, and interface components
services/           AI provider, LM Studio, export, and pipeline services
scripts/            Local proxy, OAuth helper, and E2E tooling
extension/          Optional browser-extension support files
```
