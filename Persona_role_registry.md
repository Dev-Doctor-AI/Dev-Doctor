# Dev Doctor AI — Specialist Role Requirements Registry

**Status:** P0.1 baseline contract registry. This document translates the approved Persona Recall roadmap into implementable persona, validation, and handoff contracts.

## Registry conventions

- **Active:** A current runtime function substantially performs the role.
- **Partial:** A function exists, but its input, output, restrictions, validation, or handoff differs materially from the required contract.
- **Deferred:** The required behavior is intentionally scheduled for a later milestone.
- **Missing:** No current function or contract provides the required behavior.

No role may hardcode project-specific questions, architecture, or final content. The runtime must enforce the contract while the selected model independently reasons about the project.

## Handoff map

```text
Concierge
  → Senior Technical Analyst
  → User Proxy Co-Writer (on creator request)
  → Project Synthesizer
  → TOC Architect
  → Lead Project Designer
  → Senior Product Manager
  → Agile Product Owner
  → Software Architect
  → Technical Document Formatter
  → Technical Project Manager / Production Assistant / Art Director
  → Pitch Deck Writer / Scope Reviewers
  → Project package renderer
```

## 1. Concierge — Intake and Collaborative Designer

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `getNextConversationStep` in `services/lmStudioService.ts` |
| Purpose | Establish the project name, build a high-level concept, and guide a collaborative discovery conversation. |
| Inputs | Full discovery transcript; uploaded file name/content; structured project memory when Milestone 6 is implemented. |
| Output | One creator-facing response: short understanding summary plus one specific next question, creative proposal, or completion gate. |
| Rules | Project name is first priority. Default to Information Gatherer mode. Switch to Creative Brainstormer mode when asked to help invent a complex mechanic. Uploaded documents are the source of truth. Never repeat a question the creator asked the AI to solve. |
| Validation | Project-name response is required until a valid name exists. Default responses contain one next action/question. Completion gate only occurs after title, core loop, and style are known. |
| Handoff | Creator accepts the completion gate or explicitly begins critique → Senior Technical Analyst. |
| Failure behavior | Keep the session in discovery; show a context-aware fallback question, never silently advance to generation. |
| User-visible | Yes. |

## 2. Senior Technical Analyst — Pre-generation Validator

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `performTechnicalCritique` returns only summary/questions. |
| Purpose | Stress-test the concept before generation by finding feasibility gaps, architecture risks, scale assumptions, state/authority uncertainty, and production bottlenecks. |
| Inputs | Full discovery transcript; uploaded-file truth; structured project memory; confirmed creative decisions. |
| Output | Structured critique summary plus 3–5 independently generated issues. Each issue includes area, severity, risk, why it matters, decision needed, and a targeted creator question. |
| Rules | Ask project-specific questions; do not prescribe a predetermined architecture; do not generate the final design; distinguish risk from confirmed requirement; prioritize unresolved high-impact decisions. |
| Validation | 3–5 issues/questions; every issue has a non-empty risk and decision; severity is valid; questions are non-duplicate and reference project context. |
| Handoff | Creator answers all required questions, optionally with User Proxy help → Project Synthesizer. |
| Failure behavior | Remain in critique; display retryable error; do not synthesize a final brief using generic fallback questions as confirmed facts. |
| User-visible | Yes. |

## 3. User Proxy Co-Writer — Critique Answer Assistant

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `getCritiqueAnswerSuggestion` is technically focused but not consistently first-person creator co-writing. |
| Purpose | Draft a decisive, plausible answer when the creator requests help answering one technical critique question. |
| Inputs | Full discovery transcript; project memory; critique issue/question; confirmed constraints. |
| Output | One first-person answer the creator can edit and submit. |
| Rules | No preamble, no meta-talk, no “TBD”, no “we will decide later”. Fill gaps with a concrete proposal that fits the project. Do not claim the answer was stated if it was proposed. |
| Validation | First-person wording; direct answer; no banned indecision phrases; no question back to the creator; grounded in project facts. |
| Handoff | Edited creator answer → Project Synthesizer as a critique-answer record. |
| Failure behavior | Keep the answer field editable; show a retryable helper failure without blocking a creator-written answer. |
| User-visible | Yes. |

## 4. Project Synthesizer and Project Name Extractor

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `getExpandedText` and `extractProjectName` exist, but synthesis currently consumes compacted concatenated chat rather than structured handoff data. |
| Purpose | Create the canonical project brief and preserve the official project name. |
| Inputs | Discovery transcript; uploaded-file truth; project memory; critique issues; creator answers; accepted helper proposals marked as accepted. |
| Output | Structured expanded brief plus stable extracted name. |
| Rules | Preserve confirmed facts, creative identity, and technical decisions. Do not turn unanswered critique questions into facts. Do not invent unsupported constraints. |
| Validation | Name is non-placeholder; brief includes core concept, loop, tone, audience, constraints, and resolved technical decisions where available. |
| Handoff | Canonical brief and name → TOC Architect, Lead Project Designer, Pitch Writer, Art Director, and downstream specialist chain. |
| Failure behavior | Preserve existing source context and prevent unsupported fallback from becoming the canonical brief. |
| User-visible | Brief is visible/exported; extraction is normally implicit. |

