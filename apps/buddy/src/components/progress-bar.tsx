import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type ProgressBarProps = {
  /** 0..1 */
  progress: number;
  color?: string;
  /** Empty-track color. Defaults to `surfaceAlt`; use `onPrimaryTrack` on the brand gradient. */
  trackColor?: string;
  height?: number;
  accessibilityLabel?: string;
};

export function ProgressBar({ progress, color, trackColor, height = 10, accessibilityLabel }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: trackColor ?? colors.surfaceAlt }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', borderRadius: radius.pill },
});
