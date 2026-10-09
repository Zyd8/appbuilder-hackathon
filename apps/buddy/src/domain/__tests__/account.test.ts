/// <reference types="jest" />
import { parseAuthRedirect, profileFromUser, saveProfileLocalFirst, type AccountProfile } from '../account';

const SAMPLE: AccountProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'player@example.com',
  displayName: 'Sample Player',
  avatarUrl: null,
  provider: 'google',
};

describe('profileFromUser', () => {
  it('maps Google metadata to an account profile', () => {
    const profile = profileFromUser({
      id: SAMPLE.id,
      email: 'player@example.com',
      user_metadata: { full_name: 'Sample Player', avatar_url: 'https://example.com/a.png' },
      app_metadata: { provider: 'google' },
    });
    expect(profile).toEqual({
      id: SAMPLE.id,
      email: 'player@example.com',
      displayName: 'Sample Player',
      avatarUrl: 'https://example.com/a.png',
      provider: 'google',
    });
  });

  it('falls back to name/picture keys and tolerates missing metadata', () => {
    expect(profileFromUser({ id: 'u1', user_metadata: { name: 'Sam', picture: 'p.png' } })).toMatchObject({
      displayName: 'Sam',
      avatarUrl: 'p.png',
      email: null,
      provider: 'google',
    });
    expect(profileFromUser({ id: 'u2', user_metadata: null })).toMatchObject({
      displayName: null,
      avatarUrl: null,
    });
  });
});

describe('parseAuthRedirect', () => {
  it('reads the PKCE code from the query', () => {
    expect(parseAuthRedirect('buddylevelup://auth/callback?code=abc123')).toEqual({ code: 'abc123' });
  });

  it('reads an OAuth error from the query or fragment', () => {
    expect(parseAuthRedirect('exp://host/--/auth/callback#error=access_denied')).toEqual({ error: 'access_denied' });
    expect(
      parseAuthRedirect('buddylevelup://auth/callback?error=server_error&error_description=Nope'),
    ).toEqual({ error: 'Nope' });
  });

  it('returns none when the URL carries neither', () => {
    expect(parseAuthRedirect('buddylevelup://auth/callback')).toEqual({ none: true });
  });
});

describe('saveProfileLocalFirst', () => {
  it('writes locally before the upsert and marks synced after success', async () => {
    const calls: string[] = [];
    const local: AccountProfile[] = [];
    const result = await saveProfileLocalFirst(SAMPLE, {
      writeLocal: (p) => {
        calls.push('local');
        local.push(p);
      },
      upsertRemote: async () => {
        calls.push('remote');
      },
      now: () => '2026-10-09T00:00:00.000Z',
    });
    expect(calls).toEqual(['local', 'remote', 'local']);
    expect(local[0].syncedAt).toBeUndefined();
    expect(result).toEqual({ profile: { ...SAMPLE, syncedAt: '2026-10-09T00:00:00.000Z' }, synced: true });
  });

  it('keeps the local copy pending when the upsert fails', async () => {
    const local: AccountProfile[] = [];
    const result = await saveProfileLocalFirst(
      { ...SAMPLE, syncedAt: 'stale' },
      {
        writeLocal: (p) => local.push(p),
        upsertRemote: async () => {
          throw new Error('offline');
        },
        now: () => 'never',
      },
    );
    expect(result.synced).toBe(false);
    expect(result.profile.syncedAt).toBeUndefined();
    expect(local).toHaveLength(1);
  });

  it('is safe to run twice (idempotent upsert by id)', async () => {
    const rows = new Map<string, AccountProfile>();
    const ports = {
      writeLocal: () => {},
      upsertRemote: async (p: AccountProfile) => {
        rows.set(p.id, p);
      },
      now: () => 'now',
    };
    await saveProfileLocalFirst(SAMPLE, ports);
    await saveProfileLocalFirst(SAMPLE, ports);
    expect(rows.size).toBe(1);
  });
});
