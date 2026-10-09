import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { ActivityGrid } from '@/components/activity-grid';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { InsightList } from '@/components/insight-list';
import { PlayerBanner } from '@/components/player-banner';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StatsOverview } from '@/components/stats-overview';
import { levelFromTotalXp } from '@/domain/xp';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function Player() {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const account = usePreviewStore((s) => s.account);
  const profile = usePreviewStore((s) => s.profile);
  const history = usePreviewStore((s) => s.history);
  const level = levelFromTotalXp(profile.totalXp);
  const name = account?.displayName?.trim() || profile.displayName;
  const rise = (step: number) => (reduceMotion ? FadeIn.duration(200) : FadeInDown.delay(150 * step).duration(450));

  return (
    <Screen>
      <View style={styles.headerRow}>
        <AppText variant="display" accessibilityRole="header" style={styles.flex}>
          {t('tabs.player')}
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('player.settings')} onPress={() => router.push('/settings')} hitSlop={12}>
          <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <PlayerBanner
        name={name}
        level={level.level}
        title={profile.title}
        progress={level.progress}
        xpLabel={t('player.xp', { current: level.xpIntoLevel, next: level.xpForNext })}
        streakDays={profile.streakDays}
        restTokens={profile.restTokens}
      />

      <Button label={t('share.open')} icon="share-outline" variant="secondary" onPress={() => router.push('/share-progress')} />

      <Animated.View entering={rise(1)} style={styles.section}>
        <SectionHeader title={t('player.stats')} />
        <StatsOverview stats={profile.stats} />
      </Animated.View>

      <Animated.View entering={rise(2)} style={styles.section}>
        <SectionHeader title={t('activity.title')} />
        <ActivityGrid history={history} />
      </Animated.View>

      <Animated.View entering={rise(3)} style={styles.section}>
        <SectionHeader title={t('player.insights')} />
        <InsightList insights={profile.insights} />
      </Animated.View>

      <AppText variant="caption" color="textMuted" style={styles.centerText}>
        {t('player.disclaimer')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  centerText: { textAlign: 'center' },
});
