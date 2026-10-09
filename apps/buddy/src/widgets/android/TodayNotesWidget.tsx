"use no memo";

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '../widget-snapshot';
import { widgetTheme } from '../widget-theme';
import { Ion, Overline, WIDGET_URL } from './parts';

export interface TodayNotesWidgetProps {
  notes: WidgetSnapshot['notes'];
  labels: WidgetSnapshot['labels'];
  /** Widget height in dp. Decides how many notes fit above the add button. */
  height: number;
}

// Header, add button, and card padding use about 112 dp; each note row is 30 dp.
const CHROME_HEIGHT = 112;
const ROW_HEIGHT = 30;

/**
 * Today's notes as the app's checkable list, plus an "Add a note" button.
 * Android widgets cannot host a text field, so the button opens the app's new-note sheet with the
 * keyboard up; the note is saved to the same on-device store and shows here after.
 */
export function TodayNotesWidget({ notes, labels, height }: TodayNotesWidgetProps) {
  const capacity = Math.max(1, Math.min(5, Math.floor((height - CHROME_HEIGHT) / ROW_HEIGHT)));
  const visible = notes.items.slice(0, capacity);
  const hidden = notes.items.length - visible.length + notes.hiddenCount;

  return (
    <FlexWidget
      accessibilityLabel={labels.notesEyebrow}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: widgetTheme.background,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: widgetTheme.border,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: WIDGET_URL.notes }}
        style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}
      >
        <FlexWidget style={{ flex: 1 }}>
          <Overline text={labels.notesEyebrow} />
        </FlexWidget>
        {notes.items.length > 0 ? (
          <TextWidget text={notes.openLabel} maxLines={1} style={{ color: widgetTheme.textMuted, fontSize: 12 }} />
        ) : null}
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
        {visible.length === 0 ? (
          <TextWidget text={labels.notesEmpty} maxLines={2} style={{ color: widgetTheme.textMuted, fontSize: 14 }} />
        ) : (
          visible.map((note) => <NoteRow key={note.id} note={note} />)
        )}
        {hidden > 0 ? (
          <TextWidget
            text={`+${hidden}`}
            style={{ color: widgetTheme.textMuted, fontSize: 12, fontWeight: '500' }}
          />
        ) : null}
      </FlexWidget>

      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: WIDGET_URL.newNote }}
        accessibilityLabel={labels.notesAdd}
        style={{
          width: 'match_parent',
          height: 38,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: widgetTheme.primary,
          borderRadius: 999,
        }}
      >
        <Ion name="add" size={20} color={widgetTheme.onPrimary} />
        <FlexWidget style={{ width: 4 }} />
        <TextWidget text={labels.notesAdd} style={{ color: widgetTheme.onPrimary, fontSize: 14, fontWeight: 'bold' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

function NoteRow({ note }: { note: WidgetSnapshot['notes']['items'][number] }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_URL.note(note.id) }}
      style={{ width: 'match_parent', height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center' }}
    >
      <Ion
        name={note.done ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={note.done ? widgetTheme.success : note.high ? widgetTheme.danger : widgetTheme.textMuted}
      />
      <FlexWidget style={{ width: 8 }} />
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={note.body.replace(/\s+/g, ' ')}
          maxLines={1}
          style={{ color: note.done ? widgetTheme.textMuted : widgetTheme.text, fontSize: 14 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
