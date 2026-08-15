# Implementation Plan

## Objective

Provide Dev Doctor AI with a runtime-selectable AI provider layer, defaulting to the local LM Studio OpenAI-compatible API at `http://localhost:1234/v1/chat/completions`.

The application must build successfully, use one active AI service, avoid obsolete credentials and external AI endpoints, and document unsupported capabilities clearly.

## Verified current state

### Current fix in progress: restore original conversation gating

- `App.tsx` now blocks critique/document generation unless the project has a real name and at least two meaningful user inputs, matching the original Concierge flow.
- The app now shows a user-facing prompt instead of generating placeholder docs when the conversation is still effectively empty.
- This fix preserves the original design intent: gather project facts first, then compile critique and document generation.

### Completed or partially completed

- `App.tsx` imports `services/lmStudioService.ts`.
- `lmStudioService.ts` uses `VITE_LM_ENDPOINT` with a localhost:1234 fallback.
- `.env.production` defines `VITE_LM_ENDPOINT` for LM Studio.
- `.env.local` defines only `VITE_LM_ENDPOINT`.
- The README primarily documents LM Studio operation.

### Not complete

- The active project no longer contains the Gemini service, dependency, credentials, Vite mappings, or import-map entry.
 - The duplicate legacy project directory `../remix_-dev-doctor-ai---b 2` was deleted on 2026-08-13 by explicit user instruction.
- The active LM Studio service syntax errors have been repaired; the production build now succeeds.
- Repository type-checking is no longer blocked by the deleted active Gemini service.
- Streaming behavior and an end-to-end request against a running LM Studio instance have not been verified.
- Error classification and structured LM Studio request logging are implemented; performance validation and CI/CD remain incomplete.
- Structured response validation and user-facing service-error mapping are implemented; forced failure-path testing remains incomplete.
- A targeted performance pass removed disabled image-generation requests and unnecessary fixed completion delays from the active app; broader profiling remains incomplete.
- The missing `index.css` build warning is resolved; application-level code splitting remains deferred because the attempted vendor split introduced circular chunks and belongs with the major refactor.

## Work plan

### 1. Establish repository inventory

- Inventory all project files, including hidden files and duplicate application directories.
- Search source, configuration, documentation, generated history, and package metadata for Gemini names, Google AI imports, credentials, external AI URLs, LM Studio endpoints, and placeholder values.
- Classify historical documentation and migrated prompt history separately from executable code.

### 2. Make the active service buildable

- Fix all syntax and type errors in `services/lmStudioService.ts`.
- Replace invalid project-name parsing expressions with valid TypeScript regular expressions.
- Preserve the service API expected by `App.tsx` while correcting request, response, timeout, and error handling.
- Confirm the LM Studio payload uses `model`, `messages`, generation parameters, and the intended streaming setting.

### 3. Remove obsolete Gemini integration

- Delete `services/geminiService.ts` after confirming no live imports remain. **Complete for the active project.**
- Remove `@google/genai` from `package.json` and update the lockfile. **Complete for the active project.**
- Remove Gemini-related `define` entries from `vite.config.ts`. **Complete.**
- Remove Gemini variables from `.env.local`. **Complete.**
- Remove the Gemini entry from `index.html`'s import map. **Complete.**
 - Review the duplicate `remix_-dev-doctor-ai---b 2` directory; complete because the separately identified legacy artifact was deleted by explicit user instruction.
- Update README structure and wording so it no longer presents Gemini files as project components. **Complete.**

### 4. Handle unsupported capabilities

- Keep image-generation fallback behavior explicit because LM Studio text chat does not provide image generation.
- Display only the user-facing text `Image generation coming soon` when image generation is requested.
- Ensure that message is never stored or rendered as base64 image data.
- Verify response parsing for GDD, TDD, pitch deck, critique, asset, and scope-review functions.

### 5. Validate configuration and connectivity

- Confirm development and production configuration resolve `VITE_LM_ENDPOINT` to localhost:1234.
- Start LM Studio with a compatible model loaded and verify the endpoint is reachable.
- Run the development application and perform a representative generation flow.
- Verify requests, CORS, response parsing, timeout behavior, retry behavior, and user-visible errors.
- Run `npm run lint`, `npm run build`, and `npm run preview` from the active project directory.
- Use `start_app.sh` on macOS to start Vite and open the app automatically for browser validation.
- Validate `start_app.sh` with `bash -n` and a start/stop smoke test before using it for browser validation.
- Verify that `start_app.sh` stops the complete Vite/npm child process tree when interrupted.
- Use TERM for automated child-process shutdown smoke tests when background-shell SIGINT semantics make Ctrl-C unreliable.

### 5a. Error handling and logging

- Classify LM Studio failures as unreachable, timeout, HTTP, model, empty response, invalid response, retry exhaustion, or unknown.
- Log request correlation IDs, operation, model, endpoint, duration, status, retry attempts, request/response sizes, token usage, and classified errors.
- Keep logs privacy-conscious by excluding secrets, full prompts, full responses, file contents, and raw project transcripts.
- Retain a bounded in-memory diagnostic history for current-session inspection.

