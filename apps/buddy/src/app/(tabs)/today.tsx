import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { OnDeviceBadge } from '@/components/on-device-badge';
import { ProgressBar } from '@/components/progress-bar';
import { QuestCard } from '@/components/quest-card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TaskRow } from '@/components/task-row';
import { PREVIEW_NUDGE, todayIso } from '@/data/preview';
import { levelFromTotalXp } from '@/domain/xp';
import { t, type StringKey } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function greetingKey(): StringKey {
  const hour = new Date().getHours();
  if (hour < 12) return 'today.greeting.morning';
  if (hour < 18) return 'today.greeting.afternoon';
  return 'today.greeting.evening';
}

export default function Today() {
  const { colors } = useTheme();
  const profile = usePreviewStore((s) => s.profile);
  const quests = usePreviewStore((s) => s.dailyQuests);
  const tasks = usePreviewStore((s) => s.tasks);
  const checkIn = usePreviewStore((s) => s.checkIn);
  const rerollsLeft = usePreviewStore((s) => s.rerollsLeft);
  const level = levelFromTotalXp(profile.totalXp);
  const todaysTasks = tasks.filter((task) => !task.due || task.due === todayIso());
  const allDone = quests.every((q) => q.status === 'done');

  return (
    <Screen>
      <OnDeviceBadge />
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <AppText variant="display">{t(greetingKey(), { name: profile.displayName })}</AppText>
          <AppText color="textMuted">
            {t('player.level', { level: level.level })} · {profile.title}
          </AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('player.settings')} onPress={() => router.push('/settings')} hitSlop={12}>
          <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
        </Pressable>
      </View>
      <ProgressBar
        progress={level.progress}
        color={colors.accent}
        accessibilityLabel={t('player.xp', { current: level.xpIntoLevel, next: level.xpForNext })}
      />

      {checkIn ? (
        <Card tone="muted" style={styles.row}>
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
          <AppText variant="bodyStrong">{t('today.checkin.done', { energy: t(`energy.${checkIn.energy}`).toLowerCase() })}</AppText>
        </Card>
      ) : (
        <Card tone="status">
          <View style={styles.row}>
            <BuddyMascot mood="happy" size={56} />
            <View style={styles.flex}>
              <AppText variant="title">{t('today.checkin.title')}</AppText>
              <AppText variant="caption" color="textMuted">
                {t('today.checkin.body')}
              </AppText>
            </View>
          </View>
          <Button label={t('today.checkin.cta')} icon="pulse" onPress={() => router.push('/check-in')} />
        </Card>
      )}

      <SectionHeader
        title={t('today.quests')}
        right={
          <AppText variant="caption" color="textMuted">
            {t('quests.rerollsLeft', { count: rerollsLeft })}
          </AppText>
        }
      />
      {allDone ? (
        <Card tone="muted" style={styles.row}>
          <BuddyMascot mood="celebrating" size={48} />
          <AppText variant="bodyStrong" style={styles.flex}>
            {t('today.allDone')}
          </AppText>
        </Card>
      ) : null}
      {quests.map((quest) => (
        <QuestCard key={quest.id} quest={quest} canSwap />
      ))}

      <SectionHeader title={t('today.tasks')} />
      <Card>
        {todaysTasks.length === 0 ? (
          <AppText color="textMuted">{t('today.tasks.empty')}</AppText>
        ) : (
          todaysTasks.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </Card>

      <SectionHeader title={t('today.nudge')} />
      <Card tone="muted" style={styles.row}>
        <Ionicons name="bulb-outline" size={22} color={colors.accent} />
        <AppText style={styles.flex}>{PREVIEW_NUDGE}</AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
