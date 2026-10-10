# Angat mobile app

This directory contains the Android/iOS React Native app for the AppBuilder Hackathon entry.

Angat is a local-first self-improvement companion. It uses onboarding answers, a local SQLite-backed player state, local model inference, and a controlled Bambot tool layer to turn small goals into daily action.

For the hackathon story and complete setup, read the repository root `README.md` first.

## Requirements

- Node.js 22.x recommended.
- npm 10+.
- Android Studio/Android SDK for native Android builds.
- JDK 17 for Gradle.
- A physical ARM64 Android phone for the native model demo. The primary test device is a Pixel 9A.
- Supabase project plus Google provider configuration for the full sign-in/onboarding flow.

## Install

```bash
cd apps/buddy
npm install
```

Create local environment configuration from the template:

```bash
cp .env.example .env.local
```

Set only the public Supabase values:

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Do not put a service-role key, OAuth client secret, database password, or private key in the app environment.

## Expo Go UI preview

Expo Go is suitable for navigation and UI review. It is not the runtime for llama.cpp, the native model, or on-device voice recognition.

```bash
npm start
```

Scan the QR code in Expo Go.

For Google OAuth in Expo Go, use the tunnel:

```bash
npm run start:tunnel
```

## Supabase setup

The full demo requires Google sign-in before onboarding.

1. Enable Google under Supabase Authentication → Providers.
2. Configure the Google web OAuth callback:
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Add Supabase redirect URLs:
   - `exp://**`
   - `buddylevelup://**`
4. Apply all migrations in `supabase/migrations/`.

The current migrations cover profiles, onboarding backup, notes backup, notes ordering, and the related owner-only RLS policies.

The app stores local state first. Cloud operations are backup/sync paths, not the local inference path.

## Native Android development build

Connect a phone and authorize USB debugging:

```bash
adb devices -l
```

Build/install the development client:

```bash
npm run android
```

This compiles native modules, including llama.cpp. The first build can take a long time and requires several gigabytes of free disk space.

If your shell does not already expose the Android/JDK paths:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/.local/jdk-17"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

## Local model setup

Open the Bambot tab in the app and choose Install model.

The current catalog contains:

- Qwen3 1.7B Q4_K_M — default, about 1.11 GB, text-first and the safer agent/tool choice.
- Qwen3.5 0.8B Q4_K_M — experimental, about 533 MB plus optional vision projector.
- Gemma 4 entries — retired compatibility entries; not recommended for new installs.

Models are downloaded to app-private storage and verified by size and SHA-256. Model weights are never committed to Git.

Qwen3.5 is not automatically the default. Test its tool-call reliability, speed, memory usage, and image path on the target phone first.

## Release build

The generated Gradle template currently points the release build at the debug keystore. That can produce an installable release-like APK for testing, but it is not production signing.

For a test release APK:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/.local/jdk-17"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
./android/gradlew -p android app:assembleRelease \
  --configure-on-demand --build-cache \
  -PreactNativeArchitectures=arm64-v8a
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Before distributing publicly, replace the debug signing configuration with a real protected release keystore. Never commit the keystore or passwords.

## Demo walkthrough

1. Start online.
2. Sign in with Google.
3. Complete onboarding.
4. Install a local model from Bambot.
5. Wait for the model to become ready.
6. Open Today and wait for three locally generated goals.
7. Turn on airplane mode and disable Wi-Fi.
8. Ask Bambot to read your stats, insights, quest state, XP, and notes.
9. Ask it to create a todo and confirm the write.
10. Complete a quest with the required proof photo.
11. Verify XP, level, and rank update.
12. Restart the app and verify local state remains available.

## Verification

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npx expo-doctor
```

Important acceptance limits:

- No iOS native inference claim without a real iOS run.
- No audio inference claim; audio attachments remain unsupported.
- No cloud inference fallback.
- No model weights in the APK or repository.
- No success claim for a tool write without confirmation and read-back.

## Source layout

```text
src/app/                 Expo Router screens
src/components/          UI components
src/domain/              Pure rules and deterministic services
src/features/buddy/      Local model, agent tools, memory, chat, quest generation
src/lib/                 Storage, SQLite, auth, sync, and native adapters
src/state/               Presentation/orchestration store
src/i18n/                User-facing strings
supabase/migrations/     Database migrations and RLS
```
