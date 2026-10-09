/**
 * Signed-in account (ADR-005). Pure types and rules; storage and Supabase live in `src/lib`.
 * Only identity fields belong here. Onboarding answers and progress never leave the device.
 */

export interface AccountProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  provider: string;
  /** When the profile last reached the cloud. Unset means the upsert is still pending. */
  syncedAt?: string;
}

/** The subset of an auth user this module reads. Kept narrow so the domain stays SDK-free. */
export interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}

function firstString(meta: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!meta) return null;
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function profileFromUser(user: AuthUserLike): AccountProfile {
  return {
    id: user.id,
    email: user.email ?? firstString(user.user_metadata, ['email']),
    displayName: firstString(user.user_metadata, ['full_name', 'name']),
    avatarUrl: firstString(user.user_metadata, ['avatar_url', 'picture']),
    provider: firstString(user.app_metadata, ['provider']) ?? 'google',
  };
}

/** Row shape for `public.profiles`. */
export function profileToRow(profile: AccountProfile, now: string) {
  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.displayName,
    avatar_url: profile.avatarUrl,
    provider: profile.provider,
    updated_at: now,
  };
}

export type AuthRedirect = { code: string } | { error: string } | { none: true };

/** Read the PKCE `code` (or an OAuth error) from the redirect URL's query or fragment. */
export function parseAuthRedirect(url: string): AuthRedirect {
  const params = new URLSearchParams();
  const query = url.split('?')[1]?.split('#')[0];
  const fragment = url.split('#')[1];
  for (const part of [query, fragment]) {
    if (!part) continue;
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }
  const error = params.get('error_description') ?? params.get('error');
  if (error) return { error };
  const code = params.get('code');
  if (code) return { code };
  return { none: true };
}

export interface ProfileSyncPorts {
  writeLocal: (profile: AccountProfile) => void;
  upsertRemote: (profile: AccountProfile) => Promise<void>;
  now: () => string;
}

/**
 * Save locally first (the source of truth), then upsert to the cloud.
 * `syncedAt` is only set after the upsert succeeds, so a failure leaves the profile pending for a retry.
 */
export async function saveProfileLocalFirst(
  profile: AccountProfile,
  ports: ProfileSyncPorts,
): Promise<{ profile: AccountProfile; synced: boolean }> {
  const pending: AccountProfile = { ...profile, syncedAt: undefined };
  ports.writeLocal(pending);
  try {
    await ports.upsertRemote(pending);
  } catch {
    return { profile: pending, synced: false };
  }
  const synced: AccountProfile = { ...pending, syncedAt: ports.now() };
  ports.writeLocal(synced);
  return { profile: synced, synced: true };
}