### 5b. Response validation and user-facing errors

- Validate pitch decks, MVPs, TDD documents, GDD sections, tables of contents, asset lists, and scope reviews before updating UI state.
- Classify malformed structured output as `LM_STUDIO_INVALID_RESPONSE`.
- Map technical service failures to concise user-facing messages while retaining diagnostic details in logs.

### 5c. Performance review

- Remove calls for unsupported capabilities when their output is a fixed user-facing message.
- Remove unnecessary fixed completion delays while preserving model-protection throttles for concurrent TDD work.
- Measure bundle size, dependency size, persistence cost, request latency, and browser rendering before broader optimization.
- Keep the base stylesheet present; defer third-party vendor chunking until dependency boundaries can be split without circular chunks.

## Project-control review cadence

- Review `.clinerules`, `implementation_plan.md`, and `statuslog.txt` together at project open, app open, LM Studio model change, and the first task after one hour has elapsed since the previous review.
- Do not reread or rewrite the control files before every command, tool call, or conversational turn.
- Use targeted sections, narrow searches, and concise summaries for scheduled reviews; do not load unrelated documentation, generated outputs, or historical logs into task context unless they are directly relevant.
- Read a complete source or documentation file only when the active task requires it, targeted inspection leaves a material ambiguity, a dependency must be traced through the full file, or the user requests full review.
- Update only the applicable control files when a task changes policy, planned work, validation status, blockers, decisions, or documented behavior; update all three together when shared project state changes.

### 6. Final review and documentation

- Repeat the migration search and confirm no executable Gemini integration or credential references remain.
- Update this plan and `statuslog.txt` with final results, changed files, validation commands, and remaining dependencies.
- At scheduled control-file review events, update `.clinerules`, `implementation_plan.md`, and `statuslog.txt` as applicable; record tested and untested validation explicitly in `statuslog.txt`.
- Do not mark the migration complete until the build and representative LM Studio request both succeed.

## Acceptance criteria

| Area | Required result | Status |
|---|---|---|
| Active service | All live AI calls use `lmStudioService.ts` | Verified; persona flow repaired and tested |
| Endpoint | Configurable through `VITE_LM_ENDPOINT`, defaulting to localhost:1234 | Verified in source |
 | Gemini removal | No executable Gemini service, dependency, credential, or config remains in the active project | Met; duplicate sibling deleted |
| Build | `npm run lint` and `npm run build` succeed | Met |
| Runtime | Representative generation succeeds against LM Studio | Met with `google/gemma-4-12b`; browser/CORS flow still pending |
| Unsupported image generation | Displays only `Image generation coming soon` as text | Implemented; lint/build passed |
| Documentation | README, implementation plan, status log, and project rules reflect reality | In progress |
| Logging | Structured, classified, privacy-conscious LM Studio diagnostics | Implemented; lint/build passed |
| Response validation | Structured output checked before entering application state | Implemented; lint/build passed |
| User-facing errors | Technical failures mapped to actionable concise messages | Implemented; lint/build passed |
| Targeted performance | Disabled work removed without changing supported flows | Implemented; lint/build passed |
| Build warnings | Missing stylesheet warning resolved | Implemented |
| Vendor chunking | Third-party dependencies separated from application chunk | Deferred; attempted split introduced circular chunks |

## Current blocker

 The active Gemini integration has been removed and lint/build validation passes. Image generation now displays only `Image generation coming soon` as text. Persona logic now sends an explicit Concierge system instruction, preserves bounded conversation context, retries empty model content, and uses rotating contextual fallbacks. The duplicate legacy sibling application has been deleted. The development server returns HTTP 200 at `http://127.0.0.1:3000/`. Representative LM Studio inference succeeds historically with `google/gemma-4-12b`; browser/CORS flow remains blocked until LM Studio is running. See `statuslog.txt` for the detailed validation record.

## Current validation update — duplicate cleanup and browser-validation start

- Deleted the explicitly authorized legacy duplicate directory `/Users/clayton/Projects/Games/Dev Dr/remix_-dev-doctor-ai---b 2`.
- Confirmed no running process was using the duplicate before deletion.
- Started the active Vite development server from this project at `http://127.0.0.1:3000/`.
- Confirmed the development server returned HTTP 200.
- Cleaned up a stale Vite child process and confirmed the final server is healthy on port 3000 after restart.
- LM Studio is now reachable at `http://127.0.0.1:1234`; browser generation is ready for validation against the model currently selected by the user. The previously verified `google/gemma-4-12b` model is no longer assumed to be the preferred model.

## Model-change validation update

- The user changed the LM Studio model after the previous Gemma validation because Gemma was unsuitable.
- The documented launcher has been run successfully and the app responds at `http://127.0.0.1:3000/`.
- LM Studio `/v1/models` responds successfully and lists the available local models.
 - The selected model and a successful chat-completion result still need to be confirmed through the user's current browser test before changing the application default or marking runtime validation complete.


