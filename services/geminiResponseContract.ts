export type GeminiResponsePart = { text?: string; thought?: boolean };

/** Select the JSON answer when Gemini mixes thinking and visible text parts. */
export const extractGeminiResponseText = (
  parts: GeminiResponsePart[],
  structuredOutput = false,
): string => {
  const textParts = parts.map(part => ({ text: part.text || '', thought: part.thought === true })).filter(part => part.text);
  const texts = textParts.map(part => part.text);
  if (!structuredOutput) return textParts.filter(part => !part.thought).map(part => part.text).join('').trim() || texts.join('').trim();

  const nonThought = textParts.filter(part => !part.thought).map(part => part.text).join('').trim();
  const allText = texts.join('').trim();
  const jsonLike = (text: string): boolean => {
    const trimmed = text.replace(/^```(?:json)?\s*/i, '').trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[') || /[\[{][\s\S]*[\]}]/.test(trimmed);
  };
  if (jsonLike(nonThought)) return nonThought;
  const jsonPart = textParts.find(part => jsonLike(part.text));
  if (jsonPart) return jsonPart.text.trim();
  if (jsonLike(allText)) return allText;
  return nonThought || allText;
};