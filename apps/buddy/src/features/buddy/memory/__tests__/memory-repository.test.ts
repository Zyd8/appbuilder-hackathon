import { MemoryRepository } from '../memory-repository';
import type { MemoryFileAdapter } from '../memory-types';
import { MemoryConflictError } from '../memory-types';

class FakeFiles implements MemoryFileAdapter {
  values = new Map<string, string>();
  failMove = false;
  async read(path: string) { return this.values.get(path) ?? null; }
  async write(path: string, text: string) { this.values.set(path, text); }
  async move(from: string, to: string) {
    if (this.failMove) throw new Error('interrupted');
    const value = this.values.get(from);
    if (value === undefined) throw new Error('missing temp');
    this.values.set(to, value);
    this.values.delete(from);
  }
  async remove(path: string) { this.values.delete(path); }
  async ensureDirectory(_path: string) {}
}

describe('memory repository', () => {
  it('creates templates once, persists updates and isolates namespaces', async () => {
    const files = new FakeFiles();
    const guest = new MemoryRepository(files, { kind: 'guest', id: 'g1' });
    const initial = await guest.read('USER.md');
    const changed = await guest.save('USER.md', '# USER.md\n## Preferences\n- Tea\n## Private draft\n- Keep me', initial.revision);
    expect((await new MemoryRepository(files, { kind: 'guest', id: 'g1' }).read('USER.md')).text).toBe(changed.text);
    expect((await new MemoryRepository(files, { kind: 'account', id: 'g1' }).read('USER.md')).text).not.toBe(changed.text);
    expect(changed.text).toContain('## Private draft');
  });

  it('rejects stale writes and recovers backup after interrupted promotion', async () => {
    const files = new FakeFiles();
    const repo = new MemoryRepository(files, { kind: 'guest', id: 'g1' });
    const initial = await repo.read('USER.md');
    await expect(repo.save('USER.md', '## Preferences\n- Tea', 'stale')).rejects.toThrow(MemoryConflictError);
    files.failMove = true;
    await expect(repo.save('USER.md', '## Preferences\n- Tea', initial.revision)).rejects.toThrow('interrupted');
    files.failMove = false;
    const recovered = await new MemoryRepository(files, { kind: 'guest', id: 'g1' }).read('USER.md');
    expect(recovered.text).toBe(initial.text);
  });

  it('rejects namespace traversal', () => {
    expect(() => new MemoryRepository(new FakeFiles(), { kind: 'account', id: '../other' })).toThrow();
  });

  it('recovers corrupt current data only from a valid backup', async () => {
    const files = new FakeFiles();
    files.values.set('buddy-memory/guest/g1/USER.md', 'bad\u0000data');
    files.values.set('buddy-memory/guest/g1/USER.md.bak', '# USER.md\n## Goals\n- Rest\n');
    const repo = new MemoryRepository(files, { kind: 'guest', id: 'g1' });
    expect((await repo.read('USER.md')).text).toContain('- Rest');
    files.values.set('buddy-memory/guest/g1/USER.md', 'bad\u0000data');
    files.values.set('buddy-memory/guest/g1/USER.md.bak', 'bad\u0000backup');
    await expect(repo.read('USER.md')).rejects.toThrow();
  });
});
