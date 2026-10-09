import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';

const FILE_NAME = 'widget-avatar.png';

/**
 * A widget cannot read the app's files, so the avatar is copied once into the directory the app and
 * its widgets share (the app group). Returns the file URI for `Image uiImage`, or undefined when it
 * could not be copied (the widget then draws without the avatar).
 */
export async function ensureWidgetAvatar(): Promise<string | undefined> {
  try {
    if (!widgetsDirectory) return undefined;
    const target = new File(widgetsDirectory, FILE_NAME);
    if (!target.exists) {
      const [asset] = await Asset.loadAsync(require('../../../assets/images/widget-avatar.png'));
      if (!asset?.localUri) return undefined;
      new File(asset.localUri).copy(target);
    }
    return target.uri;
  } catch {
    return undefined;
  }
}
