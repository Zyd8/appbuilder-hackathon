import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { QuestRow } from '@/components/quest-row';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { areaLabel, LIFE_AREA_ICONS } from '@/data/life-areas';
import type { Quest } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { areaColors, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type QuestTab = 'daily' | 'weekly' | 'side' | 'history';

export default function Quests() {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<QuestTab>('daily');
  const daily = usePreviewStore((s) => s.dailyQuests);
  const weekly = usePreviewStore((s) => s.weeklyQuest);
  const side = usePreviewStore((s) => s.sideQuests);
  const history = usePreviewStore((s) => s.history);
  const rerollsLeft = usePreviewStore((s) => s.rerollsLeft);
  const phase2Status = usePreviewStore((s) => s.phase2Status);
  const phase2Error = usePreviewStore((s) => s.phase2Error);

  const board = tab === 'daily' ? daily : tab === 'weekly' ? (weekly ? [weekly] : []) : tab === 'side' ? side : [];

  return (
    <Screen>
      <AppText variant="display" accessibilityRole="header">
        {t('tabs.quests')}
      </AppText>
      <Segmented<QuestTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'daily', label: t('quests.daily') },
          { value: 'weekly', label: t('quests.weekly') },
          { value: 'side', label: t('quests.side') },
          { value: 'history', label: t('quests.history') },
        ]}
      />

      {phase2Status === 'loading' ? <AppText color="textMuted">Loading saved quests…</AppText> : null}
      {phase2Status === 'error' || phase2Error ? <AppText color="danger" accessibilityLiveRegion="polite">{phase2Error ?? 'Saved quests could not be loaded.'}</AppText> : null}
      {phase2Status === 'empty' ? <AppText color="textMuted">Sign in to load your quests.</AppText> : null}
      {/* Keyed by tab so each switch re-enters; Reduce Motion gets a short fade. */}
      <Animated.View
        key={tab}
        entering={reduceMotion ? FadeIn.duration(200) : FadeInDown.duration(350)}
        style={styles.list}>
        {tab === 'history' ? (
          <HistoryList history={history} />
        ) : (
          <>
            <BoardSummary quests={board} note={tab === 'daily' ? t('quests.rerollsLeft', { count: rerollsLeft }) : undefined} />
            <View style={styles.rows}>
              {board.map((quest) => (
                <Pressable
                  key={quest.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${quest.title}, ${t('quests.minutes', { count: quest.estMinutes })}${
                    quest.status === 'done' ? `, ${t('quests.completed')}` : ''
                  }`}
                  onPress={() => router.push({ pathname: '/quest/[id]', params: { id: quest.id } })}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <QuestRow quest={quest} draggable={false} />
                </Pressable>
              ))}
            </View>
            <AppText variant="caption" color="textMuted" style={styles.center}>
              {t('quests.tapHint')}
            </AppText>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

/** "2 of 3 done" with a thin bar, so the board reads as progress rather than a pile of tasks. */
function BoardSummary({ quests, note }: { quests: Quest[]; note?: string }) {
  const { colors } = useTheme();
  const done = quests.filter((q) => q.status === 'done').length;
  const allDone = quests.length > 0 && done === quests.length;

  return (
    <Card tone="muted" style={styles.summary}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryTitle}>
          {allDone ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : null}
          <AppText variant="bodyStrong">
            {allDone ? t('quests.allDoneTab') : t('quests.progress', { done, total: quests.length })}
          </AppText>
        </View>
        {note ? (
          <AppText variant="caption" color="textMuted">
            {note}
          </AppText>
        ) : null}
      </View>
      <ProgressBar
        progress={quests.length ? done / quests.length : 0}
        trackColor={colors.surface}
        accessibilityLabel={t('quests.progress', { done, total: quests.length })}
      />
    </Card>
  );
}

function HistoryList({ history }: { history: Quest[] }) {
  const { colors } = useTheme();

  if (history.length === 0) {
    return (
      <Card tone="muted" style={styles.empty}>
        <BuddyMascot mood="sleepy" size={64} />
        <AppText color="textMuted" style={styles.center}>
          {t('quests.history.empty')}
        </AppText>
      </Card>
    );
  }

  return (
    <View style={styles.rows}>
      {history.map((q) => {
        const color = areaColors[q.area];
        return (
          <View
            key={q.id}
            style={[styles.historyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessible
            accessibilityLabel={`${q.title}, ${areaLabel(q.area)}, ${t('quests.xp', { count: q.xp })}`}>
            <View style={[styles.historyIcon, { backgroundColor: `${color}1A` }]}>
              <Ionicons name={LIFE_AREA_ICONS[q.area]} size={18} color={color} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {q.title}
              </AppText>
              {q.reflection ? (
                <AppText variant="caption" color="textMuted" numberOfLines={2}>
                  “{q.reflection}”
                </AppText>
              ) : (
                <AppText variant="caption" style={{ color }}>
                  {areaLabel(q.area)}
                </AppText>
              )}
            </View>
            <View style={styles.historyMeta}>
              <AppText variant="caption" color="accent">
                {t('quests.xp', { count: q.xp })}
              </AppText>
              {q.completedAt ? (
                <AppText variant="caption" color="textMuted">
                  {new Date(q.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  rows: { gap: spacing.sm },
  pressed: { opacity: 0.8 },
  center: { textAlign: 'center' },
  flex: { flex: 1, gap: 2 },
  empty: { alignItems: 'center' },
  summary: { gap: spacing.sm },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  summaryTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  historyIcon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  historyMeta: { alignItems: 'flex-end', gap: 2 },
});
