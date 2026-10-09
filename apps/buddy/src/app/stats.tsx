import { StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/app-text';
import { StatsBreakdown } from '@/components/stats-breakdown';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';

/** Opened by tapping the radar on the Player tab. */
export default function StatsSheet() {
  const stats = usePreviewStore((s) => s.profile.stats);
  const profileStatus = usePreviewStore((s) => s.profileStatus);
  return (
    <Sheet title={t('stats.breakdown')} eyebrow={t('player.stats').toUpperCase()}>
      <View style={styles.content}>
        {profileStatus === 'ready' ? <StatsBreakdown stats={stats} /> :
          <AppText color={profileStatus === 'error' ? 'danger' : 'textMuted'} accessibilityLiveRegion="polite">
            {t(profileStatus === 'error' ? 'buddy.profile.error' : profileStatus === 'loading' ? 'buddy.profile.loading' : 'buddy.profile.empty')}
          </AppText>}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.lg },
});
