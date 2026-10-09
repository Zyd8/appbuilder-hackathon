import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { InsightList } from '@/components/insight-list';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StatRadar } from '@/components/stat-radar';
import { areaLabel } from '@/data/life-areas';
import { LIFE_AREAS } from '@/domain/types';
import { levelFromTotalXp, playerRank } from '@/domain/xp';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { areaColors, fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function Player() {
  const { colors } = useTheme();
  const profile = usePreviewStore((s) => s.profile);
  const level = levelFromTotalXp(profile.totalXp);
  const rank = playerRank(level.level);

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

      {/* Status window */}
      <Card tone="status">
        <View style={styles.statusTop}>
          <BuddyMascot mood="happy" size={64} />
          <View style={styles.flex}>
            <AppText variant="overline" color="primary">
              {rank.title.toUpperCase()}
            </AppText>
            <AppText variant="title">{profile.title}</AppText>
          </View>
          <View style={[styles.levelBadge, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
            <AppText variant="caption" color="accent">
              {t('player.levelShort')}
            </AppText>
            <AppText variant="display" color="accent" style={styles.mono}>
              {level.level}
            </AppText>
          </View>
        </View>
        <ProgressBar
          progress={level.progress}
          color={colors.accent}
          accessibilityLabel={t('player.xp', { current: level.xpIntoLevel, next: level.xpForNext })}
        />
        <View style={styles.statusMeta}>
          <AppText variant="caption" color="textMuted">
            {t('player.xp', { current: level.xpIntoLevel, next: level.xpForNext })}
          </AppText>
          <AppText variant="caption" color="textMuted">
            🔥 {t('player.streak', { count: profile.streakDays })} · {t('player.restTokens', { count: profile.restTokens })}
          </AppText>
        </View>
      </Card>

      <SectionHeader title={t('player.stats')} />
      <Card>
        <View style={styles.center}>
          <StatRadar stats={profile.stats} />
        </View>
        {LIFE_AREAS.map((area) => (
          <View key={area} style={styles.statRow}>
            <AppText variant="caption" style={styles.statLabel}>
              {areaLabel(area)}
            </AppText>
            <View style={styles.flex}>
              <ProgressBar progress={profile.stats[area] / 100} color={areaColors[area]} height={8} />
            </View>
            <AppText variant="caption" style={[styles.statValue, styles.mono]}>
              {profile.stats[area]}
            </AppText>
          </View>
        ))}
      </Card>

      <InsightList insights={profile.insights} />

      <AppText variant="caption" color="textMuted" style={styles.centerText}>
        {t('player.disclaimer')}
      </AppText>
      <Button label={t('player.notRight')} variant="secondary" icon="refresh" disabled accessibilityHint={t('phase.comingIn', { phase: 2 })} />
      <AppText variant="caption" color="textMuted" style={styles.centerText}>
        {t('phase.comingIn', { phase: 2 })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  levelBadge: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusMeta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statLabel: { width: 96 },
  statValue: { width: 28, textAlign: 'right' },
  mono: { fontFamily: fonts.mono },
});
