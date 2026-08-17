# Mistral local execution strategy

No model-specific workaround is approved yet. Until controlled tests provide evidence:

- retain existing task contracts and local validation;
- do not globally reduce context or output limits;
- treat malformed, empty, or incomplete responses as failures;
- record observed behaviour before changing structured-output or continuation strategy.

Observed probe guidance:

- Raw text plus local parsing is viable for the tested short Markdown response.
- Structured JSON succeeded in the tested small response, but schema reliability at production complexity is not established.
- Always inspect finish status; a short output budget produced a confirmed truncated response.
- Do not treat the repeatability result as proof of general determinism; it covered one fixed prompt at temperature zero.