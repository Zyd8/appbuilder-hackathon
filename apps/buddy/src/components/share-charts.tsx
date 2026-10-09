import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { areaLabel } from '@/data/life-areas';
import type { ActivityGrid } from '@/domain/activity';
import { SHARE_BAR_COUNT } from '@/domain/progress-share';
import { LIFE_AREAS, type StatBlock } from '@/domain/types';
import { radius, spacing } from '@/theme/tokens';

/**
 * Charts for the share card. They are drawn in one `ink` color (white or navy) at different
 * strengths, so they stay readable over a photo, the gradient, or nothing at all.
 */

const GAP = 3;
const BAR_MAX_HEIGHT = 56;
/** Fill strength per activity level, as a hex alpha on the ink color. */
const LEVEL_ALPHA = ['33', '66', '99', 'CC', 'FF'] as const;

export function ShareRadar({ stats, ink, size }: { stats: StatBlock; ink: string; size: number }) {
  const center = size / 2;
  const maxR = size / 2 - 30;
  const angle = (i: number) => (Math.PI * 2 * i) / LIFE_AREAS.length - Math.PI / 2;
  const point = (i: number, r: number) => ({ x: center + r * Math.cos(angle(i)), y: center + r * Math.sin(angle(i)) });
  const toPoints = (radiusAt: (i: number) => number) =>
    LIFE_AREAS.map((_, i) => point(i, radiusAt(i)))
      .map((p) => `${p.x},${p.y}`)
      .join(' ');

  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <Polygon key={f} points={toPoints(() => maxR * f)} fill="none" stroke={`${ink}59`} strokeWidth={1} />
      ))}
      {LIFE_AREAS.map((area, i) => {
        const end = point(i, maxR);
        return <Line key={area} x1={center} y1={center} x2={end.x} y2={end.y} stroke={`${ink}40`} />;
      })}
      <Polygon
        points={toPoints((i) => (maxR * Math.min(100, Math.max(0, stats[LIFE_AREAS[i]]))) / 100)}
        fill={`${ink}40`}
        stroke={ink}
        strokeWidth={2}
      />
      {LIFE_AREAS.map((area, i) => {
        const p = point(i, (maxR * Math.min(100, Math.max(0, stats[area]))) / 100);
        return <Circle key={area} cx={p.x} cy={p.y} r={3.5} fill={ink} />;
      })}
      {LIFE_AREAS.map((area, i) => {
        const p = point(i, maxR + 16);
        return (
          <SvgText key={area} x={p.x} y={p.y + 4} fontSize={11} fontWeight="600" fill={ink} textAnchor="middle">
            {areaLabel(area)}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export function ShareRecord({ grid, today, ink }: { grid: ActivityGrid; today: string; ink: string }) {
  return (
    <View style={styles.record}>
      {grid.weeks.map((week) => (
        <View key={week[0].date} style={styles.column}>
          {week.map((day) => (
            <View
              key={day.date}
              style={[
                styles.cell,
                day.future ? null : { backgroundColor: `${ink}${LEVEL_ALPHA[day.level]}` },
                day.date === today && { borderWidth: 1.5, borderColor: ink },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function ShareBars({ bars, ink }: { bars: number[]; ink: string }) {
  const peak = Math.max(1, ...bars);
  return (
    <View style={styles.bars}>
      {bars.map((count, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: count === 0 ? 4 : Math.max(8, (count / peak) * BAR_MAX_HEIGHT),
              backgroundColor: ink,
              opacity: count === 0 ? 0.4 : index === SHARE_BAR_COUNT - 1 ? 1 : 0.8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  record: { flexDirection: 'row', gap: GAP },
  column: { flex: 1, gap: GAP },
  cell: { aspectRatio: 1, borderRadius: 3 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, height: BAR_MAX_HEIGHT },
  bar: { flex: 1, borderRadius: radius.sm / 2 },
});
