# TODO 001: Refactor Google login to native sign-in

- Status: open (refactor soon)
- Related: ADR-005, `apps/buddy/src/lib/auth.ts`

## Why

Google login currently uses Supabase OAuth in an in-app browser (`signInWithOAuth` + `expo-web-browser`). We chose it because it works in Expo Go. However:

- the user leaves the app for a browser sheet instead of the phone's native Google account picker;
- the redirect depends on deep-link allow-listing (`exp://**`, `buddylevelup://**`), which is fragile across Expo Go, dev builds and release builds.

Phase 5 already needs a development build for the on-device model, so switching to native sign-in will cost little at that point.

## Target

- `@react-native-google-signin/google-signin` (Expo config plugin) → Google ID token → `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- Only `signInWithGoogle()` in `src/lib/auth.ts` changes. `saveProfileLocalFirst`, the `profiles` table and the screens stay the same.

## Needed from the team

- Google Cloud OAuth client IDs: **Web** (already used by Supabase), **Android** (package `com.appbuilder.buddylevelup` + SHA-1 of the debug/release signing keys), **iOS** (bundle id `com.appbuilder.buddylevelup`).
- Add the Android/iOS client IDs to the Supabase Google provider's "Authorized Client IDs".

## Acceptance criteria

- Sign-in shows the native account picker on Android (and iOS if targeted), with no browser sheet.
- The existing account unit tests still pass; a new test covers the ID-token result mapping.
- Cancel, offline and error states behave as they do today.
- ADR-005 is updated to reference native sign-in, and this note is closed.
