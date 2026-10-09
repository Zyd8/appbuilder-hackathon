import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { LifeArea } from '@/domain/types';
import { t } from '@/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const LIFE_AREA_ICONS: Record<LifeArea, IconName> = {
  focus: 'eye-outline',
  creativity: 'color-palette-outline',
  knowledge: 'book-outline',
  social: 'chatbubbles-outline',
  finance: 'wallet-outline',
  calm: 'leaf-outline',
  health: 'water-outline',
  organization: 'file-tray-stacked-outline',
};

export function areaLabel(area: LifeArea): string {
  return t(`area.${area}`);
}
