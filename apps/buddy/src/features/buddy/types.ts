import { MODEL_CATALOG } from './model-catalog';
import { artifactFile, nativeModelPath } from './model-paths';

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

export const DEFAULT_BUDDY_MODEL: BuddyModelId = 'gemma4-e2b';

/** Compatibility projection for the Phase-1 screen; runtime uses the catalog directly. */
export const BUDDY_MODELS: Record<BuddyModelId, BuddyModel> = Object.fromEntries(
  Object.values(MODEL_CATALOG).map((entry) => [entry.id, {
    id: entry.id,
    label: entry.label,
    sizeLabel: entry.sizeLabel,
    get path() { return nativeModelPath(artifactFile(entry.model)); },
    url: entry.model.url,
    get mmprojPath() { return nativeModelPath(artifactFile(entry.projector)); },
    mmprojUrl: entry.projector.url,
    downloadGb: (entry.model.bytes + entry.projector.bytes) / 1e9,
    note: entry.note,
  }]),
) as Record<BuddyModelId, BuddyModel>;

export const BUDDY_MODEL_LIST: BuddyModel[] = [BUDDY_MODELS['gemma4-e2b'], BUDDY_MODELS['gemma4-e4b']];

export function buddyModel(id: BuddyModelId): BuddyModel {
  if (!Object.prototype.hasOwnProperty.call(BUDDY_MODELS, id)) throw new Error('Unknown model ID');
  return BUDDY_MODELS[id];
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
