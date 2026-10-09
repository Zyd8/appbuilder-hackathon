import { HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  shapes,
  textCase,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayNotesWidgetProps } from './props';

/**
 * Today's notes as the app's checkable list, plus an "Add a note" button. A widget cannot host a
 * text field, so the button opens the app's new-note sheet with the keyboard up; the note is saved to
 * the same on-device store and shows here after.
 * Everything inside the 'widget' function must be self-contained (no module-level values).
 */
export const TodayNotesWidget = createWidget(
  'BuddyNotesWidget',
  (props: TodayNotesWidgetProps, environment: WidgetEnvironment) => {
    'widget';

    const { theme, notes, labels } = props;
    const small = environment.widgetFamily === 'systemSmall';
    const visible = notes.items.slice(0, 3);
    const hidden = notes.items.length - visible.length + notes.hiddenCount;

    const rows = visible.map((note) => (
      <Link key={note.id} destination={`buddylevelup:///note/${note.id}`}>
        <HStack spacing={8}>
          <Image
            systemName={note.done ? 'checkmark.circle.fill' : 'circle'}
            size={17}
            color={note.done ? theme.success : note.high ? theme.danger : theme.textMuted}
          />
          <Text
            modifiers={[
              font({ size: 14 }),
              foregroundStyle(note.done ? theme.textMuted : theme.text),
              lineLimit(1),
            ]}>
            {note.body.replace(/\s+/g, ' ')}
          </Text>
          <Spacer />
        </HStack>
      </Link>
    ));

    const addButton = small ? (
      <Link destination="buddylevelup:///note/new">
        <Image systemName="plus.circle.fill" size={26} color={theme.primary} />
      </Link>
    ) : (
      <Link destination="buddylevelup:///note/new">
        <HStack
          spacing={4}
          modifiers={[
            frame({ maxWidth: 10000, height: 34 }),
            background(theme.primary, shapes.capsule()),
          ]}>
          <Spacer />
          <Image systemName="plus" size={14} color={theme.onPrimary} />
          <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(theme.onPrimary)]}>{labels.notesAdd}</Text>
          <Spacer />
        </HStack>
      </Link>
    );

    return (
      <VStack
        alignment="leading"
        spacing={7}
        modifiers={[containerBackground(theme.background, 'widget'), widgetURL('buddylevelup:///notes')]}>
        <HStack>
          <Text
            modifiers={[
              font({ size: 11, weight: 'bold' }),
              kerning(1.2),
              textCase('uppercase'),
              foregroundStyle(theme.primary),
              lineLimit(1),
            ]}>
            {labels.notesEyebrow}
          </Text>
          <Spacer />
          {small ? addButton : notes.items.length > 0 ? (
            <Text modifiers={[font({ size: 12 }), foregroundStyle(theme.textMuted)]}>{notes.openLabel}</Text>
          ) : null}
        </HStack>

        {visible.length === 0 ? (
          <Text modifiers={[font({ size: 14 }), foregroundStyle(theme.textMuted), lineLimit(2)]}>{labels.notesEmpty}</Text>
        ) : (
          rows
        )}
        {hidden > 0 ? (
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(theme.textMuted)]}>{`+${hidden}`}</Text>
        ) : null}

        <Spacer />
        {small ? null : addButton}
      </VStack>
    );
  },
);
