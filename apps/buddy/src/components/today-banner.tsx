import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import type { BuddyMood } from '@/components/buddy-mascot';
import { GradientPanel } from '@/components/gradient-panel';
import { HeroAvatar } from '@/components/hero-avatar';
import { LevelMeter } from '@/components/level-meter';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

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
        <HeroAvatar accessibilityLabel={`Buddy looks ${mood}`} />

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

          <LevelMeter level={level} title={title} progress={progress} xpLabel={xpLabel} />

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

const styles = StyleSheet.create({
  panel: { padding: spacing.md, flexDirection: 'row', gap: spacing.md },
  content: { flex: 1, gap: spacing.sm, paddingVertical: spacing.xs },
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
