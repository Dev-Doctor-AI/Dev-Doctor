# MODEL_BEHAVIOUR inventory — Mistral local

Provider: LM Studio OpenAI-compatible API  
Model: `mistralai/mistral-7b-instruct-v0.3`  
Runtime configuration: LM Studio OpenAI-compatible API at `http://127.0.0.1:1234/v1/chat/completions`, `temperature: 0`, default probe `max_tokens: 256`, truncation probe `max_tokens: 8`  

Required controlled tests:

- context length;
- maximum reliable output;
- reasoning/thinking budget;
- empty-response behaviour;
- structured output / JSON schema;
- raw-text generation and local parsing;
- long-form continuation;
- instruction fidelity;
- repeatability.

Global-rule impact: NONE until evidence is recorded.

Completed sample report: `model-behaviour/mistral-local-2026-08-17T06-25-49-847Z.md`.