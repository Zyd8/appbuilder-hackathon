import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet } from 'react-native';

import type { VoiceMode } from '@/domain/voice-input';
import { t } from '@/i18n';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { PulseRings } from './pulse-rings';

type MicButtonProps = {
  /** `requesting` and `finalizing` count as busy. */
  status: 'idle' | 'requesting' | 'listening' | 'finalizing';
  mode?: VoiceMode;
  /** Unavailable mics still respond to taps, so the caller can explain why. */
  available: boolean;
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  size?: number;
};

/** How long a press must last to become push-to-talk. */
const HOLD_DELAY_MS = 250;

/**
 * Voice input button, like a chat composer's mic: tap to start and tap again to stop,
 * or press and hold to talk and let go to stop. Screen readers get tap only.
 */
export function MicButton({ status, mode, available, onTap, onHoldStart, onHoldEnd, size = 28 }: MicButtonProps) {
  const { colors } = useTheme();
  const screenReader = useScreenReader();
  const holding = useRef(false);
  const live = status === 'listening' || status === 'finalizing';
  const busy = status === 'requesting' || status === 'finalizing';
  const icon = !live ? 'mic-outline' : mode === 'tap' ? 'stop' : 'mic';
  const fg = live ? colors.onPrimary : colors.primary;
  // Keep the touch target at least 44 pt.
  const slop = Math.max(0, Math.ceil((44 - size) / 2));

  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={live ? t('notes.voice.stop') : t('notes.voice.start')}
      accessibilityHint={screenReader ? t('notes.voice.hintScreenReader') : t('notes.voice.hint')}
      accessibilityState={{ busy, disabled: !available }}
      hitSlop={slop}
      delayLongPress={HOLD_DELAY_MS}
      onPress={onTap}
      onLongPress={
        screenReader
          ? undefined
          : () => {
              holding.current = true;
              onHoldStart();
            }
      }
      onPressOut={() => {
        if (!holding.current) return;
        holding.current = false;
        onHoldEnd();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          backgroundColor: live ? colors.primary : colors.surfaceAlt,
          opacity: !available ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}>
      <Ionicons name={icon} size={Math.round(size * 0.57)} color={fg} />
    </Pressable>
  );

  // Rings ripple while listening (none with Reduce Motion). The wrapper always renders so the
  // Pressable is never remounted mid-press, which would lose the release of a hold.
  return (
    <PulseRings size={size} active={status === 'listening'}>
      {button}
    </PulseRings>
  );
}

function useScreenReader() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (mounted) setEnabled(on);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return enabled;
}

const styles = StyleSheet.create({
  button: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