## 2026-08-15 - MVP & Auth Changes (by mvp-auth-engineer)

- Replaced loose Markdown-only MVP/TDD feature flows with a strongly-typed MVPFeatureSpec structure (BDDScenario, MVPFeatureSpec) in `types.ts` and persisted it in `ProjectSession` and ProjectPackage shapes.
- Wired a new runtime state `mvpFeatureSpecs` into `App.tsx`, including load/save to localStorage and inclusion in exported packages.
- Implemented a structured viewer at `src/components/MVPFeatureSpecViewer.tsx` rendering typed Given/When/Then scenarios, invalid-input handling, boundary conditions, offline behavior, accessibility notes, and technical dependencies.
- Hardened OpenAI auth UX: SDK/browser session tokens (ChatGPT/extension) are NOT accepted as OpenAI Responses API bearer keys. The UI now stores SDK tokens for convenience but requires an explicit OpenAI API key for the Responses API. The README and provider UI were updated with explanatory guidance.
- Preserved dynamic freelance brief counts; no hardcoded role counts were introduced.

Validation performed:
- Ran `npm run lint` — PASSED.
- Ran `npm run build` — PASSED (production bundle built).
- Verified that the new types compile and the app builds successfully.

Open questions / blockers:
- The Gemini service is left as a runtime-optional module (dynamic require). Developers who intend to use Google Gemini must `npm install @google/genai` locally.
- End-to-end runtime verification against OpenAI Responses API requires a valid OpenAI API key entered in the UI; SDK/session tokens will not be accepted for the Responses API.
- Automated tests for exported package content (JSON/MD/TXT/HTML) including the new MVPFeatureSpec shape are recommended to ensure export renderers include the new structured fields.

Next steps:
- Wire the MVP feature generator (GeminiService.generateUserStoriesAndAcceptanceCriteria / generateTechnicalSpecs) to produce MVPFeatureSpec objects directly (prompt specialist task).
- Add export rendering tests to confirm the new spec fields appear correctly in all export formats.
- Optionally add a small migration script to convert existing TDD markdown into MVPFeatureSpec entries when available.

## Runtime provider selector implementation — 2026-08-13

- Added `services/aiProvider.ts` as a common runtime provider layer for LM Studio, OpenAI-compatible endpoints, Google Gemini, and Anthropic Claude.
- Added `components/AIProviderSelector.tsx` to the top application header next to the project controls.
- Provider, model, endpoint, and API key are held in React/service runtime state only; they are deliberately excluded from `ProjectSession`, local project history, exports, and logs.
- Added provider-specific request adapters and a connection-test action.
- Added a custom model ID field so models not included in the common dropdown list can be selected without code changes.
- Cloud API keys are browser-exposed in this frontend-only architecture; README documents the limitation and recommends a server-side proxy for public deployment.

## Native OpenAI provider update — 2026-08-13

- Added a dedicated OpenAI provider using the official Responses API endpoint `https://api.openai.com/v1/responses`.
- Added official GPT-5.6 model presets including `gpt-5.6-luna`.
- Kept LM Studio separate on its local OpenAI-compatible Chat Completions endpoint.
- Do not use an OpenAI API key previously pasted into chat; revoke it and enter a replacement only in the local browser UI.

## Agent: pipeline-export-engineer — 2026-08-15

- Implemented a unified, sequential eight-stage generation pipeline as services/pipelineOrchestrator.ts. The pipeline executes the stages in order (GDD, Pitch Deck, MVP Definition, MVP Feature Specs, Final TDD, Dynamic Freelance Briefs, Asset List, Scope Review) with strictly sequential AI calls and progress callbacks; it does not parallelize model requests.
- Added a normalized ProjectPackage model in types.ts and exporters (services/packageExporter.ts) for Markdown, Plain Text, HTML, and JSON. Exporters consume a single ProjectPackage instance so all formats remain consistent. Dynamic freelance brief counts are preserved and included in exports.
- Integrated pipeline invocation into App.tsx via handleRunUnifiedPipeline; pipeline results are applied to UI state and exporters are used by download handlers for consistent output.

Remaining manual steps / blockers:

- Browser CORS / LM Studio runtime verification is required to validate end-to-end generation in the browser — the pipeline was not executed against paid/cloud providers for this change.
- Agent 2 should confirm final ProjectPackage field shapes and any provider scheduling expectations.

## 2026-08-16 - Minor UI wiring

- Wired MVPFeatureSpecViewer into `App.tsx` so structured MVPFeatureSpec objects render in the TDD/Specs area of the UI. The legacy TDD viewer remains as a fallback when typed specs are absent.
- Validation note: this change is a minimal UI wiring edit; please run `npm run lint` and `npm run build` locally to confirm type-checking and bundling after pulling these edits.
- Suggested next step: add export-render snapshot tests to assert MVPFeatureSpec appears correctly in Markdown/HTML/TXT exports.

