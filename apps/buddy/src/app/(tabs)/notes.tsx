import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Calendar } from '@/components/calendar';
import { NoteList } from '@/components/note-list';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Segmented } from '@/components/segmented';
import { todayIso } from '@/data/preview';
import { longDateLabel } from '@/domain/dates';
import { datesWithNotes, notesOnDate } from '@/domain/notes';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';

type NotesView = 'list' | 'calendar';

/** One list for everything the player writes down (ADR-007), with an optional date and a calendar view (ADR-008). */
export default function Notes() {
  const notes = usePreviewStore((s) => s.notes);
  const addNote = usePreviewStore((s) => s.addNote);
  const [view, setView] = useState<NotesView>('list');
  const today = todayIso();
  const [selected, setSelected] = useState(today);
  const openCount = notes.filter((note) => !note.done).length;
  const dayNotes = notesOnDate(notes, selected);

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

      <Segmented<NotesView>
        options={[
          { value: 'list', label: t('notes.view.list') },
          { value: 'calendar', label: t('notes.view.calendar') },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'list' ? (
        <NoteList
          notes={notes}
          today={today}
          showAllDates
          emptyText={t('notes.empty')}
          addPlaceholder={t('notes.capture.placeholder')}
          onAdd={(body, date) => addNote(body, { date })}
          multiline
          datePicker
          voice
        />
      ) : (
        <>
          <Calendar today={today} selected={selected} onSelect={setSelected} markedDates={datesWithNotes(notes)} />
          <SectionHeader
            title={longDateLabel(selected)}
            right={
              dayNotes.length > 0 ? (
                <AppText variant="caption" color="textMuted">
                  {t('today.notes.progress', {
                    done: dayNotes.filter((note) => note.done).length,
                    total: dayNotes.length,
                  })}
                </AppText>
              ) : null
            }
          />
          <NoteList
            notes={dayNotes}
            today={today}
            emptyText={t('notes.day.empty')}
            addPlaceholder={t('notes.day.add')}
            onAdd={(body) => addNote(body, { date: selected })}
            multiline
            voice
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
