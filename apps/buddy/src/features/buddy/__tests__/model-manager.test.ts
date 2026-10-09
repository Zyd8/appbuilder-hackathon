import { ModelManager, verifyArtifact } from '../model-manager';
import { MODEL_CATALOG } from '../model-catalog';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

const mockFiles = new Map<string, { bytes: number; exists: boolean }>();
jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///private/app' } },
  FileMode: { ReadOnly: 'r' },
  Directory: class {
    uri: string;
    constructor(_root: unknown, name: string) { this.uri = `file:///private/app/${name}`; }
    create() {}
  },
  File: class {
    uri: string;
    constructor(_dir: unknown, name: string) { this.uri = `file:///private/app/buddy-models/${name}`; }
    get exists() { return mockFiles.get(this.uri)?.exists ?? false; }
    get size() { return mockFiles.get(this.uri)?.bytes; }
    delete() { mockFiles.delete(this.uri); }
    move(other: { uri: string }) { mockFiles.set(other.uri, mockFiles.get(this.uri)!); mockFiles.delete(this.uri); }
    open() { return { readBytes: () => new Uint8Array(), close: () => {} }; }
  },
}));

describe('manual model lifecycle', () => {
  beforeEach(() => mockFiles.clear());

  it('keeps selection distinct from readiness and does not fall back', async () => {
    const manager = new ModelManager();
    manager.switchModel('gemma4-e4b');
    expect(manager.selectedModel()).toBe('gemma4-e4b');
    expect(await manager.readiness('gemma4-e4b')).toBe('not-installed');
    expect(() => manager.switchModel('unknown' as never)).toThrow();
  });

  it('rejects missing confirmation and detects interrupted or wrong-size files', async () => {
    const manager = new ModelManager();
    await expect(manager.install('gemma4-e2b', false)).rejects.toThrow('confirmation');
    const model = MODEL_CATALOG['gemma4-e2b'].model;
    const base = 'file:///private/app/buddy-models/';
    mockFiles.set(base + model.filename + '.partial', { bytes: 20, exists: true });
    expect(await manager.readiness('gemma4-e2b')).toBe('error');
    manager.retry('gemma4-e2b');
    mockFiles.set(base + model.filename, { bytes: 20, exists: true });
    expect(await manager.readiness('gemma4-e2b')).toBe('incompatible');
  });

  it('verifies SHA-256 and rejects same-size corruption', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const file = {
      exists: true, size: bytes.length,
      open: () => {
        let offset = 0;
        return {
          readBytes: (count: number) => {
            const part = bytes.slice(offset, offset + count);
            offset += part.length;
            return part;
          },
          close: () => {},
        };
      },
    };
    const artifact = { filename: 'tiny.gguf', url: 'https://example.com', bytes: 4, sha256: bytesToHex(sha256(bytes)) };
    expect(await verifyArtifact(file as never, artifact)).toBe(true);
    expect(await verifyArtifact(file as never, { ...artifact, sha256: '0'.repeat(64) })).toBe(false);
  });
});
