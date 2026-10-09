import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { brandGradient, radius as radii } from '@/theme/tokens';

type GradientPanelProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
};

/**
 * Deep-to-royal blue panel with two translucent ribbons that echo the folded "A" in the Angat mark.
 * Purely decorative: content inside should use `onPrimary` text.
 */
export function GradientPanel({ children, style, radius = radii.lg + 8 }: GradientPanelProps) {
  return (
    <View style={[styles.panel, { borderRadius: radius }, style]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id="panelFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={brandGradient.deep} />
            <Stop offset="1" stopColor={brandGradient.royal} />
          </LinearGradient>
          <LinearGradient id="ribbon" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={brandGradient.sky} stopOpacity="0.55" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.04" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#panelFill)" />
        {/* Two rising ribbons, like the legs of the A folding upward. */}
        <Path d="M58 100 L92 18 Q96 8 104 8 L104 34 L80 100 Z" fill="url(#ribbon)" />
        <Path d="M30 100 Q52 70 104 58 L104 74 Q66 82 48 100 Z" fill="#FFFFFF" fillOpacity={0.07} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { overflow: 'hidden' },
});
