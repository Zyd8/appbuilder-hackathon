import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { NoteList } from '@/components/note-list';
import { Screen } from '@/components/screen';
import { todayIso } from '@/data/preview';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';

/** One list for everything the player writes down (ADR-007). Any note can be checked off. */
export default function Notes() {
  const notes = usePreviewStore((s) => s.notes);
  const addNote = usePreviewStore((s) => s.addNote);
  const openCount = notes.filter((note) => !note.done).length;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display" accessibilityRole="header">
          {t('tabs.notes')}
        </AppText>
        {notes.length > 0 ? (
          <AppText variant="caption" color="textMuted">
            {t('notes.openCount', { count: openCount })}
          </AppText>
        ) : null}
      </View>

      <NoteList
        notes={notes}
        today={todayIso()}
        emptyText={t('notes.empty')}
        addPlaceholder={t('notes.capture.placeholder')}
        onAdd={(body) => addNote(body)}
        multiline
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
