import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, useReducedMotion } from 'react-native-reanimated';

import { addMonths, monthGrid, monthOf, parseIsoDate, sameMonth, type YearMonth } from '@/domain/dates';
import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { Button } from './button';

type CalendarProps = {
  /** Today's local ISO date; drawn with a ring. */
  today: string;
  /** Selected ISO date; drawn filled. */
  selected?: string;
  onSelect: (iso: string) => void;
  /** Days that get a dot (days with notes). */
  markedDates?: ReadonlySet<string>;
  /** Draw its own card. Off when placed inside another card. */
  framed?: boolean;
};

/** Sunday, so the weekday header can be built from real dates in the user's locale. */
const A_SUNDAY = new Date(2026, 0, 4);
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(A_SUNDAY.getFullYear(), A_SUNDAY.getMonth(), A_SUNDAY.getDate() + i);
  return {
    short: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
    long: date.toLocaleDateString(undefined, { weekday: 'long' }),
  };
});

/** Month grid card: pick a day, see which days have notes. Weeks start on Sunday. */
export function Calendar({ today, selected, onSelect, markedDates, framed = true }: CalendarProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState<YearMonth>(() => monthOf(selected ?? today));
  const [direction, setDirection] = useState<1 | -1>(1);
  const todayMonth = monthOf(today);
  const cells = monthGrid(visible);
  const title = new Date(visible.year, visible.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const go = (delta: 1 | -1) => {
    setDirection(delta);
    setVisible((current) => addMonths(current, delta));
  };

  const goToday = () => {
    const before = visible.year * 12 + visible.month;
    setDirection(todayMonth.year * 12 + todayMonth.month >= before ? 1 : -1);
    setVisible(todayMonth);
    onSelect(today);
  };

  const entering = reduceMotion
    ? FadeIn.duration(150)
    : (direction === 1 ? FadeInRight : FadeInLeft).duration(280);

  return (
    <View
      style={[styles.wrap, framed && [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]]}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header" style={styles.title} accessibilityLiveRegion="polite">
          {title}
        </AppText>
        {sameMonth(visible, todayMonth) ? null : <Button label={t('calendar.today')} variant="ghost" size="sm" onPress={goToday} />}
        <NavButton icon="chevron-back" label={t('calendar.prev')} onPress={() => go(-1)} />
        <NavButton icon="chevron-forward" label={t('calendar.next')} onPress={() => go(1)} />
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((weekday) => (
          <View key={weekday.long} style={styles.weekday} accessibilityElementsHidden importantForAccessibility="no">
            <AppText variant="overline" color="textMuted">
              {weekday.short.toUpperCase()}
            </AppText>
          </View>
        ))}
      </View>

      <Animated.View key={`${visible.year}-${visible.month}`} entering={entering} style={styles.grid}>
        {cells.map((cell) => {
          const isSelected = cell.iso === selected;
          const isToday = cell.iso === today;
          const marked = markedDates?.has(cell.iso) ?? false;
          const label = [
            parseIsoDate(cell.iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
            marked ? t('calendar.hasNotes') : undefined,
            isToday ? t('calendar.isToday') : undefined,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <Pressable
              key={cell.iso}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                if (!cell.inMonth) {
                  const target = monthOf(cell.iso);
                  setDirection(target.year * 12 + target.month > visible.year * 12 + visible.month ? 1 : -1);
                  setVisible(target);
                }
                onSelect(cell.iso);
              }}
              style={({ pressed }) => [styles.cell, !cell.inMonth && styles.outside, pressed && styles.pressed]}>
              <View
                style={[
                  styles.day,
                  isSelected
                    ? { backgroundColor: colors.primary }
                    : isToday
                      ? { borderWidth: 1.5, borderColor: colors.primary }
                      : null,
                ]}>
                <AppText
                  variant={isToday || isSelected ? 'bodyStrong' : 'body'}
                  color={isSelected ? 'onPrimary' : isToday ? 'primary' : 'text'}>
                  {cell.day}
                </AppText>
              </View>
              <View
                style={[
                  styles.dot,
                  marked && { backgroundColor: isSelected ? colors.primary : colors.accent },
                ]}
              />
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

function NavButton({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.nav, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const CELL = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  title: { flex: 1 },
  nav: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { width: CELL, alignItems: 'center', paddingVertical: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  outside: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  day: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: radius.pill, marginTop: 2 },
});
