import type { BuddyModelId } from './types';

export interface ModelArtifact {
  filename: string;
  url: string;
  bytes: number;
  sha256: string;
}

export interface ModelCatalogEntry {
  id: BuddyModelId;
  label: string;
  sizeLabel: string;
  note: string;
  source: string;
  license: 'apache-2.0';
  revision: string;
  contextTokens: number;
  platform: 'android-arm64-ios';
  model: ModelArtifact;
  projector: ModelArtifact;
}

/** Artifact metadata from Hugging Face LFS API, pinned to the observed repository revision. */
export const MODEL_CATALOG: Record<BuddyModelId, ModelCatalogEntry> = {
  'gemma4-e2b': {
    id: 'gemma4-e2b', label: 'Gemma Default', sizeLabel: 'Gemma 4 E2B',
    note: 'Balanced on-device model. Requires about 3.2 GB for model and projector.',
    source: 'unsloth/gemma-4-E2B-it-qat-mobile-GGUF', license: 'apache-2.0',
    revision: '46af839dc23aceb4b965ab640dae7fc1bea39bba', contextTokens: 4096,
    platform: 'android-arm64-ios',
    model: { filename: 'gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf', bytes: 2186186784, sha256: '0a5bbc20f91f92da96ab4870fa71b356c45b8500a7b8b9c3e0eb48359b72da28', url: 'https://huggingface.co/unsloth/gemma-4-E2B-it-qat-mobile-GGUF/resolve/46af839dc23aceb4b965ab640dae7fc1bea39bba/gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf' },
    projector: { filename: 'gemma-4-E2B-mmproj-F16.gguf', bytes: 985654080, sha256: '13c8966d1635d02e6727f27402880614906fa291850c07feda18dbcddf2291b6', url: 'https://huggingface.co/unsloth/gemma-4-E2B-it-qat-mobile-GGUF/resolve/46af839dc23aceb4b965ab640dae7fc1bea39bba/mmproj-F16.gguf' },
  },
  'gemma4-e4b': {
    id: 'gemma4-e4b', label: 'Gemma Pro', sizeLabel: 'Gemma 4 E4B',
    note: 'Higher quality. Requires about 4.3 GB for model and projector.',
    source: 'unsloth/gemma-4-E4B-it-qat-mobile-GGUF', license: 'apache-2.0',
    revision: '6a6e7121b977cefd85daa8fbc538fa485e7e8b1b', contextTokens: 4096,
    platform: 'android-arm64-ios',
    model: { filename: 'gemma-4-E4B-it-qat-UD-Q2_K_XL.gguf', bytes: 3219532192, sha256: '79dde517866cfbb5c00230b530de17910fc7fc78f8827554d0e14281ce5faf03', url: 'https://huggingface.co/unsloth/gemma-4-E4B-it-qat-mobile-GGUF/resolve/6a6e7121b977cefd85daa8fbc538fa485e7e8b1b/gemma-4-E4B-it-qat-UD-Q2_K_XL.gguf' },
    projector: { filename: 'gemma-4-E4B-mmproj-F16.gguf', bytes: 990372672, sha256: '6a255159ee4b01b304f633a57f017dd7d5a69d30fff52abb2614bf0813cef034', url: 'https://huggingface.co/unsloth/gemma-4-E4B-it-qat-mobile-GGUF/resolve/6a6e7121b977cefd85daa8fbc538fa485e7e8b1b/mmproj-F16.gguf' },
  },
};

export function catalogEntry(id: string): ModelCatalogEntry {
  if (!Object.prototype.hasOwnProperty.call(MODEL_CATALOG, id)) throw new Error('Unknown model ID');
  return MODEL_CATALOG[id as BuddyModelId];
}
