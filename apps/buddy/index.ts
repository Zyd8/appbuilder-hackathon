import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/android/widget-task-handler') as typeof import('./src/widgets/android/widget-task-handler');

  registerWidgetTaskHandler(widgetTaskHandler);
}

if (Platform.OS === 'ios') {
  const { initializeBuddyWidget } = require('./src/widgets/ios/initialize') as typeof import('./src/widgets/ios/initialize');

  initializeBuddyWidget();
}

import 'expo-router/entry';
