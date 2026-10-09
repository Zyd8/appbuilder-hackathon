import { Capsule, Circle, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  opacity,
  padding,
  shapes,
  textCase,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { DailyQuestWidgetProps } from './props';

/**
 * The Today tab's quest row (area chip, title, area · minutes · XP) inside a white card.
 * Everything inside the 'widget' function must be self-contained (no module-level values).
 */
export const DailyQuestWidget = createWidget(
  'BuddyQuestWidget',
  (props: DailyQuestWidgetProps, environment: WidgetEnvironment) => {
    'widget';

    const { theme, quest, labels } = props;
    const small = environment.widgetFamily === 'systemSmall';

    // SF Symbols standing in for the app's Ionicons area icons.
    const areaSymbols: Record<string, string> = {
      focus: 'eye',
      creativity: 'paintpalette',
      knowledge: 'book',
      social: 'bubble.left.and.bubble.right',
      finance: 'creditcard',
      calm: 'leaf',
      health: 'drop',
      organization: 'tray.2',
    };

    const url = quest.id && !quest.allDone ? `buddylevelup:///quest/${quest.id}` : 'buddylevelup:///today';
    const card = containerBackground(theme.background, 'widget');

    const header = (
      <HStack>
        <Text modifiers={[font({ size: 11, weight: 'bold' }), kerning(1.2), textCase('uppercase'), foregroundStyle(theme.primary)]}>
          {labels.questEyebrow}
        </Text>
        <Spacer />
        {quest.total > 0 && !small ? (
          <Text modifiers={[font({ size: 12 }), foregroundStyle(theme.textMuted)]}>{quest.progressLabel}</Text>
        ) : null}
      </HStack>
    );

    const chip = (symbol: string, color: string, fill: string, fillOpacity: number) => (
      <ZStack>
        <Circle modifiers={[foregroundStyle(fill), opacity(fillOpacity), frame({ width: 38, height: 38 })]} />
        <Image systemName={symbol as never} size={16} color={color} />
      </ZStack>
    );

    if (quest.allDone || quest.empty) {
      const done = quest.allDone;
      return (
        <VStack alignment="leading" spacing={10} modifiers={[card, widgetURL(url)]}>
          {header}
          <HStack
            spacing={10}
            modifiers={[
              padding({ all: 10 }),
              background(done ? theme.successSoft : theme.surfaceAlt, shapes.roundedRectangle({ cornerRadius: 18 })),
            ]}>
            <ZStack>
              <Circle modifiers={[foregroundStyle(theme.background), frame({ width: 38, height: 38 })]} />
              <Image
                systemName={done ? 'checkmark.circle.fill' : 'bolt'}
                size={18}
                color={done ? theme.success : theme.primary}
              />
            </ZStack>
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(theme.text), lineLimit(1)]}>
                {done ? labels.questAllDone : labels.questEmpty}
              </Text>
              <Text modifiers={[font({ size: 12 }), foregroundStyle(theme.textMuted), lineLimit(2)]}>
                {done ? labels.questAllDoneHint : labels.questEmptyHint}
              </Text>
            </VStack>
            <Spacer />
          </HStack>
          <Spacer />
        </VStack>
      );
    }

    return (
      <VStack alignment="leading" spacing={10} modifiers={[card, widgetURL(url)]}>
        {header}
        <HStack
          spacing={10}
          modifiers={[padding({ all: 10 }), background(theme.surfaceAlt, shapes.roundedRectangle({ cornerRadius: 18 }))]}>
          {quest.done
            ? chip('checkmark', theme.success, theme.successSoft, 1)
            : chip(areaSymbols[quest.area] ?? 'eye', quest.areaColor, quest.areaColor, 0.1)}
          <VStack alignment="leading" spacing={3}>
            <Text
              modifiers={[
                font({ size: 15, weight: 'bold' }),
                foregroundStyle(quest.done ? theme.textMuted : theme.text),
                lineLimit(2),
              ]}>
              {quest.title}
            </Text>
            <HStack spacing={3}>
              <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(quest.areaColor), lineLimit(1)]}>
                {quest.areaLabel}
              </Text>
              <Text modifiers={[font({ size: 12 }), foregroundStyle(theme.textMuted), lineLimit(1)]}>
                {small ? `· ${quest.minutesLabel}` : `· ${quest.minutesLabel} ·`}
              </Text>
              {small ? null : (
                <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(theme.accent), lineLimit(1)]}>
                  {quest.xpLabel}
                </Text>
              )}
            </HStack>
          </VStack>
          <Spacer />
          {small ? null : <Image systemName="chevron.right" size={13} color={theme.textMuted} />}
        </HStack>
        <Spacer />
        {small ? null : (
          <HStack spacing={4}>
            {Array.from({ length: quest.total }, (_, index) => (
              <Capsule
                key={`step-${index}`}
                modifiers={[
                  foregroundStyle(index < quest.doneCount ? theme.primary : theme.border),
                  frame({ height: 4 }),
                ]}
              />
            ))}
          </HStack>
        )}
      </VStack>
    );
  },
);
