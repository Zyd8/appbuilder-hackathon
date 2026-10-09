import { Directory, File, FileMode } from 'expo-file-system';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import type { AIEngineReadiness } from './contracts/ai-engine';
import { artifactFile, modelsDirectory } from './model-paths';
import { catalogEntry, type ModelArtifact } from './model-catalog';
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
    this.verifying.add(id);
    try {
      if (!(await verifyArtifact(model, entry.model))) return 'incompatible';
      const projector = artifactFile(entry.projector);
      if (projector.exists && !(await verifyArtifact(projector, entry.projector))) return 'incompatible';
      return 'ready';
    } catch {
      return 'error';
    } finally {
      this.verifying.delete(id);
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
    }
    return bytesToHex(digest.digest()) === artifact.sha256;
  } finally {
    handle.close();
  }
}
