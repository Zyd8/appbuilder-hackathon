import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import {
  ATTACHMENT_LIMITS,
  RUNTIME_SUPPORTS_AUDIO,
  isTextAttachment,
  type AttachmentKind,
  type ChatAttachment,
} from './types';

function kindForMime(mimeType: string | null): AttachmentKind {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('audio/')) return 'audio';
  return 'file';
}

function limitFor(kind: AttachmentKind): number {
  if (kind === 'image') return ATTACHMENT_LIMITS.imageBytes;
  if (kind === 'audio') return ATTACHMENT_LIMITS.audioBytes;
  return ATTACHMENT_LIMITS.fileBytes;
}

function localId(): string {
  return `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Pick up to `ATTACHMENT_LIMITS.maxPerMessage` files and validate them locally.
 * Nothing is uploaded; oversized or unreadable items are marked rather than dropped.
 */
export async function pickBuddyAttachments(): Promise<ChatAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'audio/*', 'text/*', 'application/json', 'text/csv', '*/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  const picked = result.assets.slice(0, ATTACHMENT_LIMITS.maxPerMessage);
  return Promise.all(picked.map(prepareAttachment));
}

async function prepareAttachment(asset: {
  name: string;
  uri: string;
  mimeType?: string | null;
  size?: number | null;
}): Promise<ChatAttachment> {
  const mimeType = asset.mimeType ?? null;
  const kind = kindForMime(mimeType);
  const base: ChatAttachment = {
    id: localId(),
    kind,
    name: asset.name,
    uri: asset.uri,
    mimeType,
    sizeBytes: asset.size ?? null,
    status: 'ready',
  };

  if (typeof base.sizeBytes === 'number' && base.sizeBytes > limitFor(kind)) {
    return { ...base, status: 'failed', error: `Too large. Limit is ${Math.round(limitFor(kind) / (1024 * 1024))} MB.` };
  }

  if (!isTextAttachment(mimeType)) {
    // Images pass to the model through the vision projector. Audio and other files stay
    // attached so nothing is lost, but they are labelled rather than silently dropped.
    if (kind === 'image') return base;
    if (kind === 'audio' && RUNTIME_SUPPORTS_AUDIO) return base;
    if (kind === 'audio') {
      return { ...base, status: 'unsupported', error: 'Audio input is not available in this build yet.' };
    }
    return { ...base, status: 'unsupported', error: 'This file type is not read by Buddy yet.' };
  }

  try {
    const file = new File(asset.uri);
    const text = await file.text();
    const trimmed = text.length > ATTACHMENT_LIMITS.maxExtractedChars ? text.slice(0, ATTACHMENT_LIMITS.maxExtractedChars) : text;
    return {
      ...base,
      sizeBytes: base.sizeBytes ?? text.length,
      extractedText: trimmed,
    };
  } catch {
    return { ...base, status: 'failed', error: 'Could not read this file.' };
  }
}

/** Build the model-visible attachment summary used by the prompt builder. */
export function attachmentPromptLines(attachments: ChatAttachment[]): string[] {
  return attachments.map((attachment) => {
    if (attachment.status === 'unsupported' || attachment.status === 'failed') {
      return `[${attachment.kind}] ${attachment.name} (not readable by the model: ${attachment.error ?? 'unsupported'})`;
    }
    if (attachment.extractedText) {
      return `File "${attachment.name}":\n${attachment.extractedText}`;
    }
    return `[${attachment.kind}] ${attachment.name}`;
  });
}
