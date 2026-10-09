import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { Quest } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { AreaTag } from './area-tag';
import { Button } from './button';
import { Sheet } from './sheet';
import { useCompleteQuest } from './use-complete-quest';

type IconName = ComponentProps<typeof Ionicons>['name'];

type QuestDetailsProps = {
  quest: Quest;
  /** Daily quests can be swapped. */
  canSwap: boolean;
  onSwapped: (newId: string) => void;
};

/** A quest in its sheet: what it is, what to do, why Buddy picked it, and the actions. */
export function QuestDetails({ quest, canSwap, onSwapped }: QuestDetailsProps) {
  const { colors } = useTheme();
  const complete = useCompleteQuest();
  const swapQuest = usePreviewStore((s) => s.swapQuest);
  const rerollsLeft = usePreviewStore((s) => s.rerollsLeft);
  const [reflecting, setReflecting] = useState(false);
  const [reflection, setReflection] = useState('');
  const done = quest.status === 'done';

  const finish = () => {
    complete(quest.id, reflection);
    setReflecting(false);
  };

  let footer;
  if (done) {
    footer = undefined;
  } else if (reflecting) {
    footer = (
      <>
        <TextInput
          value={reflection}
          onChangeText={setReflection}
          placeholder={t('quests.reflection.placeholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={140}
          autoFocus
          onSubmitEditing={finish}
          returnKeyType="done"
          accessibilityLabel={t('quests.reflection.placeholder')}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
        <Button label={t('quests.reflection.save')} icon="checkmark" onPress={finish} />
      </>
    );
  } else {
    footer = (
      <>
        <Button label={t('quests.complete')} icon="checkmark" onPress={() => setReflecting(true)} />
        {canSwap ? (
          <Button
            label={t('quests.swapWithCount', { count: rerollsLeft })}
            icon="shuffle"
            variant="ghost"
            disabled={rerollsLeft <= 0}
            onPress={() => {
              const newId = swapQuest(quest.id);
              if (newId) onSwapped(newId);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <Sheet eyebrow={t(`quests.sheet.${quest.kind}`)} title={quest.title} footer={footer}>
      <View style={styles.pills}>
        <Pill icon="ribbon-outline" label={t('quests.rank', { rank: quest.rank })} />
        <AreaTag area={quest.area} />
        <Pill icon="time-outline" label={t('quests.minutes', { count: quest.estMinutes })} />
        <Pill icon="flash" label={t('quests.xp', { count: quest.xp })} accent />
      </View>

      {quest.flavor ? (
        <AppText color="textMuted" style={styles.flavor}>
          {quest.flavor}
        </AppText>
      ) : null}

      <View style={[styles.block, { backgroundColor: colors.surfaceAlt }]}>
        <AppText variant="overline" color="primary">
          {t('quests.whatToDo')}
        </AppText>
        <AppText variant="bodyStrong">{quest.instruction}</AppText>
      </View>

      {quest.why ? (
        <View style={styles.why}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <AppText variant="caption" color="textMuted" style={styles.flex}>
            <AppText variant="caption" color="accent">
              {t('quests.why')}:{' '}
            </AppText>
            {quest.why}
          </AppText>
        </View>
      ) : null}

      {done ? (
        <View style={[styles.done, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" color="success">
              {t('quests.completedLong')}
            </AppText>
            {quest.reflection ? (
              <AppText variant="caption" color="textMuted">
                “{quest.reflection}”
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

function Pill({ icon, label, accent = false }: { icon: IconName; label: string; accent?: boolean }) {
  const { colors } = useTheme();
  const color = accent ? colors.accent : colors.textMuted;
  return (
    <View style={[styles.pill, { backgroundColor: accent ? colors.accentSoft : colors.surfaceAlt }]}>
      <Ionicons name={icon} size={13} color={color} />
      <AppText variant="caption" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  flavor: { fontStyle: 'italic' },
  block: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  why: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  done: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, padding: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    minHeight: 48,
  },
});
