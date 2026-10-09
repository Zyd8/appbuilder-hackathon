import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { GradientPanel } from '@/components/gradient-panel';
import { HeroAvatar } from '@/components/hero-avatar';
import { LevelMeter } from '@/components/level-meter';
import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type PlayerBannerProps = {
  name: string;
  level: number;
  title: string;
  /** 0..1 progress into the current level. */
  progress: number;
  xpLabel: string;
  streakDays: number;
  restTokens: number;
};

/** Player hero: same avatar and layout as the Today banner, with streak pills instead of a speech bubble. */
export function PlayerBanner({ name, level, title, progress, xpLabel, streakDays, restTokens }: PlayerBannerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(200) : FadeInDown.duration(500)}>
      <GradientPanel style={styles.panel}>
        <HeroAvatar accessibilityLabel={t('player.avatar', { name })} />

        <View style={styles.content}>
          <AppText
            variant="title"
            color="onPrimary"
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {name}
          </AppText>

          <LevelMeter level={level} title={title} progress={progress} xpLabel={xpLabel} />

          <View style={styles.pills}>
            <Pill icon="flame" label={t('player.streak', { count: streakDays })} />
            <Pill
              icon="moon"
              label={t('player.restShort', { count: restTokens })}
              accessibilityLabel={t('player.restTokens', { count: restTokens })}
            />
          </View>
        </View>
      </GradientPanel>
    </Animated.View>
  );
}

function Pill({
  icon,
  label,
  accessibilityLabel,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface }]} accessible accessibilityLabel={accessibilityLabel ?? label}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <AppText variant="caption" color="primary" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, flexDirection: 'row', gap: spacing.md },
  content: { flex: 1, gap: spacing.sm, paddingVertical: spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
