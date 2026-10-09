/** Thin adapters over the device APIs that turn a card into a file, a gallery photo, or a share. */
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '@/components/share-card';

const SCALE = 3;

/** Renders the card to a PNG in the cache (transparent where the card has no background). */
export function captureCard(ref: RefObject<View | null>): Promise<string> {
  return captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: SHARE_CARD_WIDTH * SCALE,
    height: SHARE_CARD_HEIGHT * SCALE,
  });
}

/** Returns false when the user denies access to the photo library. */
export async function saveImageToPhotos(uri: string): Promise<boolean> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return false;
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}

export async function canShareImage(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}

export async function shareImage(uri: string, dialogTitle: string): Promise<void> {
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
}

/** A local photo for the card background, cropped to a story. Undefined if the user cancels. */
export async function pickStoryPhoto(): Promise<string | undefined> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [9, 16],
    quality: 1,
  });
  return result.canceled ? undefined : result.assets[0]?.uri;
}
