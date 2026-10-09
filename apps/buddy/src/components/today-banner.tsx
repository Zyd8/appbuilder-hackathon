import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import type { BuddyMood } from '@/components/buddy-mascot';
import { GradientPanel } from '@/components/gradient-panel';
import { ProgressBar } from '@/components/progress-bar';
import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

// Temporary banner art until the final mascot lands; BuddyMascot moods come back with it.
const AVATAR = require('../../assets/images/simoy-avatar.png');

type TodayBannerProps = {
  greeting: string;
  level: number;
  title: string;
  /** 0..1 progress into the current level. */
  progress: number;
  xpLabel: string;
  message: string;
  mood: BuddyMood;
};

/** Today's hero: Buddy stands on the left and speaks one goal-aligned line to the player. */
export function TodayBanner({ greeting, level, title, progress, xpLabel, message, mood }: TodayBannerProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(200) : FadeInDown.duration(500)}>
      <GradientPanel style={styles.panel}>
        <BuddyColumn mood={mood} />

        <View style={styles.content}>
          <AppText
            variant="title"
            color="onPrimary"
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {greeting}
          </AppText>

          <View
            style={styles.levelRow}
            accessible
            accessibilityLabel={`${t('player.level', { level })}, ${title}, ${xpLabel}`}>
            <View style={[styles.levelBadge, { backgroundColor: colors.surface }]}>
              <AppText variant="overline" color="primary" style={styles.levelBadgeLabel}>
                {t('player.levelShort')}
              </AppText>
              <AppText variant="bodyStrong" color="primary" style={styles.levelBadgeNumber}>
                {level}
              </AppText>
            </View>
            <View style={styles.levelInfo}>
              <AppText variant="caption" color="onPrimary" numberOfLines={1} style={styles.levelTitle}>
                {title}
              </AppText>
              <ProgressBar progress={progress} height={6} color={colors.onPrimary} trackColor={colors.onPrimaryTrack} />
              <AppText variant="caption" color="onPrimary" style={styles.xpLabel}>
                {xpLabel}
              </AppText>
            </View>
          </View>

          <View style={styles.bubbleWrap}>
            {/* Tail points left, back at Buddy. */}
            <View style={[styles.tail, { backgroundColor: colors.surface }]} />
            <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
              <AppText>{message}</AppText>
            </View>
          </View>
        </View>
      </GradientPanel>
    </Animated.View>
  );
}

function BuddyColumn({ mood }: { mood: BuddyMood }) {
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, bob]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -BOB * bob.get() }] }));

  return (
    <View style={styles.buddyColumn}>
      {/* `contain` keeps the whole avatar visible; it stands on the bottom edge of the banner. */}
      <Animated.View style={style}>
        <Image source={AVATAR} style={styles.avatar} contentFit="contain" accessibilityLabel={`Buddy looks ${mood}`} />
      </Animated.View>
    </View>
  );
}

const BOB = 6;
const AVATAR_SIZE = 156;
/** The PNG has ~10% transparent margin on each side, so the art can bleed into the panel padding. */
const AVATAR_COLUMN = 132;
/** How far the avatar sinks past the card's bottom edge (the panel clips it). */
const AVATAR_SINK = 12;

const styles = StyleSheet.create({
  panel: { padding: spacing.md, flexDirection: 'row', gap: spacing.md },
  // Negative margin sinks the avatar below the panel's bottom edge, so the torso crop is hidden.
  buddyColumn: {
    width: AVATAR_COLUMN,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    marginBottom: -(spacing.md + AVATAR_SINK),
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, marginLeft: -16 },
  content: { flex: 1, gap: spacing.sm, paddingVertical: spacing.xs },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelBadge: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeLabel: { fontSize: 9, lineHeight: 10 },
  levelBadgeNumber: { lineHeight: 18 },
  levelInfo: { flex: 1, gap: spacing.xs },
  levelTitle: { fontWeight: '700' },
  xpLabel: { opacity: 0.85 },
  bubbleWrap: { marginTop: spacing.xs, justifyContent: 'center' },
  tail: {
    position: 'absolute',
    left: -5,
    width: 14,
    height: 14,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  bubble: { borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
});
