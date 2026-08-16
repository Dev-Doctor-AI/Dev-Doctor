# Persona Recall — Canonical Specialist & Orchestration Restoration Plan

**Status:** Approved baseline plan. Do not replace this document with session notes.

## Purpose

Restore Dev Doctor AI's original multi-persona specialist workflow without hardcoding project outcomes. The application must enforce stable persona contracts, schemas, validation rules, memory boundaries, and handoff data while allowing each model to independently identify risks, ask different critique questions, and choose project-specific solutions.

## Target specialist architecture

```text
PHASE A — Canonical project source
  expandedText + project memory + critique issues + critique answers

PHASE B — Design
  TOC Architect → Lead Project Designer → GDD

PHASE C — Product definition
  Senior Product Manager → MVP summary + in-scope + out-of-scope

PHASE D — Engineering requirements
  Agile Product Owner → user stories + Given/When/Then + invalid inputs
  + boundaries + accessibility + offline/failure behavior

PHASE E — Technical architecture
  Software Architect → data models + state machines + APIs + systems
  + dependencies + performance budgets

PHASE F — Technical document assembly
  Technical Document Formatter → tables + algorithms/logic code blocks
  + cross-feature consistency

PHASE G — Production decomposition
  Technical Project Manager → role-specific briefs + deliverables
  + dependencies + acceptance criteria + no mixed responsibilities

PHASE H — Supporting production
  Art Director + Asset Cataloger + Pitch Writer + Scope Reviewers
```

## Phase 0 — Freeze requirements and baseline

### 0.1 Specialist-role requirements registry

Create a source-of-truth role registry. Each role entry must define: persona name, purpose, input data, output schema, restrictions, validation requirements, receiving stage, failure behavior, and whether the output is user-visible.

Required roles:

1. Concierge
2. Senior Technical Analyst
3. User Proxy Co-Writer
4. Project Synthesizer
5. TOC Architect
6. Lead Project Designer
7. Senior Product Manager
8. Agile Product Owner
9. Software Architect
10. Technical Document Formatter
11. Technical Project Manager
12. Creative Art Director
13. Pitch Deck Writer
14. Production Assistant / Asset Cataloger
15. AAA Scope Reviewer
16. Indie Scope Reviewer
17. Freelance PM Scope Reviewer
18. Game Jam Scope Reviewer
19. Refactoring Lead Project Designer

### 0.2 Implementation target

Do **not** make every model generate identical documents. Every model must receive the same role contract and produce valid, project-specific, independently reasoned outputs.

### 0.3 Validation projects

- **Primary:** Space Marines — complex systems, performance, networking, AI, combat, rendering, procedural generation, and production dependencies.
- **Negative/context test:** Space Miner — weak discovery, generic feature definition, insufficient creative context, and possible TOC/parser drift.

## Phase 1 — Strengthen type contracts

### 1.1 Stable feature identifiers

Every MVP feature needs a deterministic ID preserved through generation and refactoring, referenced by TDD sections and freelance briefs.

Examples: `core-3-phase-mission-loop`, `horde-flow-field-navigation`, `listen-server-co-op`.

### 1.2 Stronger BDD scenarios

```ts
interface BDDScenario {
  id?: string;
  type?: 'happy-path' | 'edge-case' | 'failure' | 'boundary' | 'offline';
  title: string;
  given: string[];
  when: string[];
  then: string[];
  notes?: string;
}
```

### 1.3 Explicit requirement categories

Add or enforce: acceptance criteria, invalid inputs, boundary conditions, failure states, offline behavior, accessibility, telemetry, security considerations, performance targets, and dependencies.

### 1.4 Technical specification contract

```ts
interface TechnicalSpecification {
  id: string;
  component: string;
  responsibility: string;
  inputs: string[];
  outputs: string[];
  stateChanges: string[];
  dataModels: DataModel[];
  APIs: ApiContract[];
  algorithms: string[];
  validationRules: string[];
  performanceBudget?: string[];
  failureHandling: string[];
  dependencies: string[];
}
```

