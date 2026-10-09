import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { areaLabel } from '@/data/life-areas';
import { LIFE_AREAS, type StatBlock } from '@/domain/types';
import { useTheme } from '@/theme/use-theme';

type StatRadarProps = {
  stats: StatBlock;
  size?: number;
};

/** Radar chart of the 8 life-area stats (0–100). Exact values are also listed beside it in text. */
export function StatRadar({ stats, size = 260 }: StatRadarProps) {
  const { colors } = useTheme();
  const center = size / 2;
  const maxR = size / 2 - 34;
  const angle = (i: number) => (Math.PI * 2 * i) / LIFE_AREAS.length - Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: center + r * Math.cos(angle(i)),
    y: center + r * Math.sin(angle(i)),
  });

  const ring = (fraction: number) =>
    LIFE_AREAS.map((_, i) => point(i, maxR * fraction))
      .map((p) => `${p.x},${p.y}`)
      .join(' ');

  const shape = LIFE_AREAS.map((area, i) => point(i, (maxR * Math.min(100, Math.max(0, stats[area]))) / 100))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  const summary = LIFE_AREAS.map((a) => `${areaLabel(a)} ${stats[a]}`).join(', ');

  return (
    <Svg width={size} height={size} accessibilityLabel={`Stats radar: ${summary}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <Polygon key={f} points={ring(f)} fill="none" stroke={colors.border} strokeWidth={1} />
      ))}
      {LIFE_AREAS.map((area, i) => {
        const end = point(i, maxR);
        return <Line key={area} x1={center} y1={center} x2={end.x} y2={end.y} stroke={colors.border} />;
      })}
      <Polygon points={shape} fill={colors.glow} stroke={colors.primary} strokeWidth={2} />
      {LIFE_AREAS.map((area, i) => {
        const p = point(i, (maxR * stats[area]) / 100);
        return <Circle key={area} cx={p.x} cy={p.y} r={3.5} fill={colors.primary} />;
      })}
      {LIFE_AREAS.map((area, i) => {
        const p = point(i, maxR + 18);
        return (
          <SvgText
            key={area}
            x={p.x}
            y={p.y + 4}
            fontSize={11}
            fontWeight="600"
            fill={colors.textMuted}
            textAnchor="middle">
            {areaLabel(area)}
          </SvgText>
        );
      })}
    </Svg>
  );
}
