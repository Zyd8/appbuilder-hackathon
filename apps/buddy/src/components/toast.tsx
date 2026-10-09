import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { BuddyMascot } from './buddy-mascot';

interface ToastState {
  message?: string;
  key: number;
  show: (message: string) => void;
  hide: () => void;
}

export const useToast = create<ToastState>()((set) => ({
  message: undefined,
  key: 0,
  show: (message) => set((s) => ({ message, key: s.key + 1 })),
  hide: () => set({ message: undefined }),
}));

export function ToastHost() {
  const { message, key, hide } = useToast();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 2800);
    return () => clearTimeout(timer);
  }, [message, key, hide]);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
      <Animated.View
        key={key}
        entering={FadeInUp}
        exiting={FadeOutUp}
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
        <BuddyMascot mood="celebrating" size={36} />
        <AppText variant="bodyStrong" style={styles.text}>
          {message}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', zIndex: 10 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    maxWidth: 480,
    elevation: 6,
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  text: { flexShrink: 1 },
});
