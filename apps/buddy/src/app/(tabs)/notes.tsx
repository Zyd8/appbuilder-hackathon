import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
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
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

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

      <SyncNotice />

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
          />
        </>
      )}
    </Screen>
  );
}

/** Honest backup state: shown only while changes wait on this phone (design system §12). */
function SyncNotice() {
  const { colors } = useTheme();
  const sync = usePreviewStore((s) => s.notesSync);
  const syncNotes = usePreviewStore((s) => s.syncNotes);
  if (sync.pending === 0) return null;

  if (sync.status === 'syncing') {
    return (
      <AppText variant="caption" color="textMuted" accessibilityLiveRegion="polite">
        {t('notes.sync.syncing')}
      </AppText>
    );
  }
  if (sync.status !== 'failed') return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Ionicons name="cloud-offline-outline" size={20} color={colors.primary} />
      <AppText variant="caption" style={styles.noticeText}>
        {sync.pending === 1
          ? t('notes.sync.pending.one')
          : t('notes.sync.pending.other', { count: sync.pending })}
      </AppText>
      <Button label={t('notes.sync.retry')} variant="ghost" size="sm" onPress={syncNotes} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  noticeText: { flex: 1 },
});
