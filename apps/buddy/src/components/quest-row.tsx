import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { areaLabel, LIFE_AREA_ICONS } from '@/data/life-areas';
import type { Quest } from '@/domain/types';
import { t } from '@/i18n';
import { areaColors, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';

/** Fixed height so `DraggableList` can lay rows out by index. */
export const QUEST_ROW_HEIGHT = 68;

type QuestRowProps = {
  quest: Quest;
  /** Lifted while being dragged. */
  dragging?: boolean;
  /** Shows the drag handle (Today). Otherwise a chevron says the row opens. */
  draggable?: boolean;
};

/** Compact, glanceable quest summary. The full quest (instruction, why, actions) lives in the quest modal. */
export function QuestRow({ quest, dragging = false, draggable = true }: QuestRowProps) {
  const { colors } = useTheme();
  const done = quest.status === 'done';
  const areaColor = areaColors[quest.area];

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: dragging ? colors.primary : colors.border, shadowColor: colors.shadow },
        dragging && styles.dragging,
      ]}>
      <View style={[styles.icon, { backgroundColor: done ? colors.successSoft : `${areaColor}1A` }]}>
        {done ? (
          <Ionicons name="checkmark" size={18} color={colors.success} accessibilityLabel={t('quests.completed')} />
        ) : (
          <Ionicons name={LIFE_AREA_ICONS[quest.area]} size={18} color={areaColor} />
        )}
      </View>

      <View style={styles.body}>
        <AppText variant="bodyStrong" numberOfLines={1} style={done && styles.strike}>
          {quest.title}
        </AppText>
        <View style={styles.meta}>
          <Ionicons name={LIFE_AREA_ICONS[quest.area]} size={12} color={areaColor} />
          <AppText variant="caption" style={{ color: areaColor }} numberOfLines={1}>
            {areaLabel(quest.area)}
          </AppText>
          <AppText variant="caption" color="textMuted">
            · {t('quests.minutes', { count: quest.estMinutes })} ·
          </AppText>
          <AppText variant="caption" color="accent">
            {t('quests.xp', { count: quest.xp })}
          </AppText>
        </View>
      </View>

      <Ionicons name={draggable ? 'reorder-two' : 'chevron-forward'} size={draggable ? 22 : 18} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: QUEST_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  dragging: {
    borderWidth: 1.5,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  icon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  strike: { textDecorationLine: 'line-through', opacity: 0.7 },
});
