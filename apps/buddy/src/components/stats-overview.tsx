import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { areaLabel, LIFE_AREA_ICONS } from '@/data/life-areas';
import { summarizeStats } from '@/domain/stats';
import type { LifeArea, StatBlock } from '@/domain/types';
import { t } from '@/i18n';
import { areaColors, fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { Card } from './card';
import { StatRadar } from './stat-radar';

/** Overall score, strongest and grow-next areas, and the radar. Tapping the radar opens the full breakdown sheet. */
export function StatsOverview({ stats }: { stats: StatBlock }) {
  const { colors } = useTheme();
  const summary = summarizeStats(stats);

  return (
    <Card>
      <View style={styles.summary}>
        <SummaryTile label={t('stats.overall')}>
          <AppText variant="title" color="primary" style={styles.mono}>
            {summary.average}
          </AppText>
        </SummaryTile>
        <SummaryTile label={t('stats.strongest')}>
          <AreaName area={summary.top.area} />
        </SummaryTile>
        <SummaryTile label={t('stats.growNext')}>
          <AreaName area={summary.lowest.area} />
        </SummaryTile>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('stats.openBreakdown')}
        onPress={() => router.push('/stats')}
        style={({ pressed }) => [styles.center, pressed && styles.pressed]}>
        <StatRadar stats={stats} size={240} />
        <View style={styles.hint}>
          <AppText variant="caption" color="primary">
            {t('stats.tapForBreakdown')}
          </AppText>
          <Ionicons name="chevron-up" size={14} color={colors.primary} />
        </View>
      </Pressable>
    </Card>
  );
}

function SummaryTile({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surfaceAlt }]}>
      <AppText variant="overline" color="textMuted" numberOfLines={1}>
        {label.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

function AreaName({ area }: { area: LifeArea }) {
  return (
    <View style={styles.areaName}>
      <Ionicons name={LIFE_AREA_ICONS[area]} size={16} color={areaColors[area]} />
      <AppText variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.flex}>
        {areaLabel(area)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, gap: spacing.xs, borderRadius: radius.md, padding: spacing.md },
  areaName: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  center: { alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mono: { fontFamily: fonts.mono },
});
