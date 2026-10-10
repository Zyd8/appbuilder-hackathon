import { DEFAULT_BUDDY_MODEL, BUDDY_MODEL_LIST, BUDDY_MODELS } from '../types';
import { MODEL_CATALOG, catalogEntry } from '../model-catalog';
import { modelsDirectory, validateArtifactFilename } from '../model-paths';

describe('pinned model catalog', () => {
  it('pins every artifact to a real revision with a checksum', () => {
    const entries = Object.values(MODEL_CATALOG);
    expect(entries).toHaveLength(4);
    expect(new Set(entries.map((entry) => entry.model.sha256)).size).toBe(4);
    for (const entry of entries) {
      expect(entry.model.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.model.bytes).toBeGreaterThan(500_000_000);
      expect(entry.model.url).toContain(`/resolve/${entry.revision}/`);
      expect(entry.model.url).toContain(entry.model.filename);
      expect(entry.license).toBe('apache-2.0');
      if (entry.projector) expect(entry.projector.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(() => catalogEntry('unknown')).toThrow('Unknown model ID');
  });

  it('defaults to the text-only Qwen model and retires the Gemma entries', () => {
    expect(DEFAULT_BUDDY_MODEL).toBe('qwen3-1.7b');
    expect(BUDDY_MODELS[DEFAULT_BUDDY_MODEL].supportsImages).toBe(false);
    expect(BUDDY_MODELS[DEFAULT_BUDDY_MODEL].retired).toBe(false);
    expect(BUDDY_MODELS['qwen35-0.8b'].retired).toBe(false);
    expect(BUDDY_MODELS['qwen35-0.8b'].supportsImages).toBe(true);
    expect(MODEL_CATALOG['qwen35-0.8b'].model.bytes).toBeLessThan(MODEL_CATALOG['qwen3-1.7b'].model.bytes);
    // Qwen is the lighter download, which is the whole reason it is the default.
    expect(MODEL_CATALOG['qwen3-1.7b'].model.bytes).toBeLessThan(MODEL_CATALOG['gemma4-e2b'].model.bytes);

    for (const id of ['gemma4-e2b', 'gemma4-e4b'] as const) {
      expect(BUDDY_MODELS[id].retired).toBe(true);
      expect(BUDDY_MODELS[id].supportsImages).toBe(true);
    }
    // List order drives the chips: the default first, retired entries last.
    expect(BUDDY_MODEL_LIST[0].id).toBe(DEFAULT_BUDDY_MODEL);
    expect(BUDDY_MODEL_LIST[1].id).toBe('qwen35-0.8b');
    expect(BUDDY_MODEL_LIST.at(-1)?.retired).toBe(true);
  });

  it('rejects traversal and invalid filenames', () => {
    for (const name of ['../model.gguf', '/tmp/model.gguf', 'a..b.gguf', 'model.gguf/other', 'model.bin']) {
      expect(() => validateArtifactFilename(name)).toThrow();
    }
    expect(() => validateArtifactFilename('gemma-4-E2B.gguf')).not.toThrow();
    expect(modelsDirectory().uri).toMatch(/\/models\/?$/);
  });
});
