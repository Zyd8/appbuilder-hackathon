/// <reference types="jest" />
import { accountNamespace, guestNamespace, progressUserId } from '../repository-namespace';

it('keeps account and explicit guest identities apart', () => {
  expect(accountNamespace('same')).toBe('account:same');
  expect(guestNamespace('same')).toBe('guest:same');
  expect(progressUserId(accountNamespace('same'))).toBe('same');
  expect(() => guestNamespace('')).toThrow();
  expect(() => accountNamespace('a:b')).toThrow();
});
