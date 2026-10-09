import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TAB_BAR_CLEARANCE } from '@/components/glass-tab-bar';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type ScreenProps = {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (e.g. chat). */
  scroll?: boolean;
  /** Tab screens sit above the tab bar, so they skip the bottom inset. */
  edges?: ('top' | 'bottom')[];
};

export function Screen({ children, scroll = true, edges = ['top'] }: ScreenProps) {
  const { colors } = useTheme();
  // Tab screens skip the bottom inset because the floating tab bar sits over them.
  const clearance = edges.includes('bottom') ? 0 : TAB_BAR_CLEARANCE;
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + clearance }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.fill, { paddingBottom: clearance }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: spacing.lg, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 640, gap: spacing.lg },
});
