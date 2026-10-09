import { Circle, HStack, Image, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  opacity,
  padding,
  progressViewStyle,
  resizable,
  shapes,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { BuddyWidgetProps } from './props';

/**
 * The Player tab's profile card on the brand gradient: avatar, name, level meter, streak pills.
 * Everything inside the 'widget' function must be self-contained (no module-level values).
 */
export const BuddyWidget = createWidget(
  'BuddyWidget',
  (props: BuddyWidgetProps, environment: WidgetEnvironment) => {
    'widget';

    const { theme, player, avatarUri } = props;
    const small = environment.widgetFamily === 'systemSmall';

    const badge = (
      <ZStack>
        <Circle modifiers={[foregroundStyle(theme.background), frame({ width: 42, height: 42 })]} />
        <VStack spacing={0}>
          <Text modifiers={[font({ size: 9, weight: 'bold' }), foregroundStyle(theme.primary)]}>{player.levelLabel}</Text>
          <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(theme.primary)]}>{String(player.level)}</Text>
        </VStack>
      </ZStack>
    );

    const pill = (icon: 'flame.fill' | 'moon.fill', label: string) => (
      <HStack
        spacing={4}
        modifiers={[
          padding({ horizontal: 9, vertical: 4 }),
          background(theme.background, shapes.capsule()),
        ]}>
        <Image systemName={icon} size={12} color={theme.primary} />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(theme.primary), lineLimit(1)]}>
          {label}
        </Text>
      </HStack>
    );

    const meter = (
      <HStack spacing={8}>
        {badge}
        <VStack alignment="leading" spacing={3}>
          {player.title ? (
            <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(theme.onPrimary), lineLimit(1)]}>
              {player.title}
            </Text>
          ) : null}
          <ProgressView
            value={player.progress}
            modifiers={[progressViewStyle('linear'), tint(theme.onPrimary)]}
          />
          <Text modifiers={[font({ size: 12 }), foregroundStyle(theme.onPrimary), opacity(0.85), lineLimit(1)]}>
            {player.xpLabel}
          </Text>
        </VStack>
      </HStack>
    );

    const gradient = containerBackground(
      {
        type: 'linearGradient',
        colors: [theme.gradientStart, theme.gradientEnd],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 },
      },
      'widget',
    );

    if (small) {
      return (
        <VStack alignment="leading" spacing={8} modifiers={[gradient, widgetURL('buddylevelup:///player')]}>
          <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(theme.onPrimary), lineLimit(1)]}>
            {player.name}
          </Text>
          {meter}
          <Spacer />
          {pill('flame.fill', player.streakLabel)}
        </VStack>
      );
    }

    return (
      <HStack spacing={10} modifiers={[gradient, widgetURL('buddylevelup:///player')]}>
        {avatarUri ? (
          <Image uiImage={avatarUri} modifiers={[resizable(), frame({ width: 96, height: 96, alignment: 'bottom' })]} />
        ) : null}
        <VStack alignment="leading" spacing={8}>
          <Text modifiers={[font({ size: 19, weight: 'bold' }), foregroundStyle(theme.onPrimary), lineLimit(1)]}>
            {player.name}
          </Text>
          {meter}
          <HStack spacing={6}>
            {pill('flame.fill', player.streakLabel)}
            {pill('moon.fill', player.restLabel)}
          </HStack>
        </VStack>
      </HStack>
    );
  },
);
