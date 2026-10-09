import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { canSubmitQuest } from '@/domain/quest-completion';
import type { Quest } from '@/domain/types';
import { t } from '@/i18n';
import { pickQuestPhoto } from '@/lib/quest-photo';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { AreaTag } from './area-tag';
import { Button } from './button';
import { Sheet } from './sheet';
import { useToast } from './toast';
import { useCompleteQuest } from './use-complete-quest';

type IconName = ComponentProps<typeof Ionicons>['name'];

type QuestDetailsProps = {
  quest: Quest;
  /** Daily quests can be swapped. */
  canSwap: boolean;
  onSwapped: (newId: string) => void;
};

/** A quest in its sheet: what it is, what to do, and the actions. */
export function QuestDetails({ quest, canSwap, onSwapped }: QuestDetailsProps) {
  const { colors } = useTheme();
  const complete = useCompleteQuest();
  const swapQuest = usePreviewStore((s) => s.swapQuest);
  const rerollsLeft = usePreviewStore((s) => s.rerollsLeft);
  const showToast = useToast((s) => s.show);
  const [reflecting, setReflecting] = useState(false);
  const [reflection, setReflection] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [picking, setPicking] = useState(false);
  const done = quest.status === 'done';
  const canFinish = canSubmitQuest({ photoUri, reflection });

  // The photo is only held here for now: it is not saved, uploaded, or checked yet.
  const choosePhoto = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const uri = await pickQuestPhoto();
      if (uri) setPhotoUri(uri);
    } catch {
      showToast(t('quests.photo.error'));
    } finally {
      setPicking(false);
    }
  };

  const finish = () => {
    if (!canFinish) return;
    complete(quest.id, reflection);
    setReflecting(false);
    setPhotoUri(undefined);
  };

  let footer;
  if (done) {
    footer = undefined;
  } else if (reflecting) {
    footer = (
      <>
        <PhotoSlot uri={photoUri} busy={picking} onPick={choosePhoto} onRemove={() => setPhotoUri(undefined)} />
        <AppText variant="caption" color="textMuted">
          {t('quests.photo.privacy')}
        </AppText>
        <TextInput
          value={reflection}
          onChangeText={setReflection}
          placeholder={t('quests.reflection.placeholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={140}
          onSubmitEditing={finish}
          returnKeyType="done"
          accessibilityLabel={t('quests.reflection.placeholder')}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
        <Button
          label={t('quests.reflection.save')}
          icon="checkmark"
          disabled={!canFinish}
          accessibilityHint={canFinish ? undefined : t('quests.photo.needed')}
          onPress={finish}
        />
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
        <AreaTag area={quest.area} />
        <Pill icon="time-outline" label={t('quests.minutes', { count: quest.estMinutes })} />
        <Pill icon="flash" label={t('quests.xp', { count: quest.xp })} accent />
      </View>

      <View style={[styles.block, { backgroundColor: colors.surfaceAlt }]}>
        <AppText variant="overline" color="primary">
          {t('quests.whatToDo')}
        </AppText>
        <AppText variant="bodyStrong">{quest.instruction}</AppText>
      </View>

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

type PhotoSlotProps = {
  uri?: string;
  busy: boolean;
  onPick: () => void;
  onRemove: () => void;
};

/** Proof photo for finishing a quest: an "Add a photo" tile, then a thumbnail with Change and Remove. */
function PhotoSlot({ uri, busy, onPick, onRemove }: PhotoSlotProps) {
  const { colors } = useTheme();

  if (!uri) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('quests.photo.add')}
        accessibilityHint={t('quests.photo.required')}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onPick}
        style={({ pressed }) => [
          styles.photoSlot,
          styles.photoEmpty,
          { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
          pressed && styles.pressed,
        ]}>
        <View style={[styles.photoIcon, { backgroundColor: colors.surface }]}>
          <Ionicons name="image-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color="primary">
            {t('quests.photo.add')}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {t('quests.photo.required')}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.photoSlot, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Image
        source={{ uri }}
        contentFit="cover"
        accessible
        accessibilityLabel={t('quests.photo.preview')}
        style={[styles.thumb, { backgroundColor: colors.surfaceAlt }]}
      />
      <View style={[styles.flex, styles.photoInfo]}>
        <View style={styles.photoAdded}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <AppText variant="bodyStrong" color="success">
            {t('quests.photo.added')}
          </AppText>
        </View>
        <View style={styles.photoActions}>
          <Button
            label={t('quests.photo.change')}
            icon="images-outline"
            variant="secondary"
            size="sm"
            disabled={busy}
            onPress={onPick}
          />
          <Button label={t('quests.photo.remove')} variant="ghost" size="sm" onPress={onRemove} />
        </View>
      </View>
    </View>
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
  block: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  flex: { flex: 1 },
  done: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, padding: spacing.md },
  photoSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  photoEmpty: { borderStyle: 'dashed', minHeight: 72 },
  photoIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
  photoInfo: { gap: spacing.sm },
  photoAdded: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    minHeight: 48,
  },
});
