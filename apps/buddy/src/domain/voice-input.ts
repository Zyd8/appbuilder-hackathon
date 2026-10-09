/**
 * Voice input for note capture (ADR-009): tap to toggle, or press and hold to talk.
 * Pure state machine; `src/lib/use-voice-input.ts` runs the effects it asks for.
 * Dictated text streams into the draft and is never saved on its own.
 */
import { NOTE_MAX } from './notes';
import type { SpeechErrorKind, SpeechUnavailableReason } from './speech';

export type VoiceMode = 'tap' | 'hold';

/** One-line message shown under the input once voice input stops. */
export type VoiceNotice = Exclude<SpeechErrorKind, 'aborted'> | SpeechUnavailableReason | 'truncated' | 'pack-requested';

type Session = {
  mode: VoiceMode;
  /** The draft when recording started; dictated text is appended to it. */
  base: string;
  /** Final segments so far (Android continuous mode sends several). */
  finals: string[];
  interim: string;
};

export type VoiceState =
  | { status: 'idle'; notice?: VoiceNotice }
  | { status: 'requesting'; mode: VoiceMode; base: string }
  | ({ status: 'listening' } & Session)
  | ({ status: 'finalizing' } & Session);

export type VoiceEvent =
  | { type: 'TAP'; draft: string }
  | { type: 'HOLD_START'; draft: string }
  | { type: 'HOLD_END' }
  | { type: 'PERMISSION_OK' }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'PARTIAL'; text: string }
  | { type: 'FINAL'; text: string }
  | { type: 'ERROR'; kind: SpeechErrorKind }
  | { type: 'ENDED' }
  /** Screen lost focus, app went to the background, or unmount. */
  | { type: 'CANCEL' }
  /** Safety cap on recording length. */
  | { type: 'TIMEOUT' }
  | { type: 'NOTICE'; notice: VoiceNotice }
  | { type: 'DISMISS' };

export type VoiceEffect = 'request-permission' | 'start' | 'stop' | 'abort';

export type Transition = { state: VoiceState; effect?: VoiceEffect };

export const IDLE: VoiceState = { status: 'idle' };

/** Longest single recording before it stops on its own. */
export const VOICE_MAX_MS = 60_000;

const ERROR_NOTICE: Record<Exclude<SpeechErrorKind, 'aborted'>, VoiceNotice> = {
  'no-speech': 'no-speech',
  'not-allowed': 'not-allowed',
  'audio-capture': 'audio-capture',
  busy: 'busy',
  'language-not-supported': 'language-not-supported',
  interrupted: 'interrupted',
  unknown: 'unknown',
};

export function isActive(state: VoiceState): state is Extract<VoiceState, { status: 'listening' | 'finalizing' }> {
  return state.status === 'listening' || state.status === 'finalizing';
}

export function transition(state: VoiceState, event: VoiceEvent): Transition {
  switch (event.type) {
    case 'TAP':
      if (state.status === 'idle') return { state: { status: 'requesting', mode: 'tap', base: event.draft }, effect: 'request-permission' };
      // Tapping while the mic is getting ready cancels.
      if (state.status === 'requesting' && state.mode === 'tap') return { state: IDLE };
      if (state.status === 'listening' && state.mode === 'tap') return { state: { ...state, status: 'finalizing' }, effect: 'stop' };
      return { state };

    case 'HOLD_START':
      if (state.status === 'idle') return { state: { status: 'requesting', mode: 'hold', base: event.draft }, effect: 'request-permission' };
      return { state };

    case 'HOLD_END':
      // Released before the mic was ready (e.g. the permission dialog took the touch): don't start.
      if (state.status === 'requesting' && state.mode === 'hold') return { state: IDLE };
      if (state.status === 'listening' && state.mode === 'hold') return { state: { ...state, status: 'finalizing' }, effect: 'stop' };
      return { state };

    case 'PERMISSION_OK':
      if (state.status !== 'requesting') return { state };
      return { state: { status: 'listening', mode: state.mode, base: state.base, finals: [], interim: '' }, effect: 'start' };

    case 'PERMISSION_DENIED':
      if (state.status !== 'requesting') return { state };
      return { state: { status: 'idle', notice: 'not-allowed' } };

    case 'PARTIAL':
      if (!isActive(state)) return { state };
      return { state: { ...state, interim: event.text } };

    case 'FINAL':
      if (!isActive(state)) return { state };
      return { state: { ...state, finals: [...state.finals, event.text], interim: '' } };

    case 'ERROR': {
      if (event.kind === 'aborted') return { state };
      if (state.status === 'idle') return { state };
      // Some recognizers report "no speech" after a pause even though words were heard.
      if (event.kind === 'no-speech' && isActive(state) && joinSegments([...state.finals, state.interim])) return { state: IDLE };
      // Text already shown in the draft stays there.
      return { state: { status: 'idle', notice: ERROR_NOTICE[event.kind] } };
    }

    case 'ENDED':
      if (!isActive(state)) return { state };
      return { state: liveText(state).truncated ? { status: 'idle', notice: 'truncated' } : IDLE };

    case 'CANCEL':
      if (isActive(state)) return { state: IDLE, effect: 'abort' };
      if (state.status === 'requesting') return { state: IDLE };
      return { state };

    case 'TIMEOUT':
      if (state.status === 'listening') return { state: { ...state, status: 'finalizing' }, effect: 'stop' };
      return { state };

    case 'NOTICE':
      if (state.status !== 'idle') return { state };
      return { state: { status: 'idle', notice: event.notice } };

    case 'DISMISS':
      if (state.status === 'idle' && state.notice) return { state: IDLE };
      return { state };
  }
}

/** Joins dictated segments in order, one space apart. */
export function joinSegments(segments: readonly string[]): string {
  return segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Appends dictated text to the draft: one space between them, a capital letter at the start
 * of a sentence, and no more than `maxLength` characters.
 */
export function mergeTranscript(base: string, addition: string, maxLength = NOTE_MAX): { text: string; truncated: boolean } {
  let spoken = addition.trim().replace(/\s+/g, ' ');
  if (!spoken) return { text: base.slice(0, maxLength), truncated: base.length > maxLength };

  const startsSentence = base.trim() === '' || /[.!?]\s*$/.test(base);
  if (startsSentence) spoken = spoken.charAt(0).toUpperCase() + spoken.slice(1);

  const separator = base === '' || /\s$/.test(base) ? '' : ' ';
  const full = base + separator + spoken;
  return full.length > maxLength ? { text: full.slice(0, maxLength), truncated: true } : { text: full, truncated: false };
}

/** What the input shows while recording: the starting draft plus everything heard so far. */
export function liveText(session: Session): { text: string; truncated: boolean } {
  return mergeTranscript(session.base, joinSegments([...session.finals, session.interim]));
}
