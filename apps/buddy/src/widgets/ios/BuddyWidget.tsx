import { Chart, Text, VStack } from '@expo/ui/swift-ui';
import { widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type BuddyWidgetProps = {
  level: number;
  xp: number;
  progress: number;
  trend: number[];
};

export const BuddyWidget = createWidget(
  'BuddyWidget',
  (props: BuddyWidgetProps, environment: WidgetEnvironment) => {
    'widget';

    return (
      <VStack modifiers={[widgetURL('buddylevelup:///player')]}>
        <Text> BUDDY </Text>
        <Text>
          Level {props.level} · {props.xp} XP
        </Text>
        <Text>{Math.round(props.progress * 100)}% to next level</Text>
        <Chart
          data={props.trend.map((value, index) => ({
            x: index,
            y: value,
            color: index === props.trend.length - 1 ? '#5B3BE8' : '#C9BFFF',
          }))}
          type="bar"
          showGrid={false}
          barStyle={{ cornerRadius: 3, width: 8 }}
          style={{ height: 48 }}
        />
        <Text>{environment.widgetFamily === 'systemSmall' ? 'One small quest.' : 'Your next level starts with one small quest.'}</Text>
      </VStack>
    );
  }
);
