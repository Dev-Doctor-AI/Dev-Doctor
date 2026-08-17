# MODEL_BEHAVIOUR — nvidia/nemotron-3-nano-4b probe

Provider: LM Studio OpenAI-compatible API
Model: nvidia/nemotron-3-nano-4b
Runtime configuration:
- Endpoint: http://127.0.0.1:1234/v1/chat/completions
- max_tokens default: 256
- truncation probe max_tokens: 8
- temperature: 0
- Date: 2026-08-17T06:30:18.301Z

## Results

| Test | Status | Finish reason | Latency (ms) | Parse/observation |
| --- | --- | --- | ---: | --- |
| Instruction fidelity / exactly one question | error | none | 39 | 0 question mark(s) |
| Structured JSON | error | none | 10 | JSON parseable: false |
| Raw text parsing | error | none | 9 | Markdown-like response captured |
| Output limit / truncation | error | none | 8 | Content length: 0 |
| Repeatability (3 runs) | complete | n/a | n/a | Unique outputs: 1 |

## Observed behaviour

Instruction response:
```text

```

Structured response:
```text

```

Raw response:
```text

```

Truncation response:
```text

```

## Provider errors

None

## Operational decision

This probe records observations only. It does not promote capability values into the global workflow or model profile automatically. Review whether the sample is sufficient before changing capability-matrix.ts.

Global-rule impact: NONE.
