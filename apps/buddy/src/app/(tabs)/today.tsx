import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BrandLogo } from '@/components/brand-logo';
import type { BuddyMood } from '@/components/buddy-mascot';
import { CheckInPrompt } from '@/components/check-in-prompt';
import { OnDeviceBadge } from '@/components/on-device-badge';
import { DraggableList } from '@/components/draggable-list';
import { NoteList } from '@/components/note-list';
import { QUEST_ROW_HEIGHT, QuestRow } from '@/components/quest-row';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { TodayBanner } from '@/components/today-banner';
import { todayIso } from '@/data/preview';
import { firstName, pickBuddyNudge, type BuddyNudge } from '@/domain/buddy-nudge';
import { notesForToday } from '@/domain/notes';
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

function nudgeText(nudge: BuddyNudge): string {
  switch (nudge.kind) {
    case 'allDone':
      return t('today.allDone');
    case 'lowEnergy':
      return nudge.goal ? t('nudge.lowEnergy.goal', { goal: t(`goalPhrase.${nudge.goal}`) }) : t('nudge.lowEnergy');
    case 'goalQuest':
      return t('nudge.goalQuest', { quest: nudge.questTitle, minutes: nudge.minutes, goal: t(`goalPhrase.${nudge.goal}`) });
    case 'goal':
      return t(`nudge.goal.${nudge.goal}`);
    default:
      return t('nudge.general');
  }
}

const NUDGE_MOOD: Record<BuddyNudge['kind'], BuddyMood> = {
  allDone: 'celebrating',
  lowEnergy: 'sleepy',
  goalQuest: 'happy',
  goal: 'happy',
  general: 'happy',
};

export default function Today() {
  const { colors } = useTheme();
  const account = usePreviewStore((s) => s.account);
  const answers = usePreviewStore((s) => s.answers);
  const profile = usePreviewStore((s) => s.profile);
  const quests = usePreviewStore((s) => s.dailyQuests);
  const notes = usePreviewStore((s) => s.notes);
  const addNote = usePreviewStore((s) => s.addNote);
  const checkIn = usePreviewStore((s) => s.checkIn);
  const rerollsLeft = usePreviewStore((s) => s.rerollsLeft);
  const reorderDailyQuests = usePreviewStore((s) => s.reorderDailyQuests);
  const level = levelFromTotalXp(profile.totalXp);
  const today = todayIso();
  const todaysNotes = notesForToday(notes, today);
  const name = firstName(account?.displayName) ?? firstName(profile.displayName) ?? profile.displayName;
  const day = Math.floor(Date.parse(today) / 86_400_000);
  const nudge = pickBuddyNudge({ answers, quests, checkIn, day });

  return (
    <Screen>
      <View style={styles.brandRow}>
        <BrandLogo variant="mark" height={28} />
        <View style={styles.brandActions}>
          <OnDeviceBadge />
          <Pressable accessibilityRole="button" accessibilityLabel={t('player.settings')} onPress={() => router.push('/settings')} hitSlop={12}>
            <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <TodayBanner
        greeting={t(greetingKey(), { name })}
        level={level.level}
        title={profile.title}
        progress={level.progress}
        xpLabel={t('player.xp', { current: level.xpIntoLevel, next: level.xpForNext })}
        message={nudgeText(nudge)}
        mood={NUDGE_MOOD[nudge.kind]}
      />

      <CheckInPrompt
        doneLabel={checkIn ? t('today.checkin.done', { energy: t(`energy.${checkIn.energy}`).toLowerCase() }) : undefined}
        onPress={() => router.push('/check-in')}
      />

      <SectionHeader
        title={t('today.quests')}
        right={
          <AppText variant="caption" color="textMuted">
            {t('quests.rerollsLeft', { count: rerollsLeft })}
          </AppText>
        }
      />
      <View style={styles.questList}>
        <DraggableList
          items={quests}
          rowHeight={QUEST_ROW_HEIGHT}
          renderItem={(quest, dragging) => <QuestRow quest={quest} dragging={dragging} />}
          labelFor={(quest) =>
            `${quest.title}, ${t('quests.minutes', { count: quest.estMinutes })}${
              quest.status === 'done' ? `, ${t('quests.completed')}` : ''
            }`
          }
          onPress={(quest) => router.push({ pathname: '/quest/[id]', params: { id: quest.id } })}
          onReorder={reorderDailyQuests}
        />
        <AppText variant="caption" color="textMuted" style={styles.hint}>
          {t('quests.dragHint')}
        </AppText>
      </View>

      <SectionHeader
        title={t('today.notes')}
        right={
          todaysNotes.length > 0 ? (
            <AppText variant="caption" color="textMuted">
              {t('today.notes.progress', { done: todaysNotes.filter((note) => note.done).length, total: todaysNotes.length })}
            </AppText>
          ) : null
        }
      />
      <NoteList
        notes={todaysNotes}
        today={today}
        emptyText={t('today.notes.empty')}
        addPlaceholder={t('today.notes.add')}
        onAdd={(body) => addNote(body, { date: today })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  questList: { gap: spacing.sm },
  hint: { textAlign: 'center' },
});