## 5. Table of Contents Architect

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `generateGDDTableOfContents` permits Markdown fallback and loose parsing. |
| Purpose | Build a concise, project-specific GDD outline. |
| Inputs | Canonical project brief and project name. |
| Output | JSON array of 6–10 unique section titles in logical order. |
| Rules | Titles must be project-specific, non-placeholder, and usable as an exact GDD contract. No explanatory prose. |
| Validation | JSON-only preferred; 6–10 unique non-empty titles; title length limits; no prose contamination; no nested/duplicate sections. |
| Handoff | Validated TOC → Lead Project Designer and Refactoring Lead. |
| Failure behavior | Run TOC-specific repair; reject malformed lists instead of treating arbitrary lines as top-level sections. |
| User-visible | Indirectly through GDD structure. |

## 6. Lead Project Designer — GDD Generator

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `generateFullGDDV2` accepts JSON or Markdown and uses broad parsing/fallbacks. |
| Purpose | Turn the canonical brief and TOC into a comprehensive, coherent GDD/PRD. |
| Inputs | Canonical brief; project name; validated TOC; later structured critique decisions. |
| Output | JSON array with exactly one `{ title, content }` entry for every TOC title. Content is detailed project-specific Markdown. |
| Rules | Preserve TOC titles 1:1; maintain terminology and numeric constraints; include mechanics, systems, controls, technical constraints, and production-relevant details; do not invent unsupported commercial claims. |
| Validation | Exact TOC coverage; no duplicate/missing sections; non-empty project-specific content; no placeholders; no title drift. |
| Handoff | GDD → Senior Product Manager, Asset Cataloger, Technical Project Manager, Scope Reviewers, Pitch Writer, and Art Director. |
| Failure behavior | GDD-specific repair; retain validated existing sections where possible; avoid generic hardcoded fallback as successful output. |
| User-visible | Yes. |

## 7. Senior Product Manager — MVP Definer

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `defineMVP` currently returns a summary and string lists only. |
| Purpose | Preserve the smallest credible version of the unique project hook. |
| Inputs | Validated GDD; canonical brief; known constraints. |
| Output | MVP summary, success criteria, structured in-scope features with IDs/reasons/priorities, out-of-scope features with defer reasons, risks, and dependencies. |
| Rules | In-scope work must be concrete, testable, core-loop-linked, and bounded. Out-of-scope work cannot remove the core loop merely to shrink scope. |
| Validation | At least two concrete in-scope and out-of-scope entries; stable IDs; no generic filler; every in-scope feature is eligible for BDD and TDD traceability. |
| Handoff | Structured MVP features → Agile Product Owner. |
| Failure behavior | MVP-specific repair; prevent incomplete/generic scope from unlocking downstream feature generation. |
| User-visible | Yes. |

## 8. Agile Product Owner — BDD Feature Specification Generator

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial / priority** — `generateMVPFeatureSpec` has a structured BDD shape but lacks the approved validation and full scenario contract. |
| Purpose | Convert one MVP feature into testable player-facing requirements. |
| Inputs | One structured MVP feature; canonical brief; relevant GDD sections; project constraints; known dependencies. |
| Output | Stable feature ID, user story, scenario set, invalid inputs, boundary conditions, failure/offline behavior, accessibility, telemetry/security/performance where relevant, technical notes, and dependencies. |
| Rules | Include happy path, invalid state/input, boundary, failure/offline where relevant, and a project-specific edge case. Given establishes state, When is action/event, Then is observable. Use actual project entities, limits, rules, and roles. |
| Validation | Every scenario has Given/When/Then. At least two scenarios and at least one non-happy-path scenario. No generic filler or placeholder text. Numeric constraints and named entities must be preserved. |
| Handoff | Validated feature specification → Software Architect and Technical Document Formatter. |
| Failure behavior | Use MVP-feature-specific repair; reject invalid specifications rather than passing them as TDD input. |
| User-visible | Yes. |

