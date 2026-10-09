import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { Quest } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { AreaTag } from './area-tag';
import { Button } from './button';
import { Card } from './card';
import { useToast } from './toast';

type QuestCardProps = {
  quest: Quest;
  /** Daily quests can be swapped; weekly and side quests cannot. */
  canSwap?: boolean;
};

export function QuestCard({ quest, canSwap = false }: QuestCardProps) {
  const { colors } = useTheme();
  const [reflecting, setReflecting] = useState(false);
  const [reflection, setReflection] = useState('');
  const completeQuest = usePreviewStore((s) => s.completeQuest);
  const swapQuest = usePreviewStore((s) => s.swapQuest);
  const rerollsLeft = usePreviewStore((s) => s.rerollsLeft);
  const showToast = useToast((s) => s.show);
  const done = quest.status === 'done';

  const finish = () => {
    const result = completeQuest(quest.id, reflection);
    setReflecting(false);
    if (result.leveledUpTo) showToast(t('quests.levelUp', { level: result.leveledUpTo }));
    else if (result.granted > 0) showToast(t('quests.toast', { xp: result.granted }));
    else showToast(t('quests.toastCapped'));
  };

  return (
    <Card style={done && { opacity: 0.7 }}>
      <View style={styles.topRow}>
        <View style={[styles.rank, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}>
          <AppText variant="bodyStrong" color="primary" accessibilityLabel={t('quests.rank', { rank: quest.rank })}>
            {quest.rank}
          </AppText>
        </View>
        <View style={styles.titleCol}>
          <AppText variant="title" style={done && styles.strike}>
            {quest.title}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {quest.flavor}
          </AppText>
        </View>
        {done ? <Ionicons name="checkmark-circle" size={26} color={colors.success} accessibilityLabel={t('quests.completed')} /> : null}
      </View>

      <AppText>{quest.instruction}</AppText>

      <View style={styles.metaRow}>
        <AreaTag area={quest.area} />
        <AppText variant="caption" color="textMuted">
          {t('quests.minutes', { count: quest.estMinutes })}
        </AppText>
        <AppText variant="caption" color="accent">
          {t('quests.xp', { count: quest.xp })}
        </AppText>
      </View>

      {quest.why ? (
        <View style={[styles.why, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
          <AppText variant="caption" color="textMuted" style={styles.whyText}>
            <AppText variant="caption" color="primary">
              {t('quests.why')}:{' '}
            </AppText>
            {quest.why}
          </AppText>
        </View>
      ) : null}

      {done ? (
        quest.reflection ? (
          <AppText variant="caption" color="textMuted">
            “{quest.reflection}”
          </AppText>
        ) : null
      ) : reflecting ? (
        <View style={styles.reflectBox}>
          <TextInput
            value={reflection}
            onChangeText={setReflection}
            placeholder={t('quests.reflection.placeholder')}
            placeholderTextColor={colors.textMuted}
            maxLength={140}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            accessibilityLabel={t('quests.reflection.placeholder')}
            onSubmitEditing={finish}
            returnKeyType="done"
          />
          <Button label={t('quests.reflection.save')} icon="checkmark" onPress={finish} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button label={t('quests.complete')} icon="checkmark" size="sm" onPress={() => setReflecting(true)} />
          {canSwap ? (
            <Button
              label={t('quests.reroll')}
              icon="shuffle"
              size="sm"
              variant="secondary"
              disabled={rerollsLeft <= 0}
              accessibilityHint={t('quests.rerollsLeft', { count: rerollsLeft })}
              onPress={() => swapQuest(quest.id)}
            />
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rank: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: { flex: 1, gap: 2 },
  strike: { textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  why: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'flex-start' },
  whyText: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  reflectBox: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    minHeight: 44,
  },
});
