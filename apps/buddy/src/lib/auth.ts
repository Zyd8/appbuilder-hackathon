/**
 * Google sign-in through Supabase OAuth in an in-app browser (ADR-005).
 * Works in Expo Go. Planned refactor to native sign-in: docs/todo/001-native-google-signin.md.
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import {
  parseAuthRedirect,
  profileFromUser,
  profileToRow,
  saveProfileLocalFirst,
  type AccountProfile,
} from '@/domain/account';

import { clearCachedProfile, loadCachedProfile, writeCachedProfile } from './account-storage';
import { getSupabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type SignInResult =
  | { status: 'ok'; profile: AccountProfile; synced: boolean }
  | { status: 'cancelled' }
  | { status: 'offline' }
  | { status: 'not_configured' }
  | { status: 'error'; message: string };

const REACHABILITY_TIMEOUT_MS = 5000;

/** Cheap check that the auth server answers, so we can say "no connection" before opening a browser. */
async function canReachAuthServer(): Promise<boolean> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function upsertProfile(profile: AccountProfile): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('profiles')
    .upsert(profileToRow(profile, new Date().toISOString()), { onConflict: 'id' });
  if (error) throw error;
}

function saveProfile(profile: AccountProfile) {
  return saveProfileLocalFirst(profile, {
    writeLocal: writeCachedProfile,
    upsertRemote: upsertProfile,
    now: () => new Date().toISOString(),
  });
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const supabase = getSupabase();
  if (!supabase) return { status: 'not_configured' };
  if (!(await canReachAuthServer())) return { status: 'offline' };

  try {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { status: 'error', message: error?.message ?? 'No sign-in URL' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return { status: 'cancelled' };

    const redirect = parseAuthRedirect(result.url);
    if ('error' in redirect) return { status: 'error', message: redirect.error };
    if (!('code' in redirect)) return { status: 'error', message: 'Missing sign-in code' };

    const { data: session, error: exchangeError } = await supabase.auth.exchangeCodeForSession(redirect.code);
    if (exchangeError || !session.user) {
      return { status: 'error', message: exchangeError?.message ?? 'No user returned' };
    }

    const saved = await saveProfile(profileFromUser(session.user));
    return { status: 'ok', ...saved };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/** Retry the cloud upsert for a profile saved while the network was down. Safe to call on every launch. */
export async function retryPendingProfileSync(): Promise<AccountProfile | undefined> {
  const cached = loadCachedProfile();
  const supabase = getSupabase();
  if (!cached || cached.syncedAt || !supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== cached.id) return undefined;
  const { profile, synced } = await saveProfile(cached);
  return synced ? profile : undefined;
}

/** Clears the local session and cached profile. Works offline. */
export async function signOut(): Promise<void> {
  clearCachedProfile();
  await getSupabase()?.auth.signOut({ scope: 'local' });
}
