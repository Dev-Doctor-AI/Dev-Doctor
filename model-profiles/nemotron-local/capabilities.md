# Nemotron local capability profile

Model: `nvidia/nemotron-3-nano-4b`
Provider/runtime: LM Studio OpenAI-compatible API

## Observed

Evidence report: `model-behaviour/nvidia-nemotron-3-nano-4b-2026-08-17T06-30-18-301Z.md`

- All controlled generation probes failed with HTTP 400 from the active LM Studio runtime.
- No assistant content or finish reason was obtained.
- No capability conclusion can be drawn for instruction following, JSON, raw parsing, truncation, reasoning, or repeatability.

Operational status: **runtime/configuration unavailable for capability testing**. Keep all capability values unknown until LM Studio can execute this model successfully.