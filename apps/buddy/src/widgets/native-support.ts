import { requireOptionalNativeModule } from 'expo';
import { NativeModules, TurboModuleRegistry } from 'react-native';

// Widget libraries ship native code that Expo Go (and dev builds made before they were added) do
// not include. Importing them there throws, so every widget entry point checks these first.
export const hasAndroidWidgetModule = () =>
  TurboModuleRegistry.get('AndroidWidget') != null || NativeModules.AndroidWidget != null;

export const hasIosWidgetModule = () => requireOptionalNativeModule('ExpoWidgets') != null;
