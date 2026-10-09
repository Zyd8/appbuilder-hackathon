import { hasIosWidgetModule } from './native-support';
import type { WidgetSnapshot } from './widget-snapshot';

/** Push changes made in the app into the iOS widgets so they show the same data. */
export function refreshWidgets(snapshot: WidgetSnapshot): void {
  if (!hasIosWidgetModule()) return;

  // Required lazily so Expo Go and older dev builds, which lack the native module, never load it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { updateIosWidgets } = require('./ios/initialize') as typeof import('./ios/initialize');
  updateIosWidgets(snapshot).catch(() => {
    // A widget that fails to update keeps its last picture and tries again on the next change.
  });
}
