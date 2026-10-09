import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { spacing } from '@/theme/tokens';

// Temporary hero art until the final mascot lands; BuddyMascot moods come back with it.
const AVATAR = require('../../assets/images/simoy-avatar.png');

/**
 * The player's avatar standing on the bottom edge of a `GradientPanel` row (Today and Player heroes).
 * Assumes the panel uses `spacing.md` padding; the panel clips the part that sinks below its edge.
 */
export function HeroAvatar({ accessibilityLabel }: { accessibilityLabel: string }) {
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, bob]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -BOB * bob.get() }] }));

  return (
    <View style={styles.column}>
      {/* `contain` keeps the whole avatar visible; it stands on the bottom edge of the panel. */}
      <Animated.View style={style}>
        <Image source={AVATAR} style={styles.avatar} contentFit="contain" accessibilityLabel={accessibilityLabel} />
      </Animated.View>
    </View>
  );
}

const BOB = 6;
const AVATAR_SIZE = 156;
/** The PNG has ~10% transparent margin on each side, so the art can bleed into the panel padding. */
const AVATAR_COLUMN = 132;
/** How far the avatar sinks past the panel's bottom edge. */
const AVATAR_SINK = 12;

const styles = StyleSheet.create({
  // Negative margin sinks the avatar below the panel's bottom edge, so the torso crop is hidden.
  column: {
    width: AVATAR_COLUMN,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    marginBottom: -(spacing.md + AVATAR_SINK),
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, marginLeft: -16 },
});
