"use no memo";

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface DailyQuestWidgetProps {
  title: string;
  minutes: number;
  done: boolean;
  questId: string;
}

export function DailyQuestWidget({ title, minutes, done, questId }: DailyQuestWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: `buddylevelup:///quest/${questId}` }}
      accessibilityLabel="Open daily quest"
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
      <TextWidget text="TODAY'S QUEST" style={{ color: '#5B3BE8', fontSize: 12, fontWeight: 'bold' }} />
      <TextWidget
        text={done ? `✓ ${title}` : title}
        maxLines={2}
        style={{ color: '#17132B', fontSize: 18, fontWeight: 'bold' }}
      />
      <TextWidget
        text={done ? 'Completed · nice work' : `${minutes} min · one small step`}
        style={{ color: '#665F7A', fontSize: 12 }}
      />
    </FlexWidget>
  );
}