### 1.5 Data models

```ts
interface DataModel {
  name: string;
  purpose: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    constraints?: string;
  }>;
}
```

Support Markdown tables: `Field | Type | Required | Description | Constraints`.

### 1.6 API contracts

```ts
interface ApiContract {
  name: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'RPC' | 'EVENT';
  request?: string;
  response?: string;
  errors?: string[];
  authorization?: string;
  latencyTarget?: string;
}
```

### 1.7 State transitions

```ts
interface StateTransition {
  from: string;
  event: string;
  guard?: string;
  to: string;
  sideEffects: string[];
  failureBehavior?: string;
}
```

### 1.8 Rich TDD feature contract

```ts
interface TDDFeature {
  featureId: string;
  feature: string;
  userStories: UserStory[];
  scenarios: BDDScenario[];
  technicalSpecifications: TechnicalSpecification[];
  dataModels: DataModel[];
  apiContracts: ApiContract[];
  stateTransitions: StateTransition[];
  dependencies: string[];
  acceptanceSummary: string[];
}
```

Retain legacy string forms temporarily only for backward compatibility.

### 1.9 Production brief contract

```ts
interface FreelanceBrief {
  id: string;
  title: string;
  role: string;
  category: 'creative' | 'technical' | 'production' | 'audio' | 'design';
  taskOverview: string;
  scopeOfWork: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  relatedBriefs: string[];
  constraints: string[];
  outOfScope: string[];
}
```

Never merge design and technical tasks into one brief.

## Phase 2 — Shared structured-output utilities

1. Add validators for MVP definitions, MVP feature specs, BDD scenarios, technical specifications, data models, API contracts, state transitions, freelance briefs, asset lists, and scope reviews.
2. Validators return `{ valid, errors, warnings }`.
3. Reject BDD features without a user story, scenario, Given, When, Then, feature-specific language, or with placeholder text.
4. Detect generic filler such as “the user can use the feature”, “the system behaves as expected”, “appropriate error message”, “standard implementation”, “TBD”, “define the feature”, and “handle invalid input accordingly”.
5. Validate scenario quality: Given is concrete state; When is action/event; Then is observable; numbers are preserved; project entities are named; failure cases are meaningful.
6. Validate traceability: MVP feature ID → feature spec → TDD feature → production brief.
7. Validate dependencies against existing features, briefs, known external systems, or explicit external dependencies.
8. Add schema-specific repairs: MVP definition, MVP feature spec, technical specification, freelance brief, asset list, and scope review.
9. Record parser path: valid JSON, fenced JSON, extracted JSON, Markdown parsed, repaired, fallback, or rejected.

## Phase 3 — Senior Product Manager / MVP contract

The MVP persona must preserve the unique hook, establish the smallest playable version, separate launch-critical work from expansion, explain deferrals, and avoid a generic stripped-down MVP.

Target output:

```json
{
  "summary": "...",
  "successCriteria": ["..."],
  "inScope": [{ "id": "...", "feature": "...", "reason": "...", "priority": "critical" }],
  "outOfScope": [{ "feature": "...", "reason": "...", "revisitCondition": "..." }],
  "risks": ["..."],
  "dependencies": ["..."]
}
```

Every in-scope feature must be concrete, testable, core-loop linked, user-story-ready, and bounded. Every one must trace to an MVP feature spec, TDD feature, and production brief.

## Phase 4 — Agile Product Owner / MVP Feature Specification contract

**Highest implementation priority.**

For each MVP feature, produce a user story, normal behavior, failure behavior, edge cases, boundaries, accessibility, offline behavior, dependencies, and technical notes.

Require scenario categories:

1. Happy path
2. Invalid input or invalid state
3. Boundary condition
4. Failure or offline case where relevant
5. At least one project-specific edge case

Gherkin semantics are mandatory:

```text
Given = precondition/state
When = action/event
Then = observable result
And = additional condition/result
```

Reject generic scenarios such as “Given the user is using the feature / When they provide valid input / Then the feature works.”

