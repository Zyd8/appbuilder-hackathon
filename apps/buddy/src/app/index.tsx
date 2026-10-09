import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BrandLogo } from '@/components/brand-logo';
import { PulseRings } from '@/components/pulse-rings';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

// Matches the native splash (app.json imageWidth 160) so the handoff is seamless.
const MARK_WIDTH = 160;
const MARK_HEIGHT = MARK_WIDTH / (1290 / 1114);
const RISE = 48;
const INTRO_MS = 2100;
const REDUCED_MS = 700;

const easeOut = Easing.out(Easing.cubic);

/** Animated brand splash, then routes to Today (returning player) or the landing page. */
export default function Splash() {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const signedIn = usePreviewStore((s) => Boolean(s.account));
  const onboarded = usePreviewStore((s) => s.onboarded);

  const rise = useSharedValue(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      rise.set(1);
      reveal.set(withTiming(1, { duration: 250 }));
    } else {
      rise.set(withDelay(250, withTiming(1, { duration: 700, easing: easeOut })));
      reveal.set(withDelay(650, withTiming(1, { duration: 600, easing: easeOut })));
    }
    const timer = setTimeout(
      () => router.replace(signedIn && onboarded ? '/today' : '/onboarding'),
      reduceMotion ? REDUCED_MS : INTRO_MS,
    );
    return () => clearTimeout(timer);
  }, [reduceMotion, signedIn, onboarded, rise, reveal]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -RISE * rise.get() }, { scale: 1 - 0.12 * rise.get() }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: reveal.get(),
    transform: [{ translateY: 16 * (1 - reveal.get()) }],
  }));

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]} accessibilityLabel={t('app.name')}>
      <Animated.View style={markStyle}>
        <PulseRings size={MARK_WIDTH * 1.25} loop={false} delay={350}>
          <BrandLogo variant="mark" height={MARK_HEIGHT} />
        </PulseRings>
      </Animated.View>
      <Animated.View style={[styles.words, wordStyle]}>
        <BrandLogo height={34} />
        <AppText variant="caption" color="textMuted" style={styles.tagline}>
          {t('app.tagline')}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Absolutely placed so the mark starts dead-center, exactly like the native splash.
  words: { position: 'absolute', top: '50%', marginTop: spacing.xxl + spacing.sm, alignItems: 'center', gap: spacing.md },
  tagline: { textAlign: 'center', paddingHorizontal: spacing.xl },
});
