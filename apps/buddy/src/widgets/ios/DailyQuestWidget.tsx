import { Text, VStack } from '@expo/ui/swift-ui';
import { widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type DailyQuestWidgetProps = {
  questId: string;
  title: string;
  minutes: number;
  done: boolean;
};

export const DailyQuestWidget = createWidget(
  'BuddyQuestWidget',
  (props: DailyQuestWidgetProps, _environment: WidgetEnvironment) => {
    'widget';

    return (
      <VStack modifiers={[widgetURL(`buddylevelup:///quest/${props.questId}`)]}>
        <Text>{"TODAY'S QUEST"}</Text>
        <Text>{props.done ? `✓ ${props.title}` : props.title}</Text>
        <Text>{props.done ? 'Completed · nice work' : `${props.minutes} min · one small step`}</Text>
      </VStack>
    );
  },
);
