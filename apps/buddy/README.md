# Buddy: Level Up

Self-improvement quests plus a personal AI companion. Private, on-device, and offline-first.

- Product brief: [`docs/app/buddy-level-up-overview.md`](../../docs/app/buddy-level-up-overview.md)
- Phased plan and current status: [`docs/plans/004-buddy-level-up-phases.md`](../../docs/plans/004-buddy-level-up-phases.md)
- Stack decision: [`docs/decisions/004-buddy-stack-expo-supabase.md`](../../docs/decisions/004-buddy-stack-expo-supabase.md)
- Login decision: [`docs/decisions/005-google-login-before-onboarding.md`](../../docs/decisions/005-google-login-before-onboarding.md)
- On-device AI decision: [`docs/decisions/007-buddy-gemma-native-runtime.md`](../../docs/decisions/007-buddy-gemma-native-runtime.md)

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

The first launch needs internet to sign in. After that, the cached session lets the app open offline. User content (answers, quests, notes) stays on the device; cloud backup of it is still a Phase 7 opt-in.

## On-device model (Ask Buddy)

The chatbot runs Gemma 4 locally through `llama.rn` (llama.cpp). One dependency, one code path, Android and iOS.

| Model | Pick it for | Artifact | Size |
|---|---|---|---|
| Gemma Default (Gemma 4 E2B) | Most phones; selected by default | `gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf` + `mmproj-F16.gguf` | ~3.2 GB |
| Gemma Pro (Gemma 4 E4B) | Stronger devices with ~4.5 GB free | `gemma-4-E4B-it-qat-UD-Q2_K_XL.gguf` + `mmproj-F16.gguf` | ~4.2 GB |

Both come from the published mobile QAT GGUF repositories: [`unsloth/gemma-4-E2B-it-qat-mobile-GGUF`](https://huggingface.co/unsloth/gemma-4-E2B-it-qat-mobile-GGUF) and [`unsloth/gemma-4-E4B-it-qat-mobile-GGUF`](https://huggingface.co/unsloth/gemma-4-E4B-it-qat-mobile-GGUF).

Model files are **not** committed. Download them to the device model directory:

```
/sdcard/Android/data/com.appbuilder.buddylevelup/files/models/
```

```bash
adb push gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf /sdcard/Android/data/com.appbuilder.buddylevelup/files/models/
adb push mmproj-F16.gguf               /sdcard/Android/data/com.appbuilder.buddylevelup/files/models/gemma-4-E2B-mmproj-F16.gguf
```

The `mmproj` file is the vision projector. Without it, text chat still works and image attachments are reported as unreadable instead of being silently dropped.

The on-device model needs a **development build**, not Expo Go:

```bash
npx expo run:android
# or
npx expo run:ios
```

What works today and what does not:

- Text chat and image attachments through the projector: implemented, not yet exercised on a device.
- Audio attachments: picked and stored, but not sent. The pinned projector has no audio path.
- iOS: same code and same dependency, but unbuilt and unverified. Simulators do not support the Metal path.
- Chat history is in-memory, like the rest of the Phase 1 preview store; it resets on restart.

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
