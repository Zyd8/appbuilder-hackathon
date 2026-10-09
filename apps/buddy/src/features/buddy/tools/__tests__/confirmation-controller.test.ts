/// <reference types="jest" />
import { ConfirmationController } from '../confirmation-controller';
import type { NotesCreateHandler } from '../notes-create-handler';
import type { PendingConfirmation } from '../tool-types';

const NOW = '2026-10-10T10:00:00Z';
const pending: PendingConfirmation = { call: { id: 'c1', name: 'notes.create', arguments: {
  body: 'Call dentist', expectedRevision: '0', idempotencyKey: 'safe-key-1234567890',
} }, fingerprint: 'same', descriptor: { callId: 'c1', tool: 'notes.create', title: 'Save?', body: 'Call dentist',
  metadata: {}, reason: 'User asked', privacyImpact: 'Local', storageImpact: 'One note' } };

it('rejects and cancels without executing a write', async () => {
  const execute = jest.fn();
  const controller = new ConfirmationController({ execute } as unknown as NotesCreateHandler, () => NOW);
  expect(controller.set(pending)).toBe(true);
  expect(controller.set(pending)).toBe(false);
  expect(await controller.decide('c1', 'reject')).toMatchObject({ ok: false, error: { code: 'confirmation_rejected' } });
  expect(controller.current()).toBeNull();
  expect(execute).not.toHaveBeenCalled();
  controller.set(pending);
  expect(await controller.decide('c1', 'cancel')).toMatchObject({ ok: false, error: { code: 'confirmation_cancelled' } });
  expect(execute).not.toHaveBeenCalled();
});

it('executes only after an exact confirmed call ID', async () => {
  const execute = jest.fn(async () => ({ ok: true, callId: 'c1', name: 'notes.create', data: { id: 'n1' }, metadata: {} }));
  const controller = new ConfirmationController({ execute } as unknown as NotesCreateHandler, () => NOW);
  controller.set(pending);
  expect(await controller.decide('wrong', 'confirm')).toMatchObject({ ok: false, error: { code: 'confirmation_cancelled' } });
  expect(execute).not.toHaveBeenCalled();
  expect(await controller.decide('c1', 'confirm')).toMatchObject({ ok: true });
  expect(execute).toHaveBeenCalledTimes(1);
});