Require actual project entities, limits, rules, and user roles. Require invalid inputs such as invalid phase, missing resource, malformed RPC, impossible coordinate, capacity exceeded, duplicate request, disconnection, insufficient stamina, or expired timer when relevant. Require measurable boundaries such as player count, entity count, timers, distance thresholds, capacity, or concurrency when relevant.

Use a formatting-only prompt example such as:

```text
Feature: Core mission lockdown
Scenario: Squad completes the lockdown objective
Given a four-player squad is inside the Primary Data Vault
And the mission state is PHASE_2_OBJECTIVE_LOCKDOWN
And the lockdown timer has 180 seconds remaining
When a squad member activates the console
And at least one squad member remains inside the vault perimeter
Then the purge timer continues counting down
And the objective state remains synchronized for all connected clients
And the mission transitions to PHASE_3_DESPERATE_RETREAT when the timer reaches zero
```

This is a schema guide, never a hardcoded requirement.

## Phase 5 — Software Architect technical-specification pass

Input: MVP feature, user stories, BDD scenarios, project brief, constraints, and dependencies.

Output: component responsibilities, data models, state transitions, APIs/events, algorithms, validation, failure handling, performance budgets, dependencies, and ownership/authority.

Requirements:

1. Produce data-model tables for stateful features.
2. Produce API/event contracts for networked or service-backed features: caller, payload, validation, response, authority, replication, failure behavior, and latency budget.
3. Produce state-transition tables: current state, trigger, guard, next state, side effects, and failure behavior.
4. Separate algorithms from data tables.
5. Preserve project-specific frame-time, memory, CPU, GPU, tick-rate, bandwidth, entity, latency, and loading targets.
6. For networked systems identify client-owned, server-owned, replicated, predicted, validated, and cosmetic-only state.

## Phase 6 — Technical Design Document assembler

Do not ask one model to rewrite the TDD from scratch. Assemble validated components: MVP feature, stories, scenarios, technical specifications, data models, APIs, transitions, and dependencies.

Per feature use deterministic sections:

```text
Feature Overview
User Stories
Acceptance Criteria
Data Model
State Model
API/Event Contracts
Core Logic
Validation
Failure Handling
Performance
Dependencies
Testing Notes
```

Include traceability to source MVP feature, user stories, and scenarios. Data models, API contracts, and state variables are Markdown tables. Code blocks are reserved for algorithms, pseudocode, logic flows, shaders, or implementation snippets. Detect mismatched features, contradictory numbers, missing scenario coverage, undefined dependencies, undeclared states, and model fields used only in logic.

## Phase 7 — Technical Project Manager / production briefs

Generate real project-specific roles from GDD and TDD, not a fixed generic count. At minimum distinguish game design, gameplay programming, AI, networking, graphics, technical art, level design, UI/UX, animation, audio, QA, and production.

Every brief requires role, overview, scope, deliverables, constraints, acceptance criteria, dependencies, related briefs, out-of-scope work, and handoff artifacts. Do not mix level design with AI implementation, visual creation with rendering engineering, networking with gameplay design, or audio with general VFX.

Deliverables may include merged pull requests, engine packages/scenes, Figma prototypes, sprite sheets, animation sets, data tables, test plans, API documentation, or benchmark reports.

Every brief identifies prerequisite, parallel, follow-on, and blocking relationships.

## Phase 8 — Production Assistant / Asset Cataloger

Catalog characters, enemies, weapons, environments, modular tiles, UI, VFX, animation, audio, technical assets, configuration assets, and marketing/pitch visuals.

```ts
interface AssetRequirement {
  id: string;
  category: string;
  name: string;
  purpose: string;
  quantity?: string;
  format?: string;
  resolution?: string;
  dependencies?: string[];
  ownerRole?: string;
  acceptanceCriteria?: string[];
}
```

Link assets to GDD, MVP feature, TDD feature, and production brief. Preserve technical art constraints including resolution, animation format, rigs, LODs, shader needs, batching, and platform restrictions.

## Phase 9 — Creative Art Director and visual pipeline

