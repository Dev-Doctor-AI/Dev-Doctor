# Local Model Runtime Guidance

This document records operational subtleties for local OpenAI-compatible model
runtimes, especially LM Studio. It is intentionally model-agnostic: observations
about one loaded model must not become global workflow assumptions.

## Local endpoint and browser path

- Default LM Studio server: `http://127.0.0.1:1234`.
- Chat endpoint: `/v1/chat/completions`.
- The browser normally uses the repository CORS proxy at
  `http://127.0.0.1:1235/v1/chat/completions`.
- Verify availability and loaded models before starting a real-inference run:

```bash
curl -s http://127.0.0.1:1234/v1/models
```

- A model appearing in `/v1/models` is not sufficient evidence that it can be
  loaded or that it can handle the requested workload. Run a small direct probe
  before a long E2E test.

## Context and memory management

- Context size is primarily a local runtime/model-load setting, not a promise
  that every request should consume the entire available window.
- Choose the smallest context that fits the machine and the test objective.
- Keep persona/helper requests bounded. The application uses compact recent
  conversation context for interactive assistance while preserving the full
  transcript for document generation and persistence.
- Use task-specific output budgets. Large `max_tokens` values can cause a local
  runtime to reject a request or spend the entire generation budget on hidden
  reasoning before visible content is returned.
- If a model is too large for the machine, reduce its context in the local
  runtime settings before changing application validation or routing logic.

## Structured output compatibility

- Do not assume that an OpenAI-compatible local endpoint supports
  `response_format: { type: "json_schema", ... }` for every model.
- The application intentionally omits transport-level JSON Schema hints for
  LM Studio models.
- Prompt-level JSON instructions, response extraction, normalization, repair,
  and strict local validation remain active and are the contract boundary.
- A direct JSON response probe may pass while a large schema request fails;
  test both the transport and the actual task shape when qualifying a model.

## Reasoning and visible output

- Some local models expose reasoning metadata or consume output budget on
  reasoning before producing visible content.
- `finish_reason: stop` does not by itself prove that the returned content is
  structurally valid; parse and validate it.
- Empty visible content, truncated content, malformed JSON, and HTTP errors are
  distinct outcomes and should be recorded separately.

## Resource and loading failures

- A model can be listed but still fail to load because LM Studio guardrails
  detect insufficient system resources.
- Treat model-load failure as an environment/runtime issue, not as evidence
  that the model lacks a capability.
- Do not silently fall back to another model in a contract test. Select the
  model explicitly, record the model ID, and rerun after the runtime is fixed.

## Qualification probe

Use a small probe before a long run, replacing `MODEL_ID` with the exact loaded
model ID:

```bash
MODEL_ID='model/name'
python3 - <<'PY'
import json, os, urllib.request

payload = {
    'model': os.environ['MODEL_ID'],
    'messages': [
        {'role': 'system', 'content': 'Return concise JSON only.'},
        {'role': 'user', 'content': 'Return {"ok":true}.'},
    ],
    'temperature': 0,
    'max_tokens': 64,
}
request = urllib.request.Request(
    'http://127.0.0.1:1234/v1/chat/completions',
    data=json.dumps(payload).encode(),
    headers={'Content-Type': 'application/json'},
)
with urllib.request.urlopen(request, timeout=120) as response:
    print(response.read().decode())
PY
```

Then qualify the real operation with a bounded request. A successful tiny probe
does not establish long-document reliability, schema reliability, reasoning
reliability, or E2E suitability.

## E2E model selection

The Number Quest visible runner accepts an explicit model override:

```bash
NUMBER_QUEST_MODEL=mistral \
NUMBER_QUEST_MODEL_ID='model/name' \
npm run run:visible-number-quest
```

If the command is not available in `package.json`, run the script directly:

```bash
NUMBER_QUEST_MODEL=mistral \
NUMBER_QUEST_MODEL_ID='model/name' \
node scripts/run-visible-number-quest-e2e.mjs
```

The runner must use the real Concierge transcript, follow the latest Concierge
question, and record the selected model and runtime evidence. It must not use
hard-coded answers for model-generated questions.

## Current evidence notes

These are runtime observations, not universal model capabilities:

- `qwen/qwen3.8-27b` succeeded in LM Studio with an approximately 50k context
  configuration and bounded output, but transport-level JSON Schema was
  rejected.
- `qwen/qwen3.5-9b` is present in the model list but, at the time of the latest
  probe, LM Studio refused to load it because of insufficient system resources.
- `mistralai/mistral-7b-instruct-v0.3` has completed some local tasks but showed
  weaker reliability on long structured feature-spec generation.

Re-run controlled probes after changing the loaded model, context, quantization,
GPU offload, or LM Studio version. Update model-specific profiles with evidence;
keep this document limited to reusable runtime behavior.