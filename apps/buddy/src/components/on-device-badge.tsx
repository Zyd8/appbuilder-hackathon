import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';

/**
 * Shows that the app runs locally. Phase 1 also flags that the content is preview data.
 * Phase 5 replaces "preview" with the real AI mode (Lite mode or the loaded model name).
 */
export function OnDeviceBadge({ preview = true }: { preview?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: colors.successSoft }]}>
        <Ionicons name="phone-portrait-outline" size={13} color={colors.success} />
        <AppText variant="caption" style={{ color: colors.success }}>
          {t('badge.onDevice')}
        </AppText>
      </View>
      {preview ? (
        <View style={[styles.pill, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="flask-outline" size={13} color={colors.accent} />
          <AppText variant="caption" style={{ color: colors.accent }}>
            {t('badge.preview')}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
