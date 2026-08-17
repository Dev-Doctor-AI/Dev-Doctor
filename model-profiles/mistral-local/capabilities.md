# Mistral local capability profile

Model: `mistralai/mistral-7b-instruct-v0.3`
Provider/runtime: LM Studio OpenAI-compatible API

## Observed

Evidence report: `model-behaviour/mistral-local-2026-08-17T06-25-49-847Z.md`

- At `temperature: 0`, the instruction-fidelity sample returned one question mark.
- The representative JSON sample was parseable without repair.
- The representative raw Markdown sample returned a heading and bullet points suitable for local parsing.
- With `max_tokens: 8`, LM Studio returned `finish_reason: length`; the runtime classified the response as `truncated`.
- Three identical repeatability probes produced one unique output.

These are task samples, not universal model limits. Context window, maximum reliable output, reasoning, vision, tool calling, and long-document reliability remain unknown.