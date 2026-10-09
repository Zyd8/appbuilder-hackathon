"use no memo";

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '../widget-snapshot';
import { widgetTheme, withAlpha } from '../widget-theme';
import { Ion, IconChip, Overline, WIDGET_URL } from './parts';

export interface DailyQuestWidgetProps {
  quest: WidgetSnapshot['quest'];
  labels: WidgetSnapshot['labels'];
  /** Widget height in dp. Short widgets drop the footer. */
  height: number;
}

/** The Today tab's quest row (area chip, title, area · minutes · XP) inside a white card. */
export function DailyQuestWidget({ quest, labels, height }: DailyQuestWidgetProps) {
  const roomy = height >= 130;
  const uri = quest.id && !quest.allDone ? WIDGET_URL.quest(quest.id) : WIDGET_URL.today;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={`${labels.questEyebrow}. ${quest.title}`}
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
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ flex: 1 }}>
          <Overline text={labels.questEyebrow} />
        </FlexWidget>
        {quest.total > 0 ? (
          <TextWidget text={quest.progressLabel} maxLines={1} style={{ color: widgetTheme.textMuted, fontSize: 12 }} />
        ) : null}
      </FlexWidget>

      {quest.allDone || quest.empty ? <Notice quest={quest} labels={labels} /> : <QuestRow quest={quest} roomy={roomy} />}

      {roomy && !quest.empty && !quest.allDone ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
          {Array.from({ length: quest.total }, (_, index) => (
            <FlexWidget
              key={`step-${index}`}
              style={{
                flex: 1,
                height: 4,
                marginRight: index === quest.total - 1 ? 0 : 4,
                borderRadius: 2,
                backgroundColor: index < quest.doneCount ? widgetTheme.primary : widgetTheme.border,
              }}
            />
          ))}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

function QuestRow({ quest, roomy }: { quest: WidgetSnapshot['quest']; roomy: boolean }) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: widgetTheme.surfaceAlt,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: roomy ? 12 : 8,
      }}
    >
      <IconChip
        icon={quest.done ? 'checkmark' : quest.areaIcon}
        color={quest.done ? widgetTheme.success : (quest.areaColor as `#${string}`)}
        background={quest.done ? widgetTheme.successSoft : withAlpha(quest.areaColor, 0.1)}
        size={roomy ? 40 : 36}
      />
      <FlexWidget style={{ width: 10 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={quest.title}
          maxLines={2}
          style={{
            color: quest.done ? widgetTheme.textMuted : widgetTheme.text,
            fontSize: 15,
            fontWeight: 'bold',
          }}
        />
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
          <Ion name={quest.areaIcon} size={12} color={quest.areaColor as `#${string}`} />
          <FlexWidget style={{ width: 4 }} />
          <TextWidget
            text={quest.areaLabel}
            maxLines={1}
            style={{ color: quest.areaColor as `#${string}`, fontSize: 12, fontWeight: '500' }}
          />
          <TextWidget text={` · ${quest.minutesLabel} · `} maxLines={1} style={{ color: widgetTheme.textMuted, fontSize: 12 }} />
          <TextWidget text={quest.xpLabel} maxLines={1} style={{ color: widgetTheme.accent, fontSize: 12, fontWeight: '500' }} />
        </FlexWidget>
      </FlexWidget>
      <Ion name="chevron-forward" size={16} color={widgetTheme.textMuted} />
    </FlexWidget>
  );
}

/** "All done" and "no quests yet" share one calm tile, like the app's success and empty states. */
function Notice({ quest, labels }: { quest: WidgetSnapshot['quest']; labels: WidgetSnapshot['labels'] }) {
  const done = quest.allDone;
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: done ? widgetTheme.successSoft : widgetTheme.surfaceAlt,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <IconChip
        icon={done ? 'checkmark-circle' : 'flash-outline'}
        color={done ? widgetTheme.success : widgetTheme.primary}
        background={widgetTheme.background}
        size={36}
      />
      <FlexWidget style={{ width: 10 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={done ? labels.questAllDone : labels.questEmpty}
          maxLines={1}
          style={{ color: widgetTheme.text, fontSize: 15, fontWeight: 'bold' }}
        />
        <TextWidget
          text={done ? labels.questAllDoneHint : labels.questEmptyHint}
          maxLines={2}
          style={{ color: widgetTheme.textMuted, fontSize: 12 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
