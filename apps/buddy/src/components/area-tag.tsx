import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { areaLabel, LIFE_AREA_ICONS } from '@/data/life-areas';
import type { LifeArea } from '@/domain/types';
import { areaColors, radius, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

export function AreaTag({ area }: { area: LifeArea }) {
  const color = areaColors[area];
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Ionicons name={LIFE_AREA_ICONS[area]} size={13} color={color} />
      <AppText variant="caption" style={{ color }}>
        {areaLabel(area)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
});