## 9. Software Architect — Technical Specification Generator

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `generateTechnicalSpecs` is a generic Markdown call; technical notes are mostly a string. |
| Purpose | Translate BDD requirements into engineering-ready architecture. |
| Inputs | Validated MVP feature spec; project brief; GDD; MVP constraints; dependencies. |
| Output | Components, responsibilities, inputs, outputs, state changes, data models, APIs/events, algorithms, validation rules, performance budgets, failure handling, dependencies, and state ownership. |
| Rules | Use tables for data models, APIs, and state variables. Reserve code blocks for algorithms, pseudocode, logic flow, shader snippets, or implementation snippets. For networked state, identify authority, replication, prediction, validation, and cosmetic-only behavior. |
| Validation | Components are non-empty; model fields are typed; APIs include caller/payload/failure information; states are declared before use; dependencies resolve; performance targets preserve project constraints. |
| Handoff | Structured technical specifications → Technical Document Formatter and Technical Project Manager. |
| Failure behavior | Technical-spec-specific repair; do not silently replace architectural details with generic Markdown. |
| User-visible | Yes. |

## 10. Technical Document Formatter — TDD Assembler

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `generateTechnicalDesignDocument` exists but receives loose `TDDFeature` values. |
| Purpose | Assemble validated product and technical artifacts into a traceable technical design document. |
| Inputs | Feature IDs, user stories, BDD scenarios, technical specifications, data models, APIs, state transitions, dependencies. |
| Output | Per-feature TDD sections: overview, stories, acceptance criteria, data model, state model, APIs/events, core logic, validation, failure handling, performance, dependencies, testing notes. |
| Rules | Preserve feature IDs and traceability. Render data structures as Markdown tables. Use code blocks only for logic. Do not rewrite validated content into vague summaries. |
| Validation | MVP-to-TDD traceability; no orphaned specs; no undefined field/state/API references; no contradictory limits; complete required section structure. |
| Handoff | Final TDD → Technical Project Manager; package exporter. |
| Failure behavior | Keep validated component artifacts and report section-level assembly errors. |
| User-visible | Yes. |

## 11. Technical Project Manager — Modular Production Briefs

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `generateModularBreakdown` returns title/content Markdown without structured role contracts. |
| Purpose | Turn GDD/TDD/asset requirements into contract-ready, non-overlapping role briefs. |
| Inputs | GDD; validated TDD; asset list; project name; dependencies. |
| Output | Structured briefs with ID, role, category, overview, scope, deliverables, acceptance criteria, dependencies, related briefs, constraints, and out-of-scope work. |
| Rules | Strictly separate creative, technical, production, design, and audio responsibilities. Name real deliverables and dependency direction. Never merge unrelated roles merely to reduce brief count. |
| Validation | Role/category valid; deliverables and acceptance criteria non-empty; dependency references resolve; responsibilities do not overlap materially; project name is used consistently. |
| Handoff | Production briefs → package renderer and creator; asset ownership → Asset Cataloger. |
| Failure behavior | Brief-specific repair; flag unresolved overlap/dependency warnings. |
| User-visible | Yes. |

## 12. Creative Art Director — Visual Prompter

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `generateAllVisualPrompts` creates a loose key-to-prompt map; `generateImage` is a placeholder. |
| Purpose | Translate project identity and asset requirements into cinematic, usable image-generation prompts. |
| Inputs | Canonical brief; visual identity; asset targets; aspect ratios; intended use; asset IDs. |
| Output | Asset-linked visual prompts with subject, composition, environment, lighting, camera, materials, palette, mood, style, exclusions, ratio, and intended use. |
| Rules | Prompts are project-specific and do not invent unsupported brand claims. Prompt generation and image-generation status are separate. |
| Validation | Every requested asset has an ID-linked prompt; required visual dimensions are present; prompts are not generic duplicates. |
| Handoff | Prompt → image provider; prompt/image status → package renderer. |
| Failure behavior | Preserve prompt if image generation is unavailable; report `image unavailable` rather than successful image output. |
| User-visible | Yes. |

## 13. Pitch Deck Writer

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — slide-by-slide JSON generation exists, but source-grounding validation is incomplete. |
| Purpose | Produce a project-specific publisher/investor pitch using the fixed slide contract. |
| Inputs | Canonical brief; project name; GDD highlights; slide configuration; approved claims; visual references. |
| Output | One valid JSON slide per requested slide, with title, Markdown content, visual prompt, and optional source-fact grounding. |
| Rules | Follow supplied slide title/objective. Do not invent funding, contacts, team names, market statistics, platforms, timelines, or unsupported market claims. |
| Validation | Exact slide count/title coverage; no extra slides; valid content and visual prompt; unsupported claim warnings; no contact placeholders without source support. |
| Handoff | Slides and visuals → package renderer. |
| Failure behavior | Slide-specific repair; do not fail or regenerate unrelated valid slides. |
| User-visible | Yes. |

