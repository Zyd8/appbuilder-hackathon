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
  /** On-device GGUF file. */
  path: string;
  /** Public artifact, used for manual install and documented in the README. */
  url: string;
  /** Multimodal projector GGUF. Needed for image input; text works without it. */
  mmprojPath: string;
  mmprojUrl: string;
  /** Rough install size, so users can check free space first. */
  downloadGb: number;
  note: string;
};

/**
 * Device model directory. `llama.rn` accepts plain paths, so the catalog stores paths and
 * `chat-service` normalizes any `file://` prefix.
 */
const MODELS_DIR = '/sdcard/Android/data/com.appbuilder.buddylevelup/files/models';
const E2B_REPO = 'https://huggingface.co/unsloth/gemma-4-E2B-it-qat-mobile-GGUF/resolve/main';
const E4B_REPO = 'https://huggingface.co/unsloth/gemma-4-E4B-it-qat-mobile-GGUF/resolve/main';

export const DEFAULT_BUDDY_MODEL: BuddyModelId = 'gemma4-e2b';

export const BUDDY_MODELS: Record<BuddyModelId, BuddyModel> = {
  'gemma4-e2b': {
    id: 'gemma4-e2b',
    label: 'Gemma Default',
    sizeLabel: 'Gemma 4 E2B',
    path: `${MODELS_DIR}/gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf`,
    url: `${E2B_REPO}/gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf`,
    mmprojPath: `${MODELS_DIR}/gemma-4-E2B-mmproj-F16.gguf`,
    mmprojUrl: `${E2B_REPO}/mmproj-F16.gguf`,
    downloadGb: 3.2,
    note: 'Balanced on-device model. Fits most phones with about 4 GB free.',
  },
  'gemma4-e4b': {
    id: 'gemma4-e4b',
    label: 'Gemma Pro',
    sizeLabel: 'Gemma 4 E4B',
    path: `${MODELS_DIR}/gemma-4-E4B-it-qat-UD-Q2_K_XL.gguf`,
    url: `${E4B_REPO}/gemma-4-E4B-it-qat-UD-Q2_K_XL.gguf`,
    mmprojPath: `${MODELS_DIR}/gemma-4-E4B-mmproj-F16.gguf`,
    mmprojUrl: `${E4B_REPO}/mmproj-F16.gguf`,
    downloadGb: 4.2,
    note: 'Higher quality. Needs roughly 4.5 GB free and more memory.',
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

/**
 * The pinned Gemma 4 mmproj carries a vision projector, not an audio one, so audio files are
 * picked, stored, and labelled but never sent to the model. Do not claim audio inference
 * until a runtime and projector actually prove it.
 */
export const RUNTIME_SUPPORTS_AUDIO = false;
