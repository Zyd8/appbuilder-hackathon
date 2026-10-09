import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type CheckInPromptProps = {
  /** Set once the player has checked in today; the row then becomes a quiet confirmation. */
  doneLabel?: string;
  onPress: () => void;
};

/** Compact one-row daily check-in. Pops in from the left; Reduce Motion gets a short fade. */
export function CheckInPrompt({ doneLabel, onPress }: CheckInPromptProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion ? FadeIn.duration(200) : FadeInLeft.delay(250).springify().damping(14);

  if (doneLabel) {
    return (
      <Animated.View entering={entering} style={[styles.row, { backgroundColor: colors.successSoft }]}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        <AppText variant="bodyStrong" style={styles.flex}>
          {doneLabel}
        </AppText>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={entering}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('today.checkin.title')} ${t('today.checkin.body')}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          styles.bordered,
          pressed && styles.pressed,
        ]}>
        <View style={[styles.icon, { backgroundColor: colors.primary }]}>
          <Ionicons name="pulse" size={18} color={colors.onPrimary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{t('today.checkin.title')}</AppText>
          <AppText variant="caption" color="textMuted">
            {t('today.checkin.body')}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bordered: { borderWidth: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  icon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
