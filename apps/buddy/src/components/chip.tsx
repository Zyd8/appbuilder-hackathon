import { Pressable, StyleSheet } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** "compact" chips size to their label so several fit on one row. */
  size?: 'md' | 'compact';
  accessibilityLabel?: string;
  /** Retired/legacy options render muted and ignore presses. */
  disabled?: boolean;
};

export function Chip({ label, selected = false, onPress, size = 'md', accessibilityLabel, disabled = false }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.chip,
        size === 'compact' && styles.compact,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}>
      <AppText variant="bodyStrong" style={{ color: selected ? colors.onPrimary : colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  compact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
});
