import { Directory, File, FileMode } from 'expo-file-system';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import type { AIEngineReadiness } from './contracts/ai-engine';
import { artifactFile, modelsDirectory } from './model-paths';
import { catalogEntry, type ModelArtifact, type ModelCatalogEntry } from './model-catalog';
import type { BuddyModelId } from './types';

export interface VerifiedModel {
  id: BuddyModelId;
  model: File;
  projector: File | null;
  identity: string;
}

type Download = (url: string, destination: File) => Promise<File>;
const defaultDownload: Download = (url, destination) => File.downloadFileAsync(url, destination);

export class ModelManager {
  private selected: BuddyModelId = 'gemma4-e2b';
  private active = new Set<BuddyModelId>();
  private verifying = new Set<BuddyModelId>();
  private errors = new Set<BuddyModelId>();
  private background = new Set<BuddyModelId>();
  private verifiedOk = new Set<BuddyModelId>();
  private verifiedFiles = new Map<string, string>();

  constructor(private readonly download: Download = defaultDownload) {}

  selectedModel(): BuddyModelId { return this.selected; }

  switchModel(id: BuddyModelId): void {
    catalogEntry(id); // never silently substitute another model
    this.selected = id;
  }

  async readiness(id: BuddyModelId): Promise<AIEngineReadiness> {
    const entry = catalogEntry(id);
    if (this.active.has(id)) return 'downloading';
    if (this.verifying.has(id)) return 'verifying';
    if (this.errors.has(id)) return 'error';
    const model = artifactFile(entry.model);
    const partial = new File(modelsDirectory(), `${entry.model.filename}.partial`);
    if (partial.exists) return 'error';
    if (!model.exists) return 'not-installed';
    if (model.size !== entry.model.bytes) return 'incompatible';
    // A correctly-sized file is usable now. Hashing a multi-GB model in JS takes minutes, and
    // blocking readiness on it makes a perfectly good model look missing. Verify the digest in
    // the background instead and demote to 'error' only if it actually disagrees.
    void this.verifyInBackground(id, model, entry);
    return 'ready';
  }

  /**
   * Full SHA-256 check that does not gate readiness. Downloads are still verified inline before
   * they are accepted; this covers files that were placed on disk by other means.
   */
  private async verifyInBackground(
    id: BuddyModelId,
    model: File,
    entry: ModelCatalogEntry,
  ): Promise<void> {
    if (this.background.has(id) || this.verifiedOk.has(id)) return;
    this.background.add(id);
    try {
      if (!(await this.verifyOnce(model, entry.model))) {
        this.errors.add(id);
        return;
      }
      const projector = artifactFile(entry.projector);
      if (projector.exists && !(await this.verifyOnce(projector, entry.projector))) {
        this.errors.add(id);
        return;
      }
      // Remember success for this session: modificationTime is not always available, so the
      // fingerprint cache in verifyOnce cannot be relied on to prevent a re-hash.
      this.verifiedOk.add(id);
    } catch {
      this.errors.add(id);
    } finally {
      this.background.delete(id);
    }
  }

  async verified(id: BuddyModelId): Promise<VerifiedModel> {
    const entry = catalogEntry(id);
    if (await this.readiness(id) !== 'ready') throw new Error('Selected model is not ready');
    const projector = artifactFile(entry.projector);
    return {
      id,
      model: artifactFile(entry.model),
      projector: projector.exists ? projector : null,
      identity: [entry.id, entry.model.sha256, projector.exists ? entry.projector.sha256 : 'text-only', entry.contextTokens, entry.platform].join(':'),
    };
  }

  /** Called only by an explicit user action in the manual model UI. */
  async install(id: BuddyModelId, confirmed: boolean, includeProjector = true): Promise<void> {
    if (!confirmed) throw new Error('Model installation requires confirmation');
    const entry = catalogEntry(id);
    if (this.active.has(id)) throw new Error('Model download already in progress');
    this.active.add(id);
    this.errors.delete(id);
    try {
      const dir: Directory = modelsDirectory();
      dir.create({ intermediates: true, idempotent: true });
      await this.installArtifact(entry.model);
      if (includeProjector) await this.installArtifact(entry.projector);
    } catch (error) {
      this.errors.add(id);
      throw error;
    } finally {
      this.active.delete(id);
    }
  }

  retry(id: BuddyModelId): void {
    catalogEntry(id);
    this.errors.delete(id);
    const entry = catalogEntry(id);
    for (const artifact of [entry.model, entry.projector]) {
      const partial = new File(modelsDirectory(), `${artifact.filename}.partial`);
      if (partial.exists) partial.delete();
    }
  }

  async delete(id: BuddyModelId, confirmed: boolean): Promise<void> {
    if (!confirmed) throw new Error('Model deletion requires confirmation');
    const entry = catalogEntry(id);
    if (this.active.has(id)) throw new Error('Cannot delete during download');
    for (const artifact of [entry.model, entry.projector]) {
      const file = artifactFile(artifact);
      if (file.exists) file.delete();
      this.verifiedFiles.delete(artifact.filename);
    }
    this.errors.delete(id);
  }

  private async installArtifact(artifact: ModelArtifact): Promise<void> {
    const destination = artifactFile(artifact);
    if (destination.exists && await verifyArtifact(destination, artifact)) return;
    const partial = new File(modelsDirectory(), `${artifact.filename}.partial`);
    if (partial.exists) partial.delete();
    await this.download(artifact.url, partial);
    if (!(await verifyArtifact(partial, artifact))) throw new Error('Downloaded model failed checksum verification');
    if (destination.exists) destination.delete();
    partial.move(destination);
    this.verifiedFiles.delete(artifact.filename);
  }

  private async verifyOnce(file: File, artifact: ModelArtifact): Promise<boolean> {
    const modified = file.modificationTime;
    const fingerprint = modified == null ? null : `${file.size}:${modified}:${artifact.sha256}`;
    if (fingerprint && this.verifiedFiles.get(artifact.filename) === fingerprint) return true;
    if (!await verifyArtifact(file, artifact)) return false;
    if (fingerprint) this.verifiedFiles.set(artifact.filename, fingerprint);
    return true;
  }
}

export async function verifyArtifact(file: File, artifact: ModelArtifact): Promise<boolean> {
  if (!file.exists || file.size !== artifact.bytes) return false;
  const handle = file.open(FileMode.ReadOnly);
  const digest = sha256.create();
  try {
    let remaining = artifact.bytes;
    while (remaining > 0) {
      const chunk = handle.readBytes(Math.min(1024 * 1024, remaining));
      if (!chunk.length) return false;
      digest.update(chunk);
      remaining -= chunk.length;
      // A multi-GB model takes time to hash in JS. Let the UI render and accept input.
      if (remaining > 0 && remaining % (8 * 1024 * 1024) < chunk.length)
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    return bytesToHex(digest.digest()) === artifact.sha256;
  } finally {
    handle.close();
  }
}
