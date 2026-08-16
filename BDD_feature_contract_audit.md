# BDD Feature Contract v1 — Compatibility Audit

**Task:** P1.1

## Scope audited

- `types.ts`
- `services/lmStudioService.ts`
- `services/pipelineOrchestrator.ts`
- `App.tsx`
- `components/MVPFeatureSpecViewer.tsx`
- `components/TDDViewer.tsx`
- `services/packageExporter.ts`
- provider-specific Space Marines and Space Miner package fixtures
- current test commands in `package.json`

## Current data flow

```text
MVPDefinition.inScope: string[]
  → generateMVPFeatureSpec(feature, projectName, mvp)
  → MVPFeatureSpec
  → persisted as mvpFeatureSpecs
  → rendered by MVPFeatureSpecViewer
  → exported in JSON / Markdown / TXT

MVPFeatureSpec.userStory + MVPFeatureSpec.technicalNotes
  → lossy conversion to legacy TDDFeature
  → generateTechnicalDesignDocument(expandedText, TDDFeature[])
  → TechnicalDesignSection[]
```

## Current compatibility surface

### Existing BDD model

`BDDScenario` already has `given`, `when`, and `then` arrays. `MVPFeatureSpec` already has an `id`, feature name, user story, scenarios, invalid inputs, boundary conditions, offline behavior, accessibility, technical notes, and dependencies.

This is a safe additive foundation. Existing saved sessions and exported packages may omit any newly introduced optional fields, so all readers must tolerate absent values.

### Existing parser behavior

`generateMVPFeatureSpec` has a local parser. It currently requires:

- non-empty ID, feature, user story, technical notes;
- at least one scenario;
- each retained scenario has non-empty Given, When, and Then arrays.

It currently does **not** require:

- two or more scenarios;
- happy, failure/invalid, boundary, edge, or offline scenario categories;
- title or stable scenario ID;
- project-specific entities or measurable outcomes;
- non-generic failure text;
- traceable technical dependencies.

The parser also silently drops invalid scenario entries, which can convert a multi-scenario model response into one accepted scenario.

### Current example evidence

Gemini 3.7 Space Marines provides rich, measurable BDD output: named state machine phases, player counts, timers, distances, failure states, and observable results.

Mistral Space Miner also passes the current parser but includes weak generic content such as “An appropriate error message is displayed” and “Minimum and maximum sizes for planets and terrain features.” This confirms that structural non-emptiness alone is insufficient.

### Viewer compatibility

`MVPFeatureSpecViewer` renders all existing fields safely and supports absent optional fields. It uses `f.id` as a React key, but does not display the ID, scenario ID, scenario type, acceptance criteria, failure states, telemetry, security considerations, or performance targets.

Additive fields can be introduced without breaking legacy feature specs. New fields should render only when present.

### Export compatibility

`packageExporter.ts` exports BDD fields to Markdown and TXT, but uses `any` for feature-spec iteration. It can safely render additive fields conditionally. HTML currently wraps escaped Markdown in `<pre>`; richer HTML rendering is intentionally deferred to Milestone 7.

### Legacy TDD bridge

`TDDFeature` still permits either arrays or strings for `userStories` and `technicalSpecs`. Both the unified pipeline and `App.tsx` currently derive TDD content from:

```ts
{ feature: featureSpec.feature, userStories: featureSpec.userStory, technicalSpecs: featureSpec.technicalNotes }
```

This loses the feature ID, BDD scenarios, invalid inputs, boundaries, offline behavior, accessibility, and dependencies before the final TDD assembly.

Do not replace the legacy type in P1.2. Keep it for backward compatibility. P1.2 should add `featureId?: string` and traceability-compatible optional fields where needed; the full structured technical specification migration belongs to Milestone 2.

### Pipeline and UI compatibility

- `App.tsx` already generates feature specifications sequentially.
- `pipelineOrchestrator.ts` already generates feature specifications sequentially.
- Both need validation gates in P1.6, not P1.2.
- `mvpFeatureSpecs` is persisted separately from `tddContent`, so feature-spec migration can be introduced independently of final TDD migration.

