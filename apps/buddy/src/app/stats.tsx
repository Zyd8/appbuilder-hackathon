import { StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { StatsBreakdown } from '@/components/stats-breakdown';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';

/** Opened by tapping the radar on the Player tab. */
export default function StatsSheet() {
  const stats = usePreviewStore((s) => s.profile.stats);
  return (
    <Sheet title={t('stats.breakdown')} eyebrow={t('player.stats').toUpperCase()}>
      <View style={styles.content}>
        <StatsBreakdown stats={stats} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.lg },
});
