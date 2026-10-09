import type { AIEngineOutput } from './contracts/ai-engine';

export type NormalizedModelOutput = { ok: true; answer: string } | { ok: false; reason: 'tool-call' | 'empty' | 'malformed' };
const SPEAKER = /^(?:Buddy|Assistant)\s*:\s*/i;

function removeToolObjects(text: string): string {
  let output = '';
  for (let start = 0; start < text.length;) {
    if (text[start] !== '{') { output += text[start++]; continue; }
    let depth = 0; let quoted = false; let escape = false; let end = start;
    for (; end < text.length; end++) {
      const char = text[end];
      if (escape) { escape = false; continue; }
      if (char === '\\' && quoted) { escape = true; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (!quoted && char === '{') depth++;
      if (!quoted && char === '}' && --depth === 0) { end++; break; }
    }
    const objectText = text.slice(start, end);
    let tool = false;
    try {
      const value = JSON.parse(objectText) as Record<string, unknown>;
      tool = Boolean(value && typeof value === 'object' && ('toolCall' in value || 'tool_call' in value || 'function' in value || ('name' in value && 'arguments' in value)));
    } catch { /* Keep ordinary prose braces for later validation. */ }
    output += tool ? '' : objectText;
    start = end;
  }
  return output;
}

/** Fail closed when final output is ambiguous; never show model protocol or reasoning. */
export function normalizeAssistantOutput(output: AIEngineOutput | string, echoedPrompt?: string): NormalizedModelOutput {
  if (typeof output !== 'string' && output.kind === 'toolCall') return { ok: false, reason: 'tool-call' };
  if (typeof output !== 'string' && (output.kind !== 'final' || typeof output.text !== 'string' || 'toolCall' in output)) return { ok: false, reason: 'malformed' };
  let text = typeof output === 'string' ? output : output.text;
  if (echoedPrompt && text.startsWith(echoedPrompt)) text = text.slice(echoedPrompt.length);
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/gi, '');
  text = text.replace(/^(?:\s*(?:System|User)\s*:[^\n]*\n)+/gi, '');
  text = removeToolObjects(text);
  text = text.replace(/```(?:json)?\s*```/gi, '').trim();
  while (SPEAKER.test(text)) text = text.replace(SPEAKER, '').trimStart();
  if (!text || /^[\s`{}\[\]]*$/.test(text)) return { ok: false, reason: 'empty' };
  if (/<\/?think\b|"(?:toolCall|tool_call)"\s*:|\b(?:System|User)\s*:/i.test(text)) return { ok: false, reason: 'malformed' };
  return { ok: true, answer: text };
}
