import { Image } from 'expo-image';

import { t } from '@/i18n';

const WORDMARK = require('../../assets/images/angat-wordmark.png');
const MARK = require('../../assets/images/angat-mark.png');

// Intrinsic aspect ratios of the cropped brand assets (width / height).
const WORDMARK_RATIO = 1259 / 256;
const MARK_RATIO = 1290 / 1114;

type BrandLogoProps = {
  /** "wordmark" is the full ANGAT logo; "mark" is the standalone A icon. */
  variant?: 'wordmark' | 'mark';
  /** Rendered height in points; width follows the asset's aspect ratio. */
  height?: number;
};

export function BrandLogo({ variant = 'wordmark', height = 32 }: BrandLogoProps) {
  const isWordmark = variant === 'wordmark';
  return (
    <Image
      source={isWordmark ? WORDMARK : MARK}
      style={{ height, width: height * (isWordmark ? WORDMARK_RATIO : MARK_RATIO) }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel={t('app.name')}
    />
  );
}
