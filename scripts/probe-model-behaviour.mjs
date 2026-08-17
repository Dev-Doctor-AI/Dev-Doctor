import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = process.env.LM_PROBE_ENDPOINT || 'http://127.0.0.1:1234/v1/chat/completions';
const model = process.env.LM_PROBE_MODEL || 'mistralai/mistral-7b-instruct-v0.3';
const outputTokens = Number(process.env.LM_PROBE_OUTPUT_TOKENS || 256);
const temperature = Number(process.env.LM_PROBE_TEMPERATURE || 0);
const date = new Date().toISOString();

const request = async (name, system, user, maxTokens = outputTokens) => {
  const started = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature, stream: false }),
  });
  const payload = await response.json();
  const choice = payload.choices?.[0];
  const content = choice?.message?.content || '';
  const reasoningContent = choice?.message?.reasoning_content || '';
  const errorMessage = payload.error?.message || payload.message || null;
  return {
    name,
    status: response.ok ? (content ? (choice?.finish_reason === 'length' ? 'truncated' : 'complete') : (reasoningContent || choice?.finish_reason === 'length' ? 'reasoning_exhausted' : 'empty')) : 'error',
    finishReason: choice?.finish_reason || null,
    latencyMs: Date.now() - started,
    content,
    reasoningContent,
    jsonParseable: (() => { try { JSON.parse(content); return true; } catch { return false; } })(),
    httpStatus: response.status,
    errorMessage,
  };
};

const results = [];
results.push(await request(
  'instruction-fidelity-one-question',
  'Follow the instruction exactly.',
  'Summarize this project in one short sentence and ask exactly one follow-up question: Garden Quest is an offline family gardening game for tablets.',
));
results.push(await request(
  'structured-json',
  'Return JSON only. No Markdown fences or commentary.',
  'Return exactly this shape with project-specific values: {"name":"...","platform":"...","offline":true}. Project: Garden Quest, a tablet game that works offline.',
));
results.push(await request(
  'raw-text-parsing',
  'Return a short Markdown response with one heading and two bullet points.',
  'Describe the Garden Quest core loop.',
));
results.push(await request(
  'output-limit-truncation',
  'Write a long numbered list. Continue until the output limit stops you.',
  'List 100 distinct implementation considerations for an offline family tablet gardening game.',
  8,
));
for (let index = 1; index <= 3; index += 1) {
  results.push(await request(
    `repeatability-${index}`,
    'Answer with exactly: Garden Quest is ready.',
    'Repeat the required answer and nothing else.',
    32,
  ));
}

const instruction = results.find(result => result.name === 'instruction-fidelity-one-question');
const structured = results.find(result => result.name === 'structured-json');
const raw = results.find(result => result.name === 'raw-text-parsing');
const truncation = results.find(result => result.name === 'output-limit-truncation');
const repeats = results.filter(result => result.name.startsWith('repeatability-')).map(result => result.content.trim());
const questionCount = (instruction?.content.match(/\?/g) || []).length;
const repeatResults = results.filter(result => result.name.startsWith('repeatability-'));
const repeatable = repeatResults.every(result => result.status === 'complete') && new Set(repeats).size === 1;

const modelSlug = model.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
const report = `# MODEL_BEHAVIOUR — ${model} probe

Provider: LM Studio OpenAI-compatible API
Model: ${model}
Runtime configuration:
- Endpoint: ${endpoint}
- max_tokens default: ${outputTokens}
- truncation probe max_tokens: 8
- temperature: ${temperature}
- Date: ${date}

## Results

| Test | Status | Finish reason | Latency (ms) | Parse/observation |
| --- | --- | --- | ---: | --- |
| Instruction fidelity / exactly one question | ${instruction?.status} | ${instruction?.finishReason || 'none'} | ${instruction?.latencyMs} | ${questionCount} question mark(s) |
| Structured JSON | ${structured?.status} | ${structured?.finishReason || 'none'} | ${structured?.latencyMs} | JSON parseable: ${structured?.jsonParseable} |
| Raw text parsing | ${raw?.status} | ${raw?.finishReason || 'none'} | ${raw?.latencyMs} | Markdown-like response captured |
| Output limit / truncation | ${truncation?.status} | ${truncation?.finishReason || 'none'} | ${truncation?.latencyMs} | Content length: ${truncation?.content.length} |
| Repeatability (3 runs) | ${repeatable ? 'complete' : 'mixed'} | n/a | n/a | Unique outputs: ${new Set(repeats).size} |

## Observed behaviour

Instruction response:
\`\`\`text
${instruction?.content || ''}
\`\`\`

Structured response:
\`\`\`text
${structured?.content || ''}
\`\`\`

Raw response:
\`\`\`text
${raw?.content || ''}
\`\`\`

Truncation response:
\`\`\`text
${truncation?.content || ''}
\`\`\`

## Provider errors

${[...new Set(results.map(result => result.errorMessage).filter(Boolean))].join('\n') || 'None'}

## Reasoning observations

${results.filter(result => result.reasoningContent).map(result => `- ${result.name}: ${result.reasoningContent.length} reasoning characters were returned; visible content length was ${result.content.length}.`).join('\n') || 'No reasoning content field was returned.'}

## Operational decision

This probe records observations only. It does not promote capability values into the global workflow or model profile automatically. Review whether the sample is sufficient before changing capability-matrix.ts.

Global-rule impact: NONE.
`;

await mkdir('model-behaviour', { recursive: true });
const outputPath = `model-behaviour/${modelSlug}-${date.replace(/[:.]/g, '-')}.md`;
await writeFile(outputPath, report);
console.log(JSON.stringify({ outputPath, model, results: results.map(({ name, status, finishReason, latencyMs, jsonParseable, httpStatus, errorMessage, reasoningContent }) => ({ name, status, finishReason, latencyMs, jsonParseable, httpStatus, errorMessage, reasoningCharacters: reasoningContent.length })) }, null, 2));