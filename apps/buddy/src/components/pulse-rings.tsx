import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/use-theme';

type PulseRingsProps = {
  children: ReactNode;
  /** Diameter of the rings at rest; they grow to ~1.8x and fade out. */
  size: number;
  /** Loop forever (loading states) or play once (intro). */
  loop?: boolean;
  delay?: number;
};

const RING_COUNT = 3;
const DURATION = 1800;

/** Soft blue rings rippling outward from the content. Static (no rings) when Reduce Motion is on. */
export function PulseRings({ children, size, loop = true, delay = 0 }: PulseRingsProps) {
  const reduceMotion = useReducedMotion();
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {reduceMotion
        ? null
        : Array.from({ length: RING_COUNT }, (_, i) => (
            <Ring key={i} size={size} loop={loop} delay={delay + (i * DURATION) / RING_COUNT} />
          ))}
      {children}
    </View>
  );
}

function Ring({ size, loop, delay }: { size: number; loop: boolean; delay: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    const run = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
    progress.set(withDelay(delay, loop ? withRepeat(run, -1) : run));
  }, [delay, loop, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - progress.get()),
    transform: [{ scale: 0.7 + progress.get() * 1.1 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: colors.primary, backgroundColor: colors.glow },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5 },
});
