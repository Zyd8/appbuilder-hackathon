import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Calendar } from '@/components/calendar';
import { Sheet } from '@/components/sheet';
import { todayIso } from '@/data/preview';
import { longDateLabel } from '@/domain/dates';
import { cleanNoteBody, NOTE_MAX } from '@/domain/notes';
import type { Note } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Edit a note's text and date, or delete it. Opened by tapping a note's text. */
export default function NoteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = usePreviewStore((s) => s.notes.find((n) => n.id === id));

  if (!note) {
    return (
      <Sheet title={t('notes.edit')} eyebrow={t('note.sheet.eyebrow')}>
        <AppText color="textMuted">{t('note.sheet.notFound')}</AppText>
      </Sheet>
    );
  }
  return <NoteEditor note={note} />;
}

function NoteEditor({ note }: { note: Note }) {
  const { colors } = useTheme();
  const updateNote = usePreviewStore((s) => s.updateNote);
  const deleteNote = usePreviewStore((s) => s.deleteNote);
  const [body, setBody] = useState(note.body);
  const [date, setDate] = useState(note.date);
  const [picking, setPicking] = useState(false);
  const canSave = Boolean(cleanNoteBody(body));

  const save = () => {
    updateNote(note.id, { body, date });
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert(t('note.delete.title'), t('note.delete.body'), [
      { text: t('note.delete.cancel'), style: 'cancel' },
      {
        text: t('note.delete.confirm'),
        style: 'destructive',
        onPress: () => {
          deleteNote(note.id);
          router.back();
        },
      },
    ]);

  return (
    <Sheet
      title={t('notes.edit')}
      eyebrow={t('note.sheet.eyebrow')}
      footer={
        <>
          <Button label={t('note.sheet.save')} icon="checkmark" onPress={save} disabled={!canSave} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('note.sheet.delete')}
            onPress={confirmDelete}
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <AppText variant="bodyStrong" color="danger">
              {t('note.sheet.delete')}
            </AppText>
          </Pressable>
        </>
      }>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={t('note.sheet.placeholder')}
        placeholderTextColor={colors.textMuted}
        maxLength={NOTE_MAX}
        multiline
        accessibilityLabel={t('note.sheet.placeholder')}
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
      />

      <View style={styles.dateRow}>
        <AppText variant="overline" color="textMuted">
          {t('note.sheet.date').toUpperCase()}
        </AppText>
        <View style={styles.dateActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${date ? longDateLabel(date) : t('note.sheet.noDate')}. ${t('notes.pickDate')}`}
            accessibilityState={{ expanded: picking }}
            onPress={() => setPicking((open) => !open)}
            hitSlop={6}
            style={[
              styles.chip,
              { backgroundColor: colors.surfaceAlt, borderColor: date ? colors.primary : colors.border },
            ]}>
            <Ionicons name={date ? 'calendar' : 'calendar-outline'} size={15} color={colors.primary} />
            <AppText variant="caption" color={date ? 'primary' : 'textMuted'}>
              {date ? longDateLabel(date) : t('note.sheet.noDate')}
            </AppText>
          </Pressable>
          {date ? (
            <Button
              label={t('notes.clearDate')}
              variant="ghost"
              size="sm"
              onPress={() => {
                setDate(undefined);
                setPicking(false);
              }}
            />
          ) : null}
        </View>
      </View>

      {picking ? (
        <Calendar
          today={todayIso()}
          selected={date}
          onSelect={(iso) => {
            setDate(iso);
            setPicking(false);
          }}
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 96,
    maxHeight: 200,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  dateRow: { gap: spacing.sm },
  dateActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  pressed: { opacity: 0.8 },
});
