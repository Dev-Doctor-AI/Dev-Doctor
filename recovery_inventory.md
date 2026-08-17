# Dev Doctor Recovery Inventory

Authoritative prototype:

`/Users/clayton/Projects/Games/Dev Dr/reference-gas/DEV_DR_Original_Repo.zip`

## Milestone 1 — Concierge transport and discovery

| Item | Task type | Prototype evidence | Migration target | Status |
| --- | --- | --- | --- | --- |
| Concierge system persona, dual modes, document rule, project-name priority, and completion wording | `COPY_VERBATIM` | `services/geminiService.ts:280-323` | `services/personaPrompts.ts:8` | Recovered verbatim |
| Gemini request/response transport | `ADAPT_TRANSPORT_ONLY` | `services/geminiService.ts:239-270, 323-364` | `services/aiProvider.ts`, `services/lmStudioService.ts` | Existing provider adapter retained |
| Transcript-driven discovery request construction and file handling | `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:325-364`; `App.tsx:940-980` | `services/lmStudioService.ts:getNextConversationStep` | Preserved with structured memory context |
| Information-gatherer and creative-brainstormer mode selection | `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:289-304`; recovery map Stage 1 | `services/memoryPersonaContract.ts` | Message-count heuristic removed |
| Completion gate readiness | `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:306-316`; `ORIGINAL_FLOW_SUMMARY.md:74-80` | `services/memoryPersonaContract.ts` | Evidence contract added |
| Structured memory and transcript preservation | `KEEP_MIGRATED_IMPLEMENTATION` | Migrated contract and `App.tsx:943-971` | `services/memoryPersonaContract.ts` | Retained |

## Milestone 3 — Technical critique and creator answer loop

| Item | Task type | Prototype evidence | Migration target | Status |
| --- | --- | --- | --- | --- |
| Technical Analyst system persona | `COPY_VERBATIM` | `services/geminiService.ts:1126` | `services/personaPrompts.ts:45` | Recovered verbatim |
| Technical critique prompt/output intent | `COPY_VERBATIM` | `services/geminiService.ts:1128-1138` | `services/personaPrompts.ts:53-63`, `services/lmStudioService.ts:performTechnicalCritique` | Recovered prompt; migrated JSON parsing retained |
| Creator-perspective answer suggestion persona | `COPY_VERBATIM` | `services/geminiService.ts:1215` | `services/personaPrompts.ts:51` | Recovered verbatim |
| Creator-perspective answer suggestion task | `COPY_VERBATIM` | `services/geminiService.ts:1217-1230` | `services/personaPrompts.ts:65-81` | Recovered; question supplied as separate task context |
| Questions → answers → completed critique gate | `REIMPLEMENT_BEHAVIOUR` | `App.tsx:904-952` | `App.tsx:handleCritiqueResponseAndGenerate` | Existing blank-answer gate retained |
| Accepted critique answers become durable decisions | `REIMPLEMENT_BEHAVIOUR` | Recovery map Stage 3; prototype answer submission at `App.tsx:911-918` | `services/memoryPersonaContract.ts:critiqueAnswersToMemoryEntries`, `App.tsx` | Implemented |

## Milestone 4 — Canonical project truth

| Item | Task type | Prototype evidence | Migration target | Status |
| --- | --- | --- | --- | --- |
| Conversation becomes a coherent expanded project brief | `COPY_VERBATIM` + `ADAPT_TRANSPORT_ONLY` | `services/geminiService.ts:559-569` | `services/lmStudioService.ts:getExpandedText` | Prototype role retained behind local provider |
| Structured canonical project context | `KEEP_MIGRATED_IMPLEMENTATION` + `REIMPLEMENT_BEHAVIOUR` | Prototype handoff sequence `App.tsx:911-938`; recovery map Stage 4 | `services/memoryPersonaContract.ts:buildCanonicalProjectContext` | Implemented with traceable references |
| Downstream stages consume canonical truth rather than raw transcript alone | `REIMPLEMENT_BEHAVIOUR` | Prototype `App.tsx:923-938`; recovery map Stage 4/14 | `App.tsx`, `services/pipelineOrchestrator.ts` | Direct and unified handoffs updated |

## Milestone 5 — GDD → MVP → BDD traceability

| Item | Task type | Prototype evidence | Migration target | Status |
| --- | --- | --- | --- | --- |
| GDD table-of-contents persona | `COPY_VERBATIM` | `services/geminiService.ts:1187-1197` | `services/personaPrompts.ts` | Recovered |
| Full GDD persona and TOC relationship | `COPY_VERBATIM` + `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:367-395`; `App.tsx:934-938` | `services/lmStudioService.ts`, pipeline | Prompt/input relationship retained |
| MVP persona and GDD dependency | `COPY_VERBATIM` + `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:779-792` | `services/lmStudioService.ts`, pipeline | GDD supplied as authoritative input |
| BDD/user-story persona | `COPY_VERBATIM` | `services/geminiService.ts:822-828` | `services/personaPrompts.ts`, `lmStudioService.ts` | Recovered |
| MVP feature → BDD context relationship | `REIMPLEMENT_BEHAVIOUR` | Prototype GDD/MVP flow; recovery map Stage 7 | `generateMVPFeatureSpec`, App/pipeline callers | Canonical + GDD + MVP context supplied |
| BDD validation and repair | `KEEP_MIGRATED_IMPLEMENTATION` | Migration contract | `services/bddFeatureValidator.ts` | Retained |

