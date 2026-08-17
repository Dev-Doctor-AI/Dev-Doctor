# Qwen local execution strategy

Observed runtime behaviour requires a model-specific strategy:

- Preserve and inspect `reasoning_content` and finish status.
- Treat empty visible content plus reasoning content as `reasoning_exhausted`, not a valid empty artifact.
- Prefer direct, bounded task prompts when visible output is required.
- Use a task-specific reasoning/output budget rather than applying a global limit.
- Structured JSON succeeded in one small sample at `max_tokens: 1024`; production schema reliability remains unverified.
- Do not route long-form document work here until longer controlled tests establish a reliable operating range.

Global workflow/persona rules: unchanged.