"use no memo";

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface TodayNotesWidgetProps {
  notes: { body: string; done: boolean }[];
}

export function TodayNotesWidget({ notes }: TodayNotesWidgetProps) {
  const visibleNotes = notes.length > 0 ? notes : [{ body: 'Capture one thought for today', done: false }];

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'buddylevelup:///notes' }}
      accessibilityLabel="Open today’s notes"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#FFFFFFFF',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E4DFFF',
        padding: 18,
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <TextWidget text="TODAY'S NOTES" style={{ color: '#5B3BE8', fontSize: 12, fontWeight: 'bold' }} />
      {visibleNotes.map((note, index) => (
        <TextWidget
          key={`${note.body}-${index}`}
          text={`${note.done ? '✓' : '•'} ${note.body}`}
          maxLines={1}
          style={{ color: note.done ? '#8C86A1' : '#17132B', fontSize: 14 }}
        />
      ))}
    </FlexWidget>
  );
}
