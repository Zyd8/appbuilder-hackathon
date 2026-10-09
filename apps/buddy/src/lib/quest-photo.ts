/** Thin adapter over the photo library for quest proof photos. */
import * as ImagePicker from 'expo-image-picker';

/**
 * A local photo from the user's library. Undefined if the user cancels.
 * The URI points at a temporary copy: nothing is saved or uploaded yet.
 */
export async function pickQuestPhoto(): Promise<string | undefined> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
  return result.canceled ? undefined : result.assets[0]?.uri;
}
