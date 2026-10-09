import { Text, VStack } from '@expo/ui/swift-ui';
import { widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type TodayNotesWidgetProps = {
  notes: { body: string; done: boolean }[];
};

export const TodayNotesWidget = createWidget(
  'BuddyNotesWidget',
  (props: TodayNotesWidgetProps, _environment: WidgetEnvironment) => {
    'widget';

    const notes = props.notes.length > 0 ? props.notes : [{ body: 'Capture one thought for today', done: false }];

    return (
      <VStack modifiers={[widgetURL('buddylevelup:///notes')]}>
        <Text>{"TODAY'S NOTES"}</Text>
        {notes.slice(0, 4).map((note) => (
          <Text key={note.body}>{`${note.done ? '✓' : '•'} ${note.body}`}</Text>
        ))}
      </VStack>
    );
  },
);
