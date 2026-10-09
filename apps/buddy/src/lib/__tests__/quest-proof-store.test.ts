/// <reference types="jest" />
import { QuestPhotoProofStore, type ProofFiles } from '../quest-proof-store';

const ID = '00000000-0000-4000-8000-000000000123';

function fixture(namespace: 'account:person-1' | 'guest:person-1' = 'account:person-1') {
  const saved = new Set<string>();
  const key = (ns: string, quest: string, proof: string) => `${ns}/${quest}/${proof}`;
  const files: ProofFiles = {
    copyLocal: jest.fn(async (_uri, ns, quest, proof) => { saved.add(key(ns, quest, proof)); }),
    exists: jest.fn(async (ns, quest, proof) => saved.has(key(ns, quest, proof))),
    remove: jest.fn(async (ns, quest, proof) => { saved.delete(key(ns, quest, proof)); }),
  };
  return { store: new QuestPhotoProofStore(namespace, files, () => ID), files, saved };
}

it('copies a local image and gives the quest service only an opaque ID', async () => {
  const f = fixture();
  expect(await f.store.save('quest-1', 'file:///temporary/photo.jpg')).toBe(ID);
  expect(await f.store.verify('quest-1', ID)).toBe(true);
  expect(await f.store.verify('quest-2', ID)).toBe(false);
  expect(f.files.copyLocal).toHaveBeenCalledWith('file:///temporary/photo.jpg', 'account-person-1', 'quest-1', ID);
  expect(JSON.stringify([...f.saved])).not.toContain('/temporary/photo.jpg');
});

it('rejects remote content and never verifies a malformed or cross-namespace proof', async () => {
  const f = fixture();
  await expect(f.store.save('quest-1', 'https://example.com/photo.jpg')).rejects.toThrow();
  await expect(f.store.save('../quest', 'file:///temporary/photo.jpg')).rejects.toThrow();
  expect(f.files.copyLocal).not.toHaveBeenCalled();
  expect(await f.store.verify('quest-1', '../private')).toBe(false);
  expect(await fixture('guest:person-1').store.verify('quest-1', ID)).toBe(false);
});

it('removes an incomplete copy and does not issue a proof ID', async () => {
  const f = fixture();
  (f.files.exists as jest.Mock).mockResolvedValue(false);
  await expect(f.store.save('quest-1', 'file:///temporary/photo.jpg')).rejects.toThrow('copy failed');
  expect(f.files.remove).toHaveBeenCalledWith('account-person-1', 'quest-1', ID);
  expect(f.saved.size).toBe(0);
});
