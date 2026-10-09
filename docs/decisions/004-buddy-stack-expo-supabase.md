# ADR-004: Buddy: Level Up Stack — Expo React Native + Local SQLite + Optional Supabase

- Status: accepted
- Date: 2026-10-09
- Scope: `apps/buddy` (Buddy: Level Up), product brief in `docs/app/buddy-level-up-overview.md`

## Context

The team chose React Native and Supabase for Buddy: Level Up. The product brief, however, is strictly private and offline-first: no account, no cloud storage of user content, and all AI runs on the device. The repository rules (`AGENTS.md`) require local storage to be the source of truth and cloud sync to be optional, observable, retryable, and idempotent.

## Decision

- **App:** Expo SDK 57 + React Native 0.86 + TypeScript, Expo Router (`src/app`), Zustand for UI state.
- **Local data:** `expo-sqlite` on the device is the source of truth for all user data. The schema and repositories arrive in Phase 2. Drizzle ORM is the default and is re-evaluated when Phase 2 starts.
- **Supabase:** used only as an **opt-in cloud backup/sync adapter** (Phase 7), behind a sync port.
  - The app ships with no Supabase dependency at runtime: `getSupabase()` returns `null` when `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are unset, and every feature works without it.
  - Nothing is uploaded until the user explicitly turns backup on in Settings. The default stays "data not collected".
  - Only the publishable key is ever bundled. Secret or service-role keys never enter the app or the repository.
  - Sync uses append-only, idempotent events with stable IDs; local edits are never silently discarded.
- **On-device AI (Phase 5):** behind an `AIEngine` port, reusing the `llama.rn` path proven in `apps/expo-go-sample` (ADR-002/003). Curated quest library and rules are the non-AI fallback ("Lite mode").
- **Expo Go first:** Phases 1–4 use only modules that Expo Go bundles, so the UI can be previewed by scanning a QR code. Phase 5 (native model runtime) requires a development build.

## Alternatives considered

- **Supabase as the primary database (auth + Postgres first):** rejected. It breaks the offline-first and no-account product principles and the repo's local-first rules.
- **No Supabase at all:** possible, but the team wants cloud backup/multi-device restore as a later, opt-in feature.
- **PowerSync / ElectricSQL on top of Supabase:** worth evaluating in Phase 7 if hand-rolled sync proves too costly; not needed earlier.

## Consequences

- The app is fully demoable in airplane mode from Phase 1 on.
- Supabase work is isolated to one adapter and one phase. The privacy story stays simple ("on device unless you opt in").
- Phase 7 must add conflict visibility, retry and duplicate-delivery tests before any "backed up" claim appears in the UI.
- Store privacy labels must be updated if and when backup ships.

## Verification

- Phase 1: `npm run typecheck`, `npm run lint`, `npm test`, `npx expo export --platform android`, and `npx expo-doctor` pass with no `.env.local` present; Settings shows "Not set up. Everything stays on this device."
- Phase 7: sync tests cover offline edits, retries, duplicates, out-of-order events and conflicts; the network is disabled in a real device test, not only mocked.
