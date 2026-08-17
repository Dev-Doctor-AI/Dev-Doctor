# MODEL_BEHAVIOUR inventory — Qwen local

Provider: LM Studio OpenAI-compatible API  
Model: `qwen/qwen3.5-9b`  
Runtime configuration: `http://127.0.0.1:1234/v1/chat/completions`, temperature `0`, default probe `max_tokens: 1024`, truncation probe `max_tokens: 8`  

Completed report: `model-behaviour/qwen-qwen3-5-9b-2026-08-17T06-33-35-208Z.md`

Observed: reasoning content can consume the generation budget before visible content is returned. A small structured JSON task completed at 1024 tokens, while instruction/raw/repeatability samples exhausted reasoning.

Operational decision: keep Qwen-specific reasoning-exhaustion handling at the provider/execution boundary. Do not change global workflow rules or claim universal capability values.

Global-rule impact: NONE.