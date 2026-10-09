import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { TaskRow } from '@/components/task-row';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type NotesTab = 'tasks' | 'notes';

export default function Notes() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<NotesTab>('tasks');
  const [draft, setDraft] = useState('');
  const tasks = usePreviewStore((s) => s.tasks);
  const notes = usePreviewStore((s) => s.notes);
  const addNote = usePreviewStore((s) => s.addNote);

  const save = () => {
    addNote(draft);
    setDraft('');
    setTab('notes');
  };

  return (
    <Screen>
      <AppText variant="display" accessibilityRole="header">
        {t('tabs.notes')}
      </AppText>

      <Card>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('notes.capture.placeholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          accessibilityLabel={t('notes.capture.placeholder')}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        />
        <View style={styles.actions}>
          <Button label={t('notes.capture.save')} icon="add" size="sm" disabled={!draft.trim()} onPress={save} />
        </View>
      </Card>

      <Segmented<NotesTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'tasks', label: t('notes.tasks') },
          { value: 'notes', label: t('notes.notes') },
        ]}
      />

      {tab === 'tasks' ? (
        <Card>
          {tasks.length === 0 ? (
            <AppText color="textMuted">{t('notes.tasks.empty')}</AppText>
          ) : (
            tasks.map((task) => <TaskRow key={task.id} task={task} />)
          )}
        </Card>
      ) : notes.length === 0 ? (
        <Card tone="muted">
          <AppText color="textMuted">{t('notes.empty')}</AppText>
        </Card>
      ) : (
        notes.map((note) => (
          <Card key={note.id}>
            <AppText>{note.body}</AppText>
            <View style={styles.noteFooter}>
              <AppText variant="caption" color="textMuted">
                {new Date(note.createdAt).toLocaleString()}
              </AppText>
              <Button
                label={t('notes.organize')}
                icon="sparkles-outline"
                size="sm"
                variant="secondary"
                disabled
                accessibilityHint={t('phase.comingIn', { phase: 6 })}
              />
            </View>
            <AppText variant="caption" color="textMuted">
              {t('phase.comingIn', { phase: 6 })}
            </AppText>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 72,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