## 14. Production Assistant — Asset Cataloger

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `generateAssetList` returns categorized string lists. |
| Purpose | Create a production inventory across creative, technical, UI, audio, animation, and marketing needs. |
| Inputs | GDD; TDD; visual prompts; production briefs; project name. |
| Output | Asset records with ID, category, name, purpose, quantity/format/resolution where relevant, dependencies, owner role, acceptance criteria, and source links. |
| Rules | Cover characters, enemies, weapons, environments, modular tiles, UI, VFX, animation, audio, technical/configuration assets, and pitch visuals as applicable. |
| Validation | Categories are meaningful; asset IDs unique; owner/dependency references resolve; technical art needs include relevant formats/LODs/rigs/shaders/platform restrictions. |
| Handoff | Asset list → Art Director, Technical Project Manager, package renderer. |
| Failure behavior | Asset-list-specific repair; retain validated categories when one category fails. |
| User-visible | Yes. |

## 15. AAA Studio Lead — Scope Reviewer

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `generateScopeReview` supports `studio` lens but shared contract is generic. |
| Purpose | Assess large-team marketability, scalability, certification, live operations, staffing, content volume, and budget/timeline exposure. |
| Inputs | GDD; MVP; TDD; production briefs; `studio` lens. |
| Output | Structured critique points: feature, critique, suggestion, reasoning, severity, lens. |
| Rules | Evaluate enterprise production trade-offs, not indie shortcuts masquerading as AAA advice. |
| Validation | Lens is `studio`; reasoning references AAA-scale concerns; mitigation is actionable. |
| Handoff | Scope review → creator and package renderer. |
| Failure behavior | Lens-specific repair. |
| User-visible | Yes. |

## 16. Indie Developer — Scope Reviewer

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — current `indie` default exists but its contract is not explicit enough. |
| Purpose | Assess feasibility for a 1–5 person team and identify scope-creep monsters. |
| Inputs | GDD; MVP; TDD; production briefs; `indie` lens. |
| Output | Structured critique points. |
| Rules | Prefer clever simplification, reusable systems, prototype-first cuts, and preserved core fun. |
| Validation | Lens is `indie`; suggestions are practical for a small team and do not remove the unique hook without explanation. |
| Handoff | Scope review → creator and package renderer. |
| Failure behavior | Lens-specific repair. |
| User-visible | Yes. |

## 17. Freelance PM — Scope Reviewer

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — current `freelance` lens exists but does not validate modular handoffs. |
| Purpose | Evaluate contractor modularity, unclear deliverables, communication bottlenecks, integration risk, and ownership gaps. |
| Inputs | GDD; TDD; production briefs; asset list; `freelance` lens. |
| Output | Structured critique points. |
| Rules | Focus on task boundaries, integration contracts, acceptance criteria, dependencies, and handoff artifacts. |
| Validation | Lens is `freelance`; critique references real role/dependency/handoff concerns. |
| Handoff | Scope review → creator and package renderer. |
| Failure behavior | Lens-specific repair. |
| User-visible | Yes. |

## 18. Game Jam Veteran — Scope Reviewer

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — current `gamejam` lens exists but requires explicit 48-hour minimum-fun constraints. |
| Purpose | Ruthlessly reduce the project to a playable 48-hour proof of fun. |
| Inputs | GDD; MVP; TDD; `gamejam` lens. |
| Output | Structured critique points. |
| Rules | Identify the minimum fun loop, what can be mocked, what must be cut, and what must be playable immediately. |
| Validation | Lens is `gamejam`; recommendations are concrete, ruthless, and tied to a playable prototype. |
| Handoff | Scope review → creator and package renderer. |
| Failure behavior | Lens-specific repair. |
| User-visible | Yes. |

## 19. Refactoring Lead Project Designer

| Contract field | Requirement |
| --- | --- |
| Current status | **Partial** — `refineGDD` exists but does not enforce full TOC-preservation and surgical-change contract. |
| Purpose | Apply a creator correction while preserving unaffected validated project content. |
| Inputs | Current validated GDD; TOC; project name; refactor instruction; affected downstream artifact references. |
| Output | Validated GDD sections with the same TOC identity, plus a change summary and impacted downstream documents. |
| Rules | Change only what the instruction requires. Preserve unaffected sections, terminology, IDs, and numeric decisions. Do not silently regenerate the entire document. |
| Validation | Exact TOC coverage; changed-section trace; no unrelated removals; affected dependent artifacts identified for regeneration. |
| Handoff | Updated GDD → selected downstream regeneration, including MVP, TDD, assets, briefs, pitch, and/or scope review as appropriate. |
| Failure behavior | Preserve original validated GDD and report the rejected refactor response. |
| User-visible | Yes. |

## Contract implementation order

1. Agile Product Owner BDD contract and validation (Milestone 1)
2. Software Architect and Formatter contracts (Milestone 2)
3. Technical PM, Asset Cataloger, Art Director contracts (Milestone 3)
4. Scope and Pitch contracts (Milestone 4)
5. Critique/synthesis/pipeline handoff contracts (Milestone 5)
6. Concierge, User Proxy, memory, and full transcript contracts (Milestone 6)
7. Package rendering and display contracts (Milestone 7)