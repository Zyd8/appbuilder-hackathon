import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Task } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { AreaTag } from './area-tag';

export function TaskRow({ task }: { task: Task }) {
  const { colors } = useTheme();
  const toggleTask = usePreviewStore((s) => s.toggleTask);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
      accessibilityLabel={task.title}
      onPress={() => toggleTask(task.id)}
      style={styles.row}>
      <Ionicons
        name={task.done ? 'checkbox' : 'square-outline'}
        size={24}
        color={task.done ? colors.success : colors.textMuted}
      />
      <View style={styles.flex}>
        <AppText style={task.done && styles.done}>{task.title}</AppText>
        <View style={styles.meta}>
          {task.priority === 'high' ? (
            <AppText variant="caption" color="danger">
              {t('notes.priorityHigh')}
            </AppText>
          ) : null}
          {task.due ? (
            <AppText variant="caption" color="textMuted">
              {t('notes.due', { date: new Date(`${task.due}T00:00:00`).toLocaleDateString() })}
            </AppText>
          ) : null}
          {task.area ? <AreaTag area={task.area} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.xs, minHeight: 44 },
  flex: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  done: { textDecorationLine: 'line-through', opacity: 0.6 },
});
