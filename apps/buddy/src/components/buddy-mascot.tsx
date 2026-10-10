import { Image } from 'expo-image';

import { bambotStage, levelFromTotalXp, type BambotStage } from '@/domain/xp';
import { usePreviewStore } from '@/state/preview-store';

export type BuddyMood = 'happy' | 'thinking' | 'celebrating' | 'sleepy';

/** Bambot art per growth stage; `bambotStage` picks one from the player's level. */
export const BAMBOT_IMAGES: Record<BambotStage, number> = {
  1: require('../../assets/images/bambot1.png'),
  2: require('../../assets/images/bambot2.png'),
  3: require('../../assets/images/bambot3.png'),
};

/** The Bambot image for the current player's level. */
export function useBambotImage(): number {
  const totalXp = usePreviewStore((s) => s.profile.totalXp);
  return BAMBOT_IMAGES[bambotStage(levelFromTotalXp(totalXp).level)];
}

type BuddyMascotProps = {
  mood?: BuddyMood;
  size?: number;
};

/** Buddy mascot: Bambot, in the form that matches the player's level. `mood` only labels it for screen readers. */
export function BuddyMascot({ mood = 'happy', size = 64 }: BuddyMascotProps) {
  const source = useBambotImage();

  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel={`Bambot looks ${mood}`}
    />
  );
}
