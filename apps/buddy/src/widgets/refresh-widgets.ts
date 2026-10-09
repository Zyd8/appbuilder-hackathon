import type { WidgetSnapshot } from './widget-snapshot';

/** Web has no home-screen widgets. The Android and iOS versions are `refresh-widgets.android.ts` and `.ios.ts`. */
export function refreshWidgets(_snapshot: WidgetSnapshot): void {}
