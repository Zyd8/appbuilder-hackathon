import { hasAndroidWidgetModule } from './native-support';
import type { WidgetSnapshot } from './widget-snapshot';

/** Redraw every Android widget the player has added, so changes in the app show without waiting for the launcher. */
export function refreshWidgets(snapshot: WidgetSnapshot): void {
  if (!hasAndroidWidgetModule()) return;

  // Required lazily so Expo Go and older dev builds, which lack the native module, never load it.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { ANDROID_WIDGET_NAMES, renderAndroidWidget } =
    require('./android/render-widget') as typeof import('./android/render-widget');
  /* eslint-enable @typescript-eslint/no-require-imports */

  for (const widgetName of ANDROID_WIDGET_NAMES) {
    requestWidgetUpdate({
      widgetName,
      renderWidget: (info) => renderAndroidWidget(widgetName, snapshot, info) ?? <></>,
    }).catch(() => {
      // A widget that fails to redraw keeps its last picture and tries again on the next change.
    });
  }
}
