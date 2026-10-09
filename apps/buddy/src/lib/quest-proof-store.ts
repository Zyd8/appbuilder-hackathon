import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { QuestProofPort } from '@/domain/quest-service';
import type { RepositoryNamespace } from './repository-namespace';

const PART = /^[A-Za-z0-9_-]{1,128}$/;
const PROOF = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_BYTES = 20 * 1024 * 1024;

export interface ProofFiles {
  copyLocal(sourceUri: string, namespace: string, questId: string, proofId: string): Promise<void>;
  exists(namespace: string, questId: string, proofId: string): Promise<boolean>;
  remove(namespace: string, questId: string, proofId: string): Promise<void>;
}

/** Stores picked photos in an app-private directory; no location crosses the quest service port. */
export class ExpoProofFiles implements ProofFiles {
  private directory(namespace: string, questId: string): Directory {
    return new Directory(Paths.document, 'buddy-proofs', namespace, questId);
  }
  private file(namespace: string, questId: string, proofId: string): File {
    return new File(this.directory(namespace, questId), `${proofId}.proof`);
  }
  async copyLocal(sourceUri: string, namespace: string, questId: string, proofId: string): Promise<void> {
    const source = new File(sourceUri);
    if (!source.exists || source.size <= 0 || source.size > MAX_BYTES) throw new Error('Invalid quest proof photo');
    this.directory(namespace, questId).create({ idempotent: true, intermediates: true });
    await source.copy(this.file(namespace, questId, proofId));
  }
  async exists(namespace: string, questId: string, proofId: string): Promise<boolean> {
    const file = this.file(namespace, questId, proofId);
    return file.exists && file.size > 0 && file.size <= MAX_BYTES;
  }
  async remove(namespace: string, questId: string, proofId: string): Promise<void> {
    const file = this.file(namespace, questId, proofId);
    if (file.exists) file.delete();
  }
}

/** Issues only opaque IDs to Phase 2. Gemma and tool results never receive a photo URI or path. */
export class QuestPhotoProofStore implements QuestProofPort {
  private readonly namespace: string;
  constructor(namespace: RepositoryNamespace, private readonly files: ProofFiles = new ExpoProofFiles(),
    private readonly nextId: () => string = randomUUID) {
    const [kind, id] = namespace.split(':');
    if ((kind !== 'account' && kind !== 'guest') || !id || !PART.test(id))
      throw new Error('Invalid quest proof namespace');
    this.namespace = `${kind}-${id}`;
  }

  async save(questId: string, photoUri: string): Promise<string> {
    if (!PART.test(questId) || !photoUri.startsWith('file://')) throw new Error('Invalid local quest proof');
    const proofId = this.nextId();
    if (!PROOF.test(proofId)) throw new Error('Invalid quest proof ID');
    try {
      await this.files.copyLocal(photoUri, this.namespace, questId, proofId);
      if (!await this.files.exists(this.namespace, questId, proofId)) throw new Error('Quest proof copy failed');
      return proofId;
    } catch (error) {
      await this.files.remove(this.namespace, questId, proofId).catch(() => undefined);
      throw error;
    }
  }

  async verify(questId: string, proofId: string): Promise<boolean> {
    if (!PART.test(questId) || !PROOF.test(proofId)) return false;
    return this.files.exists(this.namespace, questId, proofId);
  }
}
