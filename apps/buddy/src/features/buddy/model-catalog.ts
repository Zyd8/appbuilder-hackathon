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
  /**
   * Retired entries stay in the catalog so an existing selection still resolves, but the UI
   * offers them disabled. Nothing is deleted, so a device that still has the file works.
   */
  retired?: boolean;
  model: ModelArtifact;
  /**
   * Multimodal projector. Only models that can read images ship one; text-only models omit it,
   * and the UI hides the attachment controls for them.
   */
  projector?: ModelArtifact;
}

/** Artifact metadata from the Hugging Face LFS pointer, pinned to the observed repository revision. */
export const MODEL_CATALOG: Record<BuddyModelId, ModelCatalogEntry> = {
  'qwen35-0.8b': {
    id: 'qwen35-0.8b', label: 'Qwen3.5 0.8B', sizeLabel: 'Qwen3.5 0.8B Q4',
    note: 'Default. Smallest and quickest to run, so replies come back fastest.',
    source: 'unsloth/Qwen3.5-0.8B-GGUF', license: 'apache-2.0',
    revision: '6ab461498e2023f6e3c1baea90a8f0fe38ab64d0', contextTokens: 4096,
    platform: 'android-arm64-ios',
    model: { filename: 'Qwen3.5-0.8B-Q4_K_M.gguf', bytes: 532517120, sha256: 'bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517', url: 'https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/6ab461498e2023f6e3c1baea90a8f0fe38ab64d0/Qwen3.5-0.8B-Q4_K_M.gguf' },
    projector: { filename: 'mmproj-F16.gguf', bytes: 204987232, sha256: '56e4c6cfe73b0c82e3e82bc518d7591997e61d81f723fc41a586f4fa69ea2453', url: 'https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/6ab461498e2023f6e3c1baea90a8f0fe38ab64d0/mmproj-F16.gguf' },
  },
  'qwen3-1.7b': {
    id: 'qwen3-1.7b', label: 'Qwen 1.7B', sizeLabel: 'Qwen3 1.7B Q4',
    note: 'Larger text-only model. Better wording, but roughly twice the wait per reply.',
    source: 'unsloth/Qwen3-1.7B-GGUF', license: 'apache-2.0',
    revision: 'd7f544eead698dbd1f15126ef60b45a1e1933222', contextTokens: 4096,
    platform: 'android-arm64-ios',
    model: { filename: 'Qwen3-1.7B-Q4_K_M.gguf', bytes: 1107409472, sha256: 'b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897', url: 'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/d7f544eead698dbd1f15126ef60b45a1e1933222/Qwen3-1.7B-Q4_K_M.gguf' },
  },
  'gemma4-e2b': {
    id: 'gemma4-e2b', label: 'Gemma Default', sizeLabel: 'Gemma 4 E2B',
    note: 'Retired: too slow on this device. Kept only so an existing install still loads.',
    source: 'unsloth/gemma-4-E2B-it-qat-mobile-GGUF', license: 'apache-2.0',
    revision: '46af839dc23aceb4b965ab640dae7fc1bea39bba', contextTokens: 4096,
    platform: 'android-arm64-ios', retired: true,
    model: { filename: 'gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf', bytes: 2186186784, sha256: '0a5bbc20f91f92da96ab4870fa71b356c45b8500a7b8b9c3e0eb48359b72da28', url: 'https://huggingface.co/unsloth/gemma-4-E2B-it-qat-mobile-GGUF/resolve/46af839dc23aceb4b965ab640dae7fc1bea39bba/gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf' },
    projector: { filename: 'gemma-4-E2B-mmproj-F16.gguf', bytes: 985654080, sha256: '13c8966d1635d02e6727f27402880614906fa291850c07feda18dbcddf2291b6', url: 'https://huggingface.co/unsloth/gemma-4-E2B-it-qat-mobile-GGUF/resolve/46af839dc23aceb4b965ab640dae7fc1bea39bba/mmproj-F16.gguf' },
  },
  'gemma4-e4b': {
    id: 'gemma4-e4b', label: 'Gemma Pro', sizeLabel: 'Gemma 4 E4B',
    note: 'Retired: too slow on this device. Kept only so an existing install still loads.',
    source: 'unsloth/gemma-4-E4B-it-qat-mobile-GGUF', license: 'apache-2.0',
    revision: '6a6e7121b977cefd85daa8fbc538fa485e7e8b1b', contextTokens: 4096,
    platform: 'android-arm64-ios', retired: true,
    model: { filename: 'gemma-4-E4B-it-qat-UD-Q2_K_XL.gguf', bytes: 3219532192, sha256: '79dde517866cfbb5c00230b530de17910fc7fc78f8827554d0e14281ce5faf03', url: 'https://huggingface.co/unsloth/gemma-4-E4B-it-qat-mobile-GGUF/resolve/6a6e7121b977cefd85daa8fbc538fa485e7e8b1b/gemma-4-E4B-it-qat-UD-Q2_K_XL.gguf' },
    projector: { filename: 'gemma-4-E4B-mmproj-F16.gguf', bytes: 990372672, sha256: '6a255159ee4b01b304f633a57f017dd7d5a69d30fff52abb2614bf0813cef034', url: 'https://huggingface.co/unsloth/gemma-4-E4B-it-qat-mobile-GGUF/resolve/6a6e7121b977cefd85daa8fbc538fa485e7e8b1b/mmproj-F16.gguf' },
  },
};

export function catalogEntry(id: string): ModelCatalogEntry {
  if (!Object.prototype.hasOwnProperty.call(MODEL_CATALOG, id)) throw new Error('Unknown model ID');
  return MODEL_CATALOG[id as BuddyModelId];
}
