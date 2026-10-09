import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { areaLabel, LIFE_AREA_ICONS } from '@/data/life-areas';
import { summarizeStats, type RankedStat } from '@/domain/stats';
import type { StatBlock } from '@/domain/types';
import { t } from '@/i18n';
import { areaColors, fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { ProgressBar } from './progress-bar';

/**
 * Every life area ranked highest first (left to right, top to bottom) as compact tiles. Two columns
 * keep the whole list inside a fit-to-contents sheet, which cannot scroll.
 */
export function StatsBreakdown({ stats }: { stats: StatBlock }) {
  return (
    <View style={styles.grid}>
      {summarizeStats(stats).ranked.map((stat) => (
        <StatTile key={stat.area} stat={stat} />
      ))}
    </View>
  );
}

function StatTile({ stat }: { stat: RankedStat }) {
  const { colors } = useTheme();
  const color = areaColors[stat.area];
  const label = areaLabel(stat.area);
  const tier = t(`stats.tier.${stat.tier}`);

  return (
    <View
      style={[styles.tile, { backgroundColor: colors.surfaceAlt }]}
      accessible
      accessibilityLabel={t('stats.rowLabel', { area: label, value: stat.value, tier })}>
      <View style={styles.top}>
        {/* Area icon chip: the area color on a 10% tint of itself (design system 3.3). */}
        <View style={[styles.chip, { backgroundColor: `${color}1A` }]}>
          <Ionicons name={LIFE_AREA_ICONS[stat.area]} size={14} color={color} />
        </View>
        <AppText variant="caption" numberOfLines={1} style={styles.label}>
          {label}
        </AppText>
        <AppText variant="bodyStrong" style={styles.mono}>
          {stat.value}
        </AppText>
      </View>
      <ProgressBar progress={stat.value / 100} color={color} trackColor={colors.surface} height={6} />
      <AppText variant="caption" color="textMuted">
        {tier}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48.5%', flexGrow: 1, gap: spacing.xs, borderRadius: radius.md, padding: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: { width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
  mono: { fontFamily: fonts.mono },
});