## Milestone 6 — Technical specification → TDD

| Item | Task type | Prototype evidence | Migration target | Status |
| --- | --- | --- | --- | --- |
| Software Architect persona and technical-spec role guidance | `COPY_VERBATIM` | `services/geminiService.ts:840-863` | `services/personaPrompts.ts`, `lmStudioService.ts` | Recovered around structured contract |
| Technical specification input relationship | `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:842-854`; recovery map Stage 8 | App/pipeline technical-spec callers | Validated BDD + canonical/GDD/MVP context supplied |
| TDD assembler persona and section requirements | `COPY_VERBATIM` | `services/geminiService.ts:884-907` | `services/personaPrompts.ts`, `lmStudioService.ts` | Recovered around assembler |
| TDD dependency graph | `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:868-876`; recovery map Stage 9 | `technicalSpecContract.ts`, App/pipeline | Feature IDs/scenarios/specifications preserved |
| Structured technical validation and repair | `KEEP_MIGRATED_IMPLEMENTATION` | Migrated contract | `services/technicalSpecContract.ts` | Retained |

## Milestone 7 — Production and presentation branch

| Item | Task type | Prototype evidence | Migration target | Status |
| --- | --- | --- | --- | --- |
| Modular production breakdown role and non-overlapping briefs | `COPY_VERBATIM` + `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:511-534` | `productionHandoffContract.ts`, pipeline | Existing structured briefs retained; dependency context strengthened |
| Asset catalog separate from image generation | `REIMPLEMENT_BEHAVIOUR` | `services/geminiService.ts:952+`; recovery map Stage 11 | pipeline and production contracts | Asset metadata precedes visual/image work |
| Visual prompt generation | `COPY_VERBATIM` where source exists; `ADAPT_TRANSPORT_ONLY` | Prototype visual prompt function | `generateVisualPromptContracts` | Kept behind text provider boundary |
| Pitch source ordering and claim traceability | `REIMPLEMENT_BEHAVIOUR` | Prototype pitch function `services/geminiService.ts:584+`; recovery map Stage 12/14 | `pipelineOrchestrator.ts` | Pitch now runs after MVP/TDD/production/assets/visual prompts |
| Scope review lens | `COPY_VERBATIM` + `KEEP_MIGRATED_IMPLEMENTATION` | Prototype `services/geminiService.ts:1035+` | `scopePitchContract.ts`, pipeline | Stronger migrated contract retained |

## Runtime evidence — full pipeline TDD boundary

| Observation | Classification | Evidence | Decision |
| --- | --- | --- | --- |
| LM Studio Mistral completed a TDD request with `finish_reason: stop`, `truncated: 0`, and `reasoning_tokens: 0` | `MODEL_BEHAVIOUR` | LM Studio log supplied during full pipeline run | Not a truncation/reasoning failure |
| Returned TDD contained duplicate section titles and malformed/incomplete table content | `REIMPLEMENT_BEHAVIOUR` + validation repair | LM Studio generated payload | Reject/repair; do not accept as final TDD |
| Unified pipeline previously marked `tdd` complete before final TDD generation | `REIMPLEMENT_BEHAVIOUR` | `services/pipelineOrchestrator.ts` stage sequence | Fixed: stage completes only after validated final TDD |

## Source discipline

- Exact persona text is copied only from the archive source listed above.
- Provider/model constraints are not added to the recovered persona.
- Hidden proxy prompts are not reconstructed; if needed, they remain `SOURCE NOT FOUND` until their source is supplied.
- Later migrated validators and contracts remain in place unless comparison proves incompatible behaviour.

## Current recovery status — 2026-08-17

- Visible Duck Wars evidence confirms the recovered UI gates through MVP Feature Specs unlock.
- Manual button order is now aligned with the dependency sequence: `gdd -> mvp -> tdd_specs -> tdd_doc -> modular -> assets -> pitch -> scope`.
- Human-like browser movement/click recording, screenshots, persisted Rich Package capture, visible text capture, and lifecycle cleanup are implemented in `scripts/run-visible-duck-wars-manual.mjs`.
- Progress modal workflow position and activity metadata are exposed in `components/GenerationProgressIndicator.tsx`.
- The remaining Milestone 6 blocker is Gemini technical-spec response shape validation: a specification may be missing or not an object. Final TDD and Milestone 7 full visible validation remain pending.
- Primary resume instructions are in `TOMORROW_RESUME.md`.