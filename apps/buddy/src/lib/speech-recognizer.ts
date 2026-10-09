/**
 * `expo-speech-recognition` adapter for the speech port (ADR-008). The only file that talks to the SDK.
 * Recognition is forced on-device (`requiresOnDeviceRecognition`): audio never leaves the phone and is
 * never saved. In Expo Go the native module is missing, so every call reports "needs the full build".
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
// Type-only: importing the package itself would throw in Expo Go.
import type { ExpoSpeechRecognitionModule as SdkModule } from 'expo-speech-recognition';

import { mapSpeechError, type SpeechAvailability, type SpeechRecognizerPort } from '@/domain/speech';

type Sdk = typeof SdkModule;

let cached: Sdk | null | undefined;

function sdk(): Sdk | null {
  if (cached !== undefined) return cached;
  cached =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? null
      : requireOptionalNativeModule<Sdk>('ExpoSpeechRecognition');
  return cached;
}

function checkAvailability(): SpeechAvailability {
  const mod = sdk();
  if (!mod) return { ready: false, reason: 'needs-build' };
  // On-device recognition needs Android 13 (API 33) or newer.
  if (Platform.OS === 'android' && Number(Platform.Version) < 33) return { ready: false, reason: 'unsupported-os' };
  try {
    if (!mod.isRecognitionAvailable() || !mod.supportsOnDeviceRecognition()) return { ready: false, reason: 'no-on-device' };
  } catch {
    return { ready: false, reason: 'no-on-device' };
  }
  return { ready: true };
}

async function requestPermission(): Promise<boolean> {
  const mod = sdk();
  if (!mod) return false;
  try {
    // Android on-device needs only the mic. iOS also asks for speech recognition.
    if (Platform.OS === 'android') {
      const current = await mod.getMicrophonePermissionsAsync();
      if (current.granted) return true;
      return current.canAskAgain ? (await mod.requestMicrophonePermissionsAsync()).granted : false;
    }
    const current = await mod.getPermissionsAsync();
    if (current.granted) return true;
    return current.canAskAgain ? (await mod.requestPermissionsAsync()).granted : false;
  } catch {
    return false;
  }
}

export const speechRecognizer: SpeechRecognizerPort = {
  checkAvailability,
  requestPermission,

  start: ({ locale }) => {
    sdk()?.start({
      lang: locale,
      interimResults: true,
      // Keeps listening through pauses until the user stops (Android 13+, iOS).
      continuous: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: true,
      maxAlternatives: 1,
    });
  },

  stop: () => sdk()?.stop(),
  abort: () => sdk()?.abort(),

  downloadLanguagePack: async (locale) => {
    const mod = sdk();
    if (!mod || Platform.OS !== 'android') return false;
    try {
      await mod.androidTriggerOfflineModelDownload({ locale });
      return true;
    } catch {
      return false;
    }
  },

  subscribe: (handlers) => {
    const mod = sdk();
    if (!mod) return () => {};
    const subs = [
      mod.addListener('result', (event) => {
        const text = event.results[0]?.transcript ?? '';
        if (event.isFinal) handlers.onFinal(text);
        else handlers.onPartial(text);
      }),
      mod.addListener('error', (event) => handlers.onError(mapSpeechError(event.error))),
      mod.addListener('end', () => handlers.onEnd()),
    ];
    return () => subs.forEach((sub) => sub.remove());
  },
};
