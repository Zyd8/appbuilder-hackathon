/**
 * On-device cache of the signed-in account (localStorage backed by expo-sqlite).
 * This copy is what lets a returning user open the app offline.
 */
import 'expo-sqlite/localStorage/install';

import type { AccountProfile } from '@/domain/account';

const KEY = 'buddy.account.profile';

export function loadCachedProfile(): AccountProfile | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<AccountProfile>;
    if (typeof parsed.id !== 'string' || !parsed.id) return undefined;
    return parsed as AccountProfile;
  } catch {
    return undefined;
  }
}

export function writeCachedProfile(profile: AccountProfile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearCachedProfile(): void {
  localStorage.removeItem(KEY);
}
