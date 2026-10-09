export type BuddyModelId = 'gemma4-e2b' | 'gemma4-e4b';
export type AttachmentKind = 'file' | 'image' | 'audio';
export type AttachmentStatus = 'ready' | 'unsupported' | 'failed';

export type ChatAttachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  uri: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: AttachmentStatus;
  extractedText?: string;
  error?: string;
};

export type BuddyModel = {
  id: BuddyModelId;
  /** User-facing name. */
  label: string;
  /** Developer-facing size tag. */
  sizeLabel: string;
  /** On-device LiteRT-LM artifact. */
  path: string;
  note: string;
};

export const DEFAULT_BUDDY_MODEL: BuddyModelId = 'gemma4-e2b';

export const BUDDY_MODELS: Record<BuddyModelId, BuddyModel> = {
  'gemma4-e2b': {
    id: 'gemma4-e2b',
    label: 'Gemma Default',
    sizeLabel: 'Gemma 4 E2B',
    path: 'file:///sdcard/Android/data/com.anonymous.buddy/files/models/Gemma4-E2B-it.litertlm',
    note: 'Balanced on-device model for most phones.',
  },
  'gemma4-e4b': {
    id: 'gemma4-e4b',
    label: 'Gemma Pro',
    sizeLabel: 'Gemma 4 E4B',
    path: 'file:///sdcard/Android/data/com.anonymous.buddy/files/models/Gemma4-E4B-it.litertlm',
    note: 'Higher quality; needs more memory and a stronger device.',
  },
};

export const BUDDY_MODEL_LIST: BuddyModel[] = [BUDDY_MODELS['gemma4-e2b'], BUDDY_MODELS['gemma4-e4b']];

export function buddyModel(id: BuddyModelId): BuddyModel {
  return BUDDY_MODELS[id] ?? BUDDY_MODELS[DEFAULT_BUDDY_MODEL];
}

/** First-slice attachment limits. Rejected before anything is read or sent. */
export const ATTACHMENT_LIMITS = {
  maxPerMessage: 3,
  maxExtractedChars: 100_000,
  imageBytes: 10 * 1024 * 1024,
  audioBytes: 25 * 1024 * 1024,
  fileBytes: 10 * 1024 * 1024,
} as const;

/** Locally extractable text formats. Everything else is attachable but not model input. */
export const TEXT_ATTACHMENT_MIME_TYPES = ['text/plain', 'text/markdown', 'application/json', 'text/csv', 'text/x-markdown'] as const;

export function isTextAttachment(mimeType: string | null): boolean {
  return Boolean(mimeType) && (TEXT_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType as string);
}
