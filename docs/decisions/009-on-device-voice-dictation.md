# ADR-009: On-Device Voice Dictation for Notes

- Status: accepted
- Date: 2026-10-09
- Scope: `apps/buddy`, Notes tab capture (`components/note-list.tsx`)

## Context

Typing on a phone is slow, and quick capture is the point of Notes (brief §3.7). The team wants voice input that works like a chat composer's mic: tap to start and stop, or press and hold to talk. The product rules require private, offline-first AI (brief §1, §6). AGENTS.md says local audio must not reach a cloud service without a path the user controls.

## Decision

- **Engine:** the phone's own speech recognizer through `expo-speech-recognition` (Android `SpeechRecognizer`, iOS `SFSpeechRecognizer`), started with `requiresOnDeviceRecognition: true`. There is **no cloud fallback**. If on-device recognition is not available, the mic is off and says why.
- **No audio stored:** recording persistence is never enabled. Only the text goes into the draft, and it stays on the phone like any other note.
- **Port and adapter:**
  - `domain/speech.ts` holds the port and error mapping.
  - `domain/voice-input.ts` is a pure state machine that also merges the transcript.
  - `lib/speech-recognizer.ts` is the only file that touches the SDK.
  - `lib/use-voice-input.ts` connects them to React.
- **Gestures:** tap toggles recording. A hold (250 ms) records until release. Screen readers get tap only. Dictated text streams into the draft and is **never saved on its own**. The user edits it and presses the send button.
- **Limits:**
  - English (`en-US`) only.
  - 60 s per recording.
  - Stops when the app goes to the background or the tab loses focus.
  - Notes keep their 2,000-character limit (`NOTE_MAX`).
- **Platforms:** Android 13+ (on-device recognizer and the English language pack; the app can ask the OS to download the pack) and iOS 17+.
- **Expo Go:** the native module is not bundled there, so the adapter loads it with `requireOptionalNativeModule`. The mic then appears disabled with "needs the full app build", and typing works. Voice needs a development build (`npx expo run:android`).

## Alternatives considered

- **Whisper on device (`whisper.rn`):** fully private and consistent across phones, but it needs a 75–150 MB model download and has no true live partial results. Kept as a future second adapter behind the same port for phones without an on-device recognizer.
- **Platform recognizer with network allowed:** works on more phones, but audio may be sent to Google or Apple servers. Rejected under the privacy rules.
- **Cloud speech API:** rejected for the same reason, and it needs connectivity.

## Consequences

- The Buddy app now needs a development build to show voice input. Everything else still runs in Expo Go.
- Some phones show the mic as off: Android 12 or older, no on-device recognizer, or a missing language pack until it downloads.
- Store privacy labels: the microphone is used, and audio is not collected. The iOS usage strings in `app.json` say this.

## Verification

- Unit tests: `src/domain/__tests__/voice-input.test.ts` covers tap and hold flows, release before the mic is ready, errors, cancel, timeout, transcript merging and truncation, and error mapping.
- Manual, on an Android 13+ dev build: tap and hold flows, both in **airplane mode**, permission denied then granted from Settings, the missing-language-pack prompt, backgrounding mid-recording, TalkBack, and Reduce Motion.
- Expo Go: the mic shows as unavailable, and typing and saving notes work.
