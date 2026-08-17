# Provider/model limit audit

This is an inventory, not permission to change values globally.

| Location/value | Current classification | Decision |
| --- | --- | --- |
| `services/lmStudioService.ts`: `PERSONA_CONTEXT_LIMIT = 8_000` | UI/service context-selection default | Keep for now; audit against task context requirements |
| `services/lmStudioService.ts`: request default `maxTokens = 4096` | UI/service generation default | Keep for compatibility; move behind execution resolution later |
| Task budgets `1024`, `2048`, `4096` in `lmStudioService.ts` | Task-specific request values | Preserve until per-task capability tests exist |
| `services/aiProvider.ts`: local timeout `360_000` | Provider/runtime timeout | Provider limit, not persona behaviour |
| Structured-output schemas | Contract requirement | Keep migrated validation; model strategy may select raw parsing later |

No value in this audit is currently classified as a proven global product rule.

Runtime status handling is now provider-visible where supported: OpenAI-compatible `finish_reason: length` is classified as `truncated`, empty visible content as `empty`, and normal content as `complete`. Reasoning exhaustion remains unknown unless the active provider exposes evidence for it.