### Test infrastructure

No unit-test framework is installed. Available checks are:

- `npm run lint` (`tsc --noEmit`)
- `npm run build`
- `npm run test:e2e` (Playwright/manual sequential E2E with runtime dependency)

For Milestone 1, add a focused Node assertion script using Node built-ins and deterministic fixture objects. Do not introduce a new test framework unless later requirements justify it.

## Backward-compatible P1.2 change design

### Type changes

Additive only:

```ts
export type BDDScenarioType = 'happy-path' | 'edge-case' | 'failure' | 'boundary' | 'offline';

export interface BDDScenario {
  id?: string;
  type?: BDDScenarioType;
  title?: string;
  given: string[];
  when: string[];
  then: string[];
  notes?: string;
}

export interface MVPFeatureSpec {
  // Retain all current fields.
  acceptanceCriteria?: string[];
  failureStates?: string[];
  telemetry?: string[];
  securityConsiderations?: string[];
  performanceTargets?: string[];
}

export interface TDDFeature {
  // Retain current fields and unions.
  featureId?: string;
}
```

Do not make newly introduced fields required in TypeScript until parser validation, migration behavior, fixtures, and exporters are complete.

### Parser changes for P1.3–P1.5

Move feature-spec parsing/normalization and validation out of the local `generateMVPFeatureSpec` closure into a focused utility. The utility should:

1. Normalize optional scenario IDs/types.
2. Preserve all valid scenarios and return warnings for dropped scenarios.
3. Enforce the stronger contract only after the prompt and repair path are implemented.
4. Detect obvious filler phrases in outcomes and technical fields.
5. Ensure at least two valid scenarios and at least one non-happy-path category after P1.4.
6. Return validation errors separately from JSON parse errors so repair prompts can target the issue.

### Prompt migration for P1.4

Keep JSON-only output. Require:

- stable kebab-case feature ID;
- one user story;
- at least two scenarios;
- explicit scenario `type` values;
- Given/When/Then arrays with concrete project entities;
- one failure, boundary, edge, invalid-state, or offline scenario;
- measurable observable Then outcomes where the project provides constraints;
- project-specific invalid inputs, boundaries, accessibility, offline behavior, dependencies, and technical notes.

Include a formatting-only Gherkin example. Do not include Space Marines-specific requirements as required content.

### Viewer/export migration for P1.7

Display optional scenario type and ID when present. Add conditional sections for acceptance criteria, failure states, telemetry, security considerations, and performance targets. Preserve current layout for legacy feature specs with no additive fields.

### TDD handoff migration boundary

P1.2 should preserve traceability by placing `featureId` onto the legacy `TDDFeature` bridge. P1.6 should ensure only validated feature specs enter the bridge. Full transfer of BDD scenarios, data models, APIs, and transitions into TDD assembly is deferred to Milestone 2.

### Fixture/test approach for P1.8

Create deterministic fixtures, not exact model snapshots:

1. Valid Space Marines-like spec with named entities, measurable limits, happy + failure/boundary scenarios.
2. Invalid Space Miner-like generic spec containing “appropriate error message” and vague unbounded conditions.
3. Legacy saved spec without new optional fields.
4. Duplicate feature/scenario identifier case.
5. Missing Given/When/Then case.

The first test script should verify normalization/validation behavior only. Export render checks can be added after P1.7.

## P1.2 implementation boundary

P1.2 changes only type contracts and backwards-compatible bridge IDs. It must not:

- rewrite prompts;
- reject existing generated packages;
- alter pipeline control flow;
- change the final TDD architecture;
- introduce rich HTML rendering;
- alter critique, memory, or Concierge behavior.

## Acceptance criteria for completing P1.1

- Current data flow documented.
- Existing structural strengths and gaps identified.
- Provider-output evidence recorded without treating one model output as the required text.
- Additive type migration defined.
- Parser/validation, prompt, repair, viewer/export, TDD, and test boundaries identified.
- P1.2 can begin without unresolved compatibility decisions.