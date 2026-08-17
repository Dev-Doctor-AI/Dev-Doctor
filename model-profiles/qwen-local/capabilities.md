# Qwen local capability profile

Model: `qwen/qwen3.5-9b`
Provider/runtime: LM Studio OpenAI-compatible API

Evidence report: `model-behaviour/qwen-qwen3-5-9b-2026-08-17T06-33-35-208Z.md`

## Observed

- LM Studio returns a `reasoning_content` field for this model.
- At `max_tokens: 256`, the visible response was empty while `finish_reason` was `length`; this is classified as `reasoning_exhausted` when reasoning content is present.
- At `max_tokens: 1024`, the small structured JSON sample completed and parsed successfully.
- The instruction-fidelity and raw-text samples still exhausted reasoning at `max_tokens: 1024`.
- The tested repeatability prompts exhausted reasoning rather than producing visible output.

Context window, maximum reliable output, long-document reliability, tool calling, vision, and production-scale structured-output reliability remain unknown.