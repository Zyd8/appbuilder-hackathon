import type { BuddyReadPorts, ReadSnapshot } from '@/features/buddy/contracts/domain-ports';
import type { AIEngine } from '@/features/buddy/contracts/ai-engine';
import type { ModelManager } from '@/features/buddy/model-manager';

/** Status is a local observation. Artifact readiness is verified by the model manager. */
export function createRuntimeReadPorts(manager: ModelManager, engine: AIEngine, now: () => string):
  Pick<BuddyReadPorts, 'model' | 'input'> {
  const snap = <T>(value: T): ReadSnapshot<T> => ({
    value, revision: now(), observedAt: now(), provenance: 'local model runtime',
    durability: 'session', schemaVersion: 1,
  });
  return {
    model: { status: async () => {
      const selectedId = manager.selectedModel();
      return snap({ selectedId, readiness: await engine.readiness(selectedId), capabilities: engine.capabilities() });
    } },
    input: { capabilities: async () => snap({ text: true, image: engine.capabilities()?.vision === true, audio: false as const }) },
  };
}
