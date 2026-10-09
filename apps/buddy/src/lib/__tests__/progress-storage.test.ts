/// <reference types="jest" />
import { newProgress } from '@/domain/progress';
import { loadProgress, writeProgress } from '../progress-storage';

jest.mock('expo-sqlite/localStorage/install', () => ({}));

const rows = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => rows.get(key) ?? null,
  setItem: (key: string, value: string) => { rows.set(key, value); },
} });

it('preserves the ADR-010 local XP document and ignores damaged rows', () => {
  const doc = newProgress('test-user-storage', 123, '2026-10-10T10:00:00Z');
  writeProgress(doc);
  expect(loadProgress(doc.userId)).toEqual(doc);
  rows.set('buddy.progress.test-user-storage', '{bad');
  expect(loadProgress(doc.userId)).toBeUndefined();
});

it('cannot read another account document as this one', () => {
  rows.set('buddy.progress.test-other', JSON.stringify(newProgress('different', 500, '2026-10-10T10:00:00Z')));
  expect(loadProgress('test-other')).toBeUndefined();
});
