import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { ProgressBar } from './progress-bar';

type LevelMeterProps = {
  level: number;
  title: string;
  /** 0..1 progress into the current level. */
  progress: number;
  xpLabel: string;
};

/** White "LV n" badge beside the player title and a thin XP bar. Only for use on the brand gradient. */
export function LevelMeter({ level, title, progress, xpLabel }: LevelMeterProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessible accessibilityLabel={`${t('player.level', { level })}, ${title}, ${xpLabel}`}>
      <View style={[styles.badge, { backgroundColor: colors.surface }]}>
        <AppText variant="overline" color="primary" style={styles.badgeLabel}>
          {t('player.levelShort')}
        </AppText>
        <AppText variant="bodyStrong" color="primary" style={styles.badgeNumber}>
          {level}
        </AppText>
      </View>
      <View style={styles.info}>
        <AppText variant="caption" color="onPrimary" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <ProgressBar progress={progress} height={6} color={colors.onPrimary} trackColor={colors.onPrimaryTrack} />
        <AppText variant="caption" color="onPrimary" style={styles.xp}>
          {xpLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { fontSize: 9, lineHeight: 10 },
  badgeNumber: { lineHeight: 18 },
  info: { flex: 1, gap: spacing.xs },
  title: { fontWeight: '700' },
  xp: { opacity: 0.85 },
});
