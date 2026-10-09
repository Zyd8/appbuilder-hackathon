import { StyleSheet, View } from 'react-native';

import { buildActivityGrid, dateKey, type ActivityLevel } from '@/domain/activity';
import type { Quest } from '@/domain/types';
import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { Card } from './card';

const WEEKS = 16;
const GAP = 3;
/** Fill strength per level, as a hex alpha on `primary` (level 0 uses `surfaceAlt`). */
const LEVEL_ALPHA: Record<Exclude<ActivityLevel, 0>, string> = { 1: '40', 2: '73', 3: 'B3', 4: 'FF' };

/**
 * GitHub-style contribution grid of the player's own record: one square per day, darker for more
 * quests completed. Reads the on-device quest history, so it works offline.
 */
export function ActivityGrid({ history, now = new Date() }: { history: Quest[]; now?: Date }) {
  const { colors } = useTheme();
  const grid = buildActivityGrid(history, now, WEEKS);
  const today = dateKey(now);

  const fill = (level: ActivityLevel) => (level === 0 ? colors.surfaceAlt : `${colors.primary}${LEVEL_ALPHA[level]}`);
  const summary =
    grid.total === 0
      ? t('activity.empty')
      : t('activity.summary', { count: grid.total, days: grid.activeDays, weeks: WEEKS });

  return (
    <Card accessible accessibilityLabel={summary}>
      <View style={styles.months}>
        {grid.weeks.map((week, i) => {
          const first = new Date(`${week[0].date}T12:00:00`);
          const prev = i > 0 ? new Date(`${grid.weeks[i - 1][0].date}T12:00:00`) : undefined;
          const show = !prev || prev.getMonth() !== first.getMonth();
          return (
            <View key={week[0].date} style={styles.monthCell}>
              {show ? (
                <AppText variant="overline" color="textMuted" numberOfLines={1} style={styles.monthLabel}>
                  {first.toLocaleDateString(undefined, { month: 'short' })}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.grid} importantForAccessibility="no-hide-descendants">
        {grid.weeks.map((week) => (
          <View key={week[0].date} style={styles.column}>
            {week.map((day) => (
              <View
                key={day.date}
                style={[
                  styles.cell,
                  day.future ? null : { backgroundColor: fill(day.level) },
                  day.date === today && { borderWidth: 1.5, borderColor: colors.primary },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" color="textMuted" style={styles.flex}>
          {summary}
        </AppText>
        <View style={styles.legend} importantForAccessibility="no-hide-descendants">
          <AppText variant="caption" color="textMuted">
            {t('activity.less')}
          </AppText>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <View key={level} style={[styles.legendCell, { backgroundColor: fill(level) }]} />
          ))}
          <AppText variant="caption" color="textMuted">
            {t('activity.more')}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  months: { flexDirection: 'row', gap: GAP, height: 14 },
  monthCell: { flex: 1 },
  // Wider than its column so "Oct" is not clipped; the overline is short enough not to collide.
  monthLabel: { width: 32 },
  grid: { flexDirection: 'row', gap: GAP },
  column: { flex: 1, gap: GAP },
  cell: { aspectRatio: 1, borderRadius: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  flex: { flex: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendCell: { width: 12, height: 12, borderRadius: radius.sm / 2 },
});
