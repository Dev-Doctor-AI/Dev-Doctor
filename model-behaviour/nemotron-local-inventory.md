# MODEL_BEHAVIOUR inventory — Nemotron local

Provider: LM Studio OpenAI-compatible API  
Model: `nvidia/nemotron-3-nano-4b`  
Runtime configuration: `http://127.0.0.1:1234/v1/chat/completions`, temperature `0`, default probe `max_tokens: 256`, truncation probe `max_tokens: 8`  

Completed report: `model-behaviour/nvidia-nemotron-3-nano-4b-2026-08-17T06-30-18-301Z.md`

Observed result: all probes returned HTTP 400/compute errors and no visible assistant content. This is a runtime/configuration failure, not evidence that the model lacks the tested capabilities.

Required action before capability classification: correct the LM Studio model/runtime configuration and repeat the controlled probe.

Global-rule impact: NONE.