Art Director inputs: tone, visual identity, character/environment details, asset target, aspect ratio, and intended use.

Prompts must name subject, composition, environment, lighting, camera, materials, color, mood, style, and technical exclusions.

```ts
interface VisualPrompt {
  assetId: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  intendedUse: string;
}
```

Track separate states: prompt generated, image requested, image generated, image failed, and image unavailable. Do not treat the existing placeholder image response as successful generation.

## Phase 10 — Pitch Deck Writer

Use fixed slide structure but project-specific content. Inputs include title, slide objective, source brief, GDD highlights, approved claims, and visual references. Do not invent funding, contacts, team names, market statistics, platforms, or timelines.

Optional grounding fields:

```ts
sourceFacts: string[];
unsupportedClaims: string[];
```

Validate title, one slide per config, no extra/missing slides, visual prompts, valid JSON, and no unsupported contact placeholders.

## Phase 11 — Four independent scope reviewers

1. **AAA Studio Lead:** scalability, certification, live operations, staffing, budget, content volume, marketability.
2. **Indie Developer:** 1–5 person feasibility, prototype, shortcuts, reusable systems, scope creep.
3. **Freelance PM:** modularity, contractor dependencies, unclear deliverables, communication, integration, handoffs.
4. **Game Jam Veteran:** 48-hour minimum fun, cuts, mocks, and immediately playable requirements.

Shared schema:

```json
[{"feature":"...","critique":"...","suggestion":"...","reasoning":"...","severity":"High","lens":"indie"}]
```

The lens must change reasoning, not merely label the same critique.

## Phase 12 — Rebuild specialist pipeline order

```text
1. Receive canonical brief
2. Generate and validate TOC
3. Generate and validate GDD
4. Generate and validate MVP
5. Generate MVP feature specs sequentially
6. Validate every feature spec
7. Generate technical specs per feature
8. Validate technical specs
9. Assemble and validate TDD traceability
10. Generate asset list
11. Generate visual prompts
12. Request/generate images
13. Generate freelance briefs
14. Validate role separation and dependencies
15. Run scope review
16. Generate pitch deck
17. Assemble and validate package completeness
```

Pass structured objects, not only raw strings:

```ts
generateMVPFeatureSpec(feature, projectName, mvp)
generateTechnicalSpec(featureSpec, projectMemory, mvp)
generateTechnicalDesignDocument(featureSpecs, technicalSpecs)
generateModularBreakdown(gdd, tdd, assetList, projectName)
```

Keep dependent work sequential: MVP features, technical specs, TDD assembly, and dependent briefs. Potentially parallelize independent pitch slides, visual prompts, and scope lenses only after contracts are stable.

## Phase 13 — Specialist prompt standard

Every specialist prompt contains:

1. Persona identity
2. Role objective
3. Input contract
4. Exact output schema
5. Quality rules

Quality rules include project-specific entities, success and failure cases, real Given/When/Then semantics, no unsupported platforms, no TBD, no generic filler, and preservation of numeric constraints.

## Phase 14 — Specialist regression fixtures

Create fixtures for Space Marines, Space Miner, Chrono-Bullet Hell, Dragon Defence, and Territory Grids. Fixtures contain project source, expected feature-count range, required Gherkin structure, technical-table presence, dependencies, role separation, and absence of placeholders.

Never assert exact model prose; assert structural and semantic properties.

## Phase 15 — BDD-focused automated tests

1. Type-level contract tests.
2. Validator tests: valid scenario, missing Given/When/Then, filler, invalid dependency, duplicate ID, missing feature reference.
3. Export tests for Given/When/Then in Markdown, TXT, and correctly rendered HTML.
4. Cross-stage traceability: MVP feature → feature spec → TDD feature → freelance brief.
5. Negative tests: malformed model output must repair or report validation errors, never silently become successful generic fallback or corrupt downstream stages.

## Phase 16 — Rich package rendering

After content contracts are stable, render project summary, discovery chat, technical critique, critique answers, expanded brief, GDD, pitch, MVP, BDD specs, TDD, assets, briefs, scope review, and generation metadata.

