import { attachmentPromptLines } from './attachment-service';
import type { ChatAttachment } from './types';

export type PromptTurn = {
  role: 'user' | 'buddy';
  text: string;
  attachments?: ChatAttachment[];
};

const MAX_HISTORY_TURNS = 12;

/**
 * Build the model prompt. Buddy's local context (quests, notes) is passed as plain text by the
 * caller; attachments are inlined as bounded text or labelled as not readable.
 */
export function buildBuddyPrompt(history: PromptTurn[], localContext: string[]): string {
  const turns = history.slice(-MAX_HISTORY_TURNS);
  const lines: string[] = [
    'You are Buddy, a warm and practical on-device assistant inside a personal growth app.',
    'Answer only from the provided context and the conversation. If something is not known, say so plainly.',
    'Keep answers short, concrete, and encouraging. Never invent facts about the user.',
  ];

  if (localContext.length) {
    lines.push('', 'Local context:', ...localContext.filter(Boolean));
  }

  lines.push('', 'Conversation:');
  for (const turn of turns) {
    const who = turn.role === 'user' ? 'User' : 'Buddy';
    lines.push(`${who}: ${turn.text.trim()}`);
    const attachmentLines = attachmentPromptLines(turn.attachments ?? []);
    for (const attachmentLine of attachmentLines) lines.push(`  ${attachmentLine}`);
  }

  lines.push('Buddy:');
  return lines.join('\n');
}

/** Image and audio parts are handed to the native model as files; everything else is text. */
export function mediaUrisFor(attachments: ChatAttachment[]): { imagePaths: string[]; audioPaths: string[] } {
  const usable = attachments.filter((attachment) => attachment.status === 'ready');
  return {
    imagePaths: usable.filter((attachment) => attachment.kind === 'image').map((attachment) => attachment.uri),
    audioPaths: usable.filter((attachment) => attachment.kind === 'audio').map((attachment) => attachment.uri),
  };
}
