import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type CardProps = ViewProps & {
  /** "status" adds the soft glow border used for game-style status windows. */
  tone?: 'default' | 'status' | 'muted';
};

export function Card({ tone = 'default', style, ...rest }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone === 'muted' ? colors.surfaceAlt : colors.surface,
          borderColor: tone === 'status' ? colors.primary : colors.border,
          shadowColor: colors.primary,
        },
        tone === 'status' && styles.status,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  status: {
    borderWidth: 1.5,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
