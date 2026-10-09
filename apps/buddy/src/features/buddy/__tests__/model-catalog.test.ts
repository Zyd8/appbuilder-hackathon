import { MODEL_CATALOG, catalogEntry } from '../model-catalog';
import { modelsDirectory, validateArtifactFilename } from '../model-paths';

describe('pinned model catalog', () => {
  it('has distinct complete artifacts and refuses unknown IDs', () => {
    const entries = Object.values(MODEL_CATALOG);
    expect(entries).toHaveLength(2);
    expect(new Set(entries.map((entry) => entry.model.sha256)).size).toBe(2);
    for (const entry of entries) {
      expect(entry.model.bytes).toBeGreaterThan(2_000_000_000);
      expect(entry.model.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.projector.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.model.url).toContain(`/resolve/${entry.revision}/`);
      expect(entry.license).toBe('apache-2.0');
    }
    expect(() => catalogEntry('unknown')).toThrow('Unknown model ID');
  });

  it('rejects traversal and invalid filenames', () => {
    for (const name of ['../model.gguf', '/tmp/model.gguf', 'a..b.gguf', 'model.gguf/other', 'model.bin']) {
      expect(() => validateArtifactFilename(name)).toThrow();
    }
    expect(() => validateArtifactFilename('gemma-4-E2B.gguf')).not.toThrow();
    expect(modelsDirectory().uri).toMatch(/\/models\/?$/);
  });
});
