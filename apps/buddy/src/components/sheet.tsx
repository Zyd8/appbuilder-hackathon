import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';

type SheetProps = {
  title: string;
  /** Small `primary` label above the title, e.g. "Daily quest". */
  eyebrow?: string;
  children: ReactNode;
  /** Main actions, below the body. */
  footer?: ReactNode;
};

/**
 * Body of a sheet route (`halfSheet` in `app/_layout.tsx`, `sheetAllowedDetents: 'fitToContents'`).
 * The sheet is as tall as this content, so nothing here may use `flex: 1`. Native headers don't
 * render in form sheets, so this draws its own grabber, title, and close button.
 */
export function Sheet({ title, eyebrow, children, footer }: SheetProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.background }}>
      <View style={styles.grabberWrap}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
      </View>

      <View style={styles.header}>
        <View style={styles.titleCol}>
          {eyebrow ? (
            <AppText variant="overline" color="primary">
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sheet.close')}
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.close, { backgroundColor: colors.surfaceAlt }, pressed && styles.pressed]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>{children}</View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  grabberWrap: { alignItems: 'center', paddingTop: spacing.sm },
  grabber: { width: 40, height: 5, borderRadius: radius.pill },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  titleCol: { flex: 1, gap: spacing.xs },
  close: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm },
});