Restore rich Markdown-to-HTML behavior: collapsible sections, tables, code blocks, image panels, pitch slides, chat styling, navigation, and raw Markdown exports. Do not render the entire package as escaped Markdown inside `<pre>`.

## Phase 17 — Generation metadata

```ts
interface GenerationMetadata {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  promptVersion: string;
  workflowRoute: string;
  operations: Array<{
    operation: string;
    inputCharacters: number;
    outputCharacters: number;
    parserPath?: string;
    repaired: boolean;
    fallbackUsed: boolean;
  }>;
}
```

This enables comparable analysis of Mistral, Gemini 3.7 Flash, and restored original-style runs.

## Phase 18 — Restore memory, context, and persona orchestration

After specialist contracts are reliable:

1. Preserve full transcript, not only an 8,000-character window.
2. Add structured memory for confirmed facts, proposals, accepted/rejected decisions, unresolved questions, and constraints.
3. Keep critique and answers as separate structured records, not only concatenated chat text.
4. Pass role-relevant stage context rather than unrelated full packages.
5. Restore Concierge modes: Project Name, Information Gatherer, Creative Brainstormer, Completion Gate.
6. Restore adversarial Senior Technical Analyst output: risks, consequences, decisions, questions, severity.
7. Restore synthesis prompt and data contract.

## Recommended milestone order

### Milestone 1 — BDD foundation

1. Stronger `MVPFeatureSpec` types
2. Stable feature IDs
3. Scenario categories
4. BDD validator
5. New MVP feature prompt
6. Repair prompt
7. Fixture tests
8. Viewer/export verification

### Milestone 2 — Technical specification foundation

1. Technical specification, data model, API contract, and state-transition types
2. Architect prompt
3. Technical validator
4. TDD traceability
5. TDD assembler

### Milestone 3 — Production handoffs

1. Structured freelance briefs
2. Role separation
3. Dependency validation
4. Deliverables
5. Asset metadata
6. Visual prompt traceability

### Milestone 4 — Scope and pitch

1. Four scope-review prompts
2. Scope validation
3. Pitch claim grounding
4. Slide validation

### Milestone 5 — Orchestration

1. Replace empty unified-pipeline critique object
2. Require completed critique before standard generation
3. Pass structured stage outputs
4. Preserve chat and critique records
5. Add generation metadata

### Milestone 6 — Memory and persona restoration

1. Structured memory
2. Full transcript preservation
3. Concierge mode selection
4. Creative Brainstormer restoration
5. User Proxy restoration
6. Senior Technical Analyst risk critique
7. Synthesis restoration

### Milestone 7 — Rich package rendering

1. Chat and critique display
2. Rich Markdown HTML
3. Tables and code blocks
4. Images
5. Collapsible sections
6. Complete navigation

## First implementation slice — BDD Feature Contract v1

Likely files:

- `types.ts`
- `services/lmStudioService.ts`
- `services/pipelineOrchestrator.ts`
- `services/packageExporter.ts`
- `components/MVPFeatureSpecViewer.tsx`
- new focused validator/test utility, following existing project conventions

Deliverables:

1. Strong BDD schema
2. Prompt requiring real Given/When/Then scenarios
3. Scenario validation
4. Retry/repair on invalid output
5. TDD generation receiving validated feature specs
6. Export tests for BDD content
7. Space Marines fixture verification
8. Space Miner fixture verification

Acceptance criteria:

- Every generated MVP feature has a stable ID.
- Every feature has at least two scenarios.
- Every scenario has Given, When, and Then.
- At least one scenario is failure, edge, or boundary type.
- Scenarios contain project-specific entities.
- TDD output references the MVP feature ID.
- Generic placeholder fallback never counts as successful generation.
- Existing build and type checking remain clean.

## Maintenance rules

- Update this file only when the agreed architecture, baseline contract, or implementation roadmap changes.
- Use `persona_recall_latest_updates.md` for status, completed work, blockers, test results, and the resume point.
- Do not mark a task complete without validation evidence.