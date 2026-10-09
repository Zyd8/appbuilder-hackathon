import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { moveItem } from '@/domain/reorder';
import { t } from '@/i18n';
import { spacing } from '@/theme/tokens';

const LONG_PRESS_MS = 280;

type Positions = Record<string, number>;

type DraggableListProps<T extends { id: string }> = {
  items: T[];
  /** Every row must be exactly this tall. */
  rowHeight: number;
  gap?: number;
  renderItem: (item: T, dragging: boolean) => ReactNode;
  /** Accessibility label for a row. */
  labelFor: (item: T) => string;
  onPress: (item: T) => void;
  /** The new order, as ids, after a drag or a screen-reader move. */
  onReorder: (ids: string[]) => void;
};

function indexMap(ids: string[]): Positions {
  const map: Positions = {};
  ids.forEach((id, index) => (map[id] = index));
  return map;
}

/**
 * Fixed-height list that reorders by hold-and-drag. Tap opens a row; screen readers get
 * "Move up" / "Move down" actions instead of the drag.
 */
export function DraggableList<T extends { id: string }>({
  items,
  rowHeight,
  gap = spacing.sm,
  renderItem,
  labelFor,
  onPress,
  onReorder,
}: DraggableListProps<T>) {
  const ids = items.map((item) => item.id);
  const idsKey = ids.join('|');
  const positions = useSharedValue<Positions>(indexMap(ids));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Store order changed (drop, swap, new day): snap the layout to it.
  useEffect(() => {
    positions.set(indexMap(idsKey ? idsKey.split('|') : []));
  }, [idsKey, positions]);

  const step = rowHeight + gap;
  const height = items.length > 0 ? items.length * step - gap : 0;

  const finishDrag = (order: string[]) => {
    setActiveId(null);
    if (order.join('|') !== idsKey) onReorder(order);
  };

  return (
    <View style={{ height }}>
      {items.map((item, index) => (
        <DraggableRow
          key={item.id}
          id={item.id}
          count={items.length}
          step={step}
          rowHeight={rowHeight}
          positions={positions}
          label={labelFor(item)}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
          onPress={() => onPress(item)}
          onMove={(delta) => onReorder(moveItem(ids, index, index + delta))}
          onDragStart={() => setActiveId(item.id)}
          onDragEnd={finishDrag}>
          {renderItem(item, activeId === item.id)}
        </DraggableRow>
      ))}
    </View>
  );
}

type DraggableRowProps = {
  id: string;
  count: number;
  step: number;
  rowHeight: number;
  positions: SharedValue<Positions>;
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPress: () => void;
  onMove: (delta: number) => void;
  onDragStart: () => void;
  onDragEnd: (order: string[]) => void;
  children: ReactNode;
};

function DraggableRow({
  id,
  count,
  step,
  rowHeight,
  positions,
  label,
  canMoveUp,
  canMoveDown,
  onPress,
  onMove,
  onDragStart,
  onDragEnd,
  children,
}: DraggableRowProps) {
  const reduceMotion = useReducedMotion();
  const active = useSharedValue(false);
  const pressed = useSharedValue(false);
  const startY = useSharedValue(0);
  const dragY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      const y = (positions.get()[id] ?? 0) * step;
      startY.set(y);
      dragY.set(y);
      active.set(true);
      scheduleOnRN(onDragStart);
    })
    .onUpdate((e) => {
      const y = Math.min(Math.max(startY.get() + e.translationY, 0), (count - 1) * step);
      dragY.set(y);
      const current = positions.get();
      const from = current[id];
      const to = Math.round(y / step);
      if (to === from) return;
      const next: Positions = { ...current };
      for (const key of Object.keys(current)) {
        if (current[key] === to) next[key] = from;
      }
      next[id] = to;
      positions.set(next);
    })
    .onFinalize(() => {
      if (!active.get()) return;
      active.set(false);
      const current = positions.get();
      const order = Object.keys(current).sort((a, b) => current[a] - current[b]);
      scheduleOnRN(onDragEnd, order);
    });

  const tap = Gesture.Tap()
    .onBegin(() => pressed.set(true))
    .onFinalize(() => pressed.set(false))
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(onPress);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const style = useAnimatedStyle(() => {
    const target = (positions.get()[id] ?? 0) * step;
    const isActive = active.get();
    return {
      top: isActive ? dragY.get() : withTiming(target, { duration: reduceMotion ? 0 : 200 }),
      zIndex: isActive ? 10 : 0,
      opacity: pressed.get() && !isActive ? 0.8 : 1,
      transform: [{ scale: isActive && !reduceMotion ? 1.03 : 1 }],
    };
  });

  const actions = [
    { name: 'activate' },
    ...(canMoveUp ? [{ name: 'moveUp', label: t('quests.moveUp') }] : []),
    ...(canMoveDown ? [{ name: 'moveDown', label: t('quests.moveDown') }] : []),
  ];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.row, { height: rowHeight }, style]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t('quests.rowHint')}
        accessibilityActions={actions}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onPress();
          if (e.nativeEvent.actionName === 'moveUp') onMove(-1);
          if (e.nativeEvent.actionName === 'moveDown') onMove(1);
        }}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0 },
});
