"use no memo";

import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetSnapshot } from '../widget-snapshot';
import { widgetTheme, withAlpha } from '../widget-theme';
import { Bar, LevelBadge, Pill, WIDGET_URL } from './parts';

const AVATAR = require('../../../assets/images/widget-avatar.png');

export interface BuddyWidgetProps {
  player: WidgetSnapshot['player'];
  /** Widget size in dp. Decides how much of the profile card fits. */
  width: number;
  height: number;
}

const TRACK = withAlpha(widgetTheme.onPrimary, 0.28);
const SOFT_WHITE = withAlpha(widgetTheme.onPrimary, 0.85);

/** The Player tab's profile card (avatar, name, level meter, streak pills) on the brand gradient. */
export function BuddyWidget({ player, width, height }: BuddyWidgetProps) {
  const wide = width >= 210;
  const tall = height >= 126;
  const avatarSize = Math.min(104, Math.max(72, height - 24));

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: WIDGET_URL.player }}
      accessibilityLabel={player.accessibilityLabel}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 28,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundGradient: {
          from: widgetTheme.gradientStart,
          to: widgetTheme.gradientEnd,
          orientation: 'TL_BR',
        },
      }}
    >
      {wide ? (
        <FlexWidget style={{ height: 'match_parent', justifyContent: 'flex-end', marginRight: 8 }}>
          <ImageWidget
            image={AVATAR}
            imageWidth={avatarSize}
            imageHeight={avatarSize}
            resizeMode="contain"
          />
        </FlexWidget>
      ) : null}

      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget
              text={player.name}
              maxLines={1}
              style={{ color: widgetTheme.onPrimary, fontSize: 18, fontWeight: 'bold' }}
            />
          </FlexWidget>
          {!tall ? <Pill icon="flame" label={player.streakLabel} /> : null}
        </FlexWidget>

        <FlexWidget style={{ height: 8 }} />

        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
          <LevelBadge label={player.levelLabel} level={player.level} />
          <FlexWidget style={{ width: 8 }} />
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            {player.title ? (
              <TextWidget
                text={player.title}
                maxLines={1}
                style={{ color: widgetTheme.onPrimary, fontSize: 13, fontWeight: 'bold' }}
              />
            ) : null}
            <FlexWidget style={{ height: 4 }} />
            <Bar progress={player.progress} fill={widgetTheme.onPrimary} track={TRACK} />
            <FlexWidget style={{ height: 4 }} />
            <TextWidget text={player.xpLabel} maxLines={1} style={{ color: SOFT_WHITE, fontSize: 12 }} />
          </FlexWidget>
        </FlexWidget>

        {tall ? (
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Pill icon="flame" label={player.streakLabel} />
            <FlexWidget style={{ width: 6 }} />
            <Pill icon="moon" label={player.restLabel} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
