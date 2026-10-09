# ADR-005: Required Google Login Before Onboarding

- Status: accepted
- Date: 2026-10-09
- Scope: `apps/buddy`
- Partly supersedes: ADR-004 ("no account" / Supabase only as opt-in backup)

## Context

The team wants every Buddy user tied to a Google account before onboarding starts, with the account profile stored in Supabase. ADR-004 and the product brief said "no account required" and kept Supabase as a Phase 7 opt-in backup.

## Decision

- Google login is **required** before onboarding. There is no skip or "continue offline" option. (Updated 2026-10-09: the welcome and login screens were merged into one landing page at `/onboarding`, reached after the animated splash at `/`. The **Continue with Google** button is on the landing page itself.)
- Sign-in uses **Supabase OAuth in an in-app browser** (`signInWithOAuth` + `expo-web-browser` + PKCE). This flow works in Expo Go. A later refactor to native Google sign-in is tracked in `docs/todo/001-native-google-signin.md`.
- After a successful login, the app saves **id, email, display name, avatar URL and provider**:
  1. first to on-device `localStorage` (`expo-sqlite/localStorage`, key `buddy.account.profile`), which is the local source of truth;
  2. then as an idempotent upsert (by `id`) into `public.profiles` in the `appbuilders-hackathon` Supabase project. RLS lets each user read, insert and update only their own row.
- If the upsert fails, the local copy is kept with no `syncedAt`. The app retries on the next launch, and Settings shows the pending state.
- **Only identity data goes to the cloud.** Onboarding answers, quests, notes, reflections and chat stay on the device as before. ADR-004's opt-in backup rules still apply to them.

## Alternatives considered

- **Native Google sign-in (`@react-native-google-signin` + `signInWithIdToken`):** better UX, but it needs a development build and per-platform client IDs. Deferred (see the to-do note).
- **Login with a "continue offline" escape:** rejected by the team; login is required.

## Consequences

- **The first launch needs a network connection.** Offline, the login screen shows a "connect to sign in" message with retry. Once signed in, the cached session and profile let the app open fully offline. The airplane-mode demo must start after the first sign-in.
- The brief's "no account" and store privacy label ("data not collected") no longer hold. Name, email and photo are collected and linked to the user.
- Google provider credentials (client secret) live only in the Supabase dashboard, never in the repo.
- Signing out clears the local session and cached profile. It does not delete the cloud row; account deletion is still to be designed (Phase 7 export/delete).

## Verification

- Unit tests: `src/domain/__tests__/account.test.ts` (metadata mapping, redirect parsing, local-first save, failure keeps pending, idempotent upsert).
- Manual: sign in from Expo Go → land on questions; `select * from public.profiles` shows the row; restart keeps the user signed in; airplane mode on first launch shows the offline message; after sign-in, airplane mode + restart still opens the app.
- `get_advisors` (security) shows no RLS warnings for `public.profiles`.
