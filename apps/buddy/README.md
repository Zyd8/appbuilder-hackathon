# Buddy: Level Up

Self-improvement quests plus a personal AI companion. Private, on-device, and offline-first.

- Product brief: [`docs/app/buddy-level-up-overview.md`](../../docs/app/buddy-level-up-overview.md)
- Phased plan and current status: [`docs/plans/004-buddy-level-up-phases.md`](../../docs/plans/004-buddy-level-up-phases.md)
- Stack decision: [`docs/decisions/004-buddy-stack-expo-supabase.md`](../../docs/decisions/004-buddy-stack-expo-supabase.md)

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

## Optional: Supabase backup

Supabase is an opt-in backup adapter (Phase 7) and is not needed to run the app. To try the client wiring, copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key. Never use a secret or service-role key.

## Layout

```
src/
  app/          Expo Router screens (onboarding, (tabs), settings, check-in)
  components/   UI building blocks (quest card, radar chart, mascot, …)
  domain/       Pure types and game rules (XP, levels) + tests
  data/         Seed data: onboarding questions, quest library, preview data
  state/        Zustand stores (Phase 1: in-memory preview store)
  i18n/         All user-facing strings
  lib/          Adapters (Supabase client)
  theme/        Design tokens and theme hook
```
