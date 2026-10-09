# Buddy: Level Up

Self-improvement quests plus a personal AI companion. Private, on-device, and offline-first.

- Product brief: [`docs/app/buddy-level-up-overview.md`](../../docs/app/buddy-level-up-overview.md)
- Phased plan and current status: [`docs/plans/004-buddy-level-up-phases.md`](../../docs/plans/004-buddy-level-up-phases.md)
- Stack decision: [`docs/decisions/004-buddy-stack-expo-supabase.md`](../../docs/decisions/004-buddy-stack-expo-supabase.md)
- Login decision: [`docs/decisions/005-google-login-before-onboarding.md`](../../docs/decisions/005-google-login-before-onboarding.md)

**Current phase: 1 (UI shell).** Every screen is clickable, using synthetic in-memory preview data that resets on restart.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android or iOS). Phases 1–4 run in Expo Go; Phase 5 (on-device model) needs a development build (`npx expo run:android`).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Metro dev server |
| `npm run android` / `npm run ios` | Start and open on a device or emulator |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Jest unit tests (domain logic) |

## Supabase and Google login

A Google login is required before onboarding (ADR-005). Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key. Never use a secret or service-role key.

One-time setup in the dashboards:

1. Google Cloud Console: create an OAuth client ID of type **Web application** with the authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, and configure the consent screen (add test users while in Testing).
2. Supabase → Authentication → Providers → Google: enable it and paste the client ID and secret (the secret stays in the dashboard).
3. Supabase → Authentication → URL Configuration → Redirect URLs: add `exp://**` (Expo Go) and `buddylevelup://**` (dev/release builds).
4. Apply `supabase/migrations/*.sql` (creates `public.profiles` with owner-only RLS).

**Testing login in Expo Go:** run `npm run start:tunnel`, not `npx expo start`. On the LAN, Expo Go's redirect URL uses your PC's IP (`exp://192.168.x.x:8081/--/auth/callback`), and Supabase rejects redirect URLs with IP-address hosts even when they are allow-listed, so it falls back to the Site URL. The tunnel gives a hostname (`*.exp.direct`) that matches `exp://**`.

The first launch needs internet to sign in. After that, the cached session lets the app open offline. Onboarding answers (ADR-006) and notes (ADR-008) are saved on the device first and backed up to the account in the background; other user content (quests, check-ins, chat) stays on the device. Notes need the `public.notes` table from `supabase/migrations/20261009180000_create_notes.sql`.

## Layout

```
src/
  app/          Expo Router screens (onboarding, (tabs), settings, check-in)
  components/   UI building blocks (quest card, radar chart, mascot, …)
  domain/       Pure types and game rules (XP, levels) + tests
  data/         Seed data: onboarding questions, quest library, preview data
  state/        Zustand stores (Phase 1: in-memory preview store)
  i18n/         All user-facing strings
  lib/          Adapters (Supabase client, Google auth, account cache)
  theme/        Design tokens and theme hook
```
