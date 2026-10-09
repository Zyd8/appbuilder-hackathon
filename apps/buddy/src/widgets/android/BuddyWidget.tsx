"use no memo";

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface BuddyWidgetProps {
  level: number;
  xp: number;
  progress: number;
  trend: number[];
}

export function BuddyWidget({ level, xp, progress, trend }: BuddyWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'buddylevelup:///player' }}
      accessibilityLabel="Open Player"
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
      <TextWidget
        text="BUDDY"
        style={{
          color: '#5B3BE8',
          fontSize: 12,
          fontWeight: 'bold',
        }}
      />
      <TextWidget
        text={`Level ${level} · ${xp} XP`}
        style={{
          color: '#17132B',
          fontSize: 22,
          fontWeight: 'bold',
        }}
      />
      <TextWidget
        text={`${Math.round(progress * 100)}% to next level`}
        style={{ color: '#665F7A', fontSize: 12 }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 42,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        {trend.map((value, index) => (
          <FlexWidget
            key={`trend-${index}`}
            style={{
              width: 8,
              height: Math.max(8, Math.round((value / 100) * 42)),
              backgroundColor: index === trend.length - 1 ? '#5B3BE8' : '#C9BFFF',
              borderRadius: 4,
            }}
          />
        ))}
      </FlexWidget>
      <TextWidget
        text="Momentum this week"
        maxLines={2}
        style={{
          color: '#665F7A',
          fontSize: 13,
        }}
      />
    </FlexWidget>
  );
}
