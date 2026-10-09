import { Platform } from 'react-native';

import { hasAndroidWidgetModule, hasIosWidgetModule } from './src/widgets/native-support';

// Widget libraries ship native code that Expo Go (and dev builds made before they were added) do not
// include. Importing them there throws at startup, so only register widgets when the native module
// is actually linked.
if (Platform.OS === 'android' && hasAndroidWidgetModule()) {
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/android/widget-task-handler') as typeof import('./src/widgets/android/widget-task-handler');

  registerWidgetTaskHandler(widgetTaskHandler);
}

if (Platform.OS === 'ios' && hasIosWidgetModule()) {
  const { initializeBuddyWidget } = require('./src/widgets/ios/initialize') as typeof import('./src/widgets/ios/initialize');

  initializeBuddyWidget();
}

import 'expo-router/entry';
