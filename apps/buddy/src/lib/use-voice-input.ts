import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { SPEECH_LOCALE, type SpeechAvailability, type SpeechRecognizerPort } from '@/domain/speech';
import { IDLE, isActive, liveText, transition, VOICE_MAX_MS, type VoiceEffect, type VoiceEvent, type VoiceState } from '@/domain/voice-input';

import { speechRecognizer } from './speech-recognizer';

type Options = {
  /** Off: no listeners, no permission prompts. */
  enabled: boolean;
  draft: string;
  setDraft: (text: string) => void;
  port?: SpeechRecognizerPort;
};

/**
 * Runs the voice-input state machine (`domain/voice-input.ts`) against the speech port.
 * Dictated text streams into the draft; the user still edits and saves it.
 * Recording stops when the screen loses focus, the app goes to the background, or after 60 s.
 */
export function useVoiceInput({ enabled, draft, setDraft, port = speechRecognizer }: Options) {
  const [state, setState] = useState<VoiceState>(IDLE);
  const [availability] = useState<SpeechAvailability>(() =>
    enabled ? port.checkAvailability() : { ready: false, reason: 'needs-build' },
  );
  const stateRef = useRef<VoiceState>(IDLE);
  const setDraftRef = useRef(setDraft);

  useEffect(() => {
    setDraftRef.current = setDraft;
  }, [setDraft]);

  const dispatch = useCallback(
    function dispatch(event: VoiceEvent) {
      const { state: next, effect } = transition(stateRef.current, event);
      if (next === stateRef.current) return;
      stateRef.current = next;
      setState(next);
      if (isActive(next)) setDraftRef.current(liveText(next).text);
      if (effect) run(effect);

      function run(todo: VoiceEffect) {
        switch (todo) {
          case 'request-permission':
            void port.requestPermission().then((ok) => dispatch({ type: ok ? 'PERMISSION_OK' : 'PERMISSION_DENIED' }));
            return;
          case 'start':
            try {
              port.start({ locale: SPEECH_LOCALE });
            } catch {
              dispatch({ type: 'ERROR', kind: 'unknown' });
            }
            return;
          case 'stop':
            port.stop();
            return;
          case 'abort':
            port.abort();
            return;
        }
      }
    },
    [port],
  );

  // Recognizer events.
  useEffect(() => {
    if (!enabled || !availability.ready) return;
    return port.subscribe({
      onPartial: (text) => dispatch({ type: 'PARTIAL', text }),
      onFinal: (text) => dispatch({ type: 'FINAL', text }),
      onError: (kind) => dispatch({ type: 'ERROR', kind }),
      onEnd: () => dispatch({ type: 'ENDED' }),
    });
  }, [enabled, availability.ready, port, dispatch]);

  // Safety cap on recording length.
  const listening = state.status === 'listening';
  useEffect(() => {
    if (!listening) return;
    const timer = setTimeout(() => dispatch({ type: 'TIMEOUT' }), VOICE_MAX_MS);
    return () => clearTimeout(timer);
  }, [listening, dispatch]);

  // Stop when the app leaves the foreground.
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') dispatch({ type: 'CANCEL' });
    });
    return () => sub.remove();
  }, [enabled, dispatch]);

  // Stop when the tab loses focus or the screen unmounts.
  useFocusEffect(
    useCallback(() => {
      return () => dispatch({ type: 'CANCEL' });
    }, [dispatch]),
  );

  const unavailable = () => {
    if (!availability.ready) dispatch({ type: 'NOTICE', notice: availability.reason });
    return !availability.ready;
  };

  return {
    state,
    availability,
    onTap: () => {
      if (!unavailable()) dispatch({ type: 'TAP', draft });
    },
    onHoldStart: () => {
      if (!unavailable()) dispatch({ type: 'HOLD_START', draft });
    },
    onHoldEnd: () => dispatch({ type: 'HOLD_END' }),
    dismiss: () => dispatch({ type: 'DISMISS' }),
    downloadLanguagePack: async () => {
      if (await port.downloadLanguagePack(SPEECH_LOCALE)) dispatch({ type: 'NOTICE', notice: 'pack-requested' });
    },
    openSettings: () => void Linking.openSettings(),
  };
}
