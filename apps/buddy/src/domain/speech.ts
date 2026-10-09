/**
 * Speech-to-text port (ADR-009). Domain code depends on this interface only; the
 * `expo-speech-recognition` adapter lives in `src/lib/speech-recognizer.ts`.
 * Recognition must run on the device: there is no cloud fallback.
 */

/** Why voice input cannot run at all on this install. */
export type SpeechUnavailableReason =
  /** Expo Go or a build without the native module. */
  | 'needs-build'
  /** Android 12 or older: no on-device recognizer. */
  | 'unsupported-os'
  /** The phone has no on-device recognizer we can use. */
  | 'no-on-device';

export type SpeechAvailability = { ready: true } | { ready: false; reason: SpeechUnavailableReason };

/** Recognition failures, normalized from the platform's error codes. */
export type SpeechErrorKind =
  /** We called `abort()` ourselves. Not shown to the user. */
  | 'aborted'
  | 'no-speech'
  | 'not-allowed'
  | 'audio-capture'
  | 'busy'
  /** The on-device language pack is missing. */
  | 'language-not-supported'
  | 'interrupted'
  | 'unknown';

export interface SpeechHandlers {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (kind: SpeechErrorKind) => void;
  /** Always the last event of a session, including after errors. */
  onEnd: () => void;
}

export interface SpeechRecognizerPort {
  checkAvailability: () => SpeechAvailability;
  /** Asks only when needed. Resolves `true` when the mic may be used. */
  requestPermission: () => Promise<boolean>;
  start: (options: { locale: string }) => void;
  /** Stops listening and delivers a final result. */
  stop: () => void;
  /** Cancels without a final result (emits `aborted`, then end). */
  abort: () => void;
  /** Ask the OS to download the on-device language pack. Needs internet once. */
  downloadLanguagePack: (locale: string) => Promise<boolean>;
  subscribe: (handlers: SpeechHandlers) => () => void;
}

/** English only at launch (plan 004). */
export const SPEECH_LOCALE = 'en-US';

/** Maps a platform error code (Web Speech style, as `expo-speech-recognition` reports them) to ours. */
export function mapSpeechError(code: string): SpeechErrorKind {
  switch (code) {
    case 'aborted':
    case 'no-speech':
    case 'not-allowed':
    case 'audio-capture':
    case 'busy':
    case 'language-not-supported':
    case 'interrupted':
      return code;
    case 'speech-timeout':
      return 'no-speech';
    // On-device only: a missing or disabled recognizer means the language pack is not usable.
    case 'service-not-allowed':
      return 'language-not-supported';
    default:
      return 'unknown';
  }
}
