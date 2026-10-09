import { DefaultTheme, Stack, ThemeProvider, type NativeStackNavigationOptions } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastHost } from '@/components/toast';
import { t } from '@/i18n';
import { retryPendingProfileSync } from '@/lib/auth';
import { usePreviewStore } from '@/state/preview-store';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * Rises from the bottom and is only as tall as its content (about half the screen).
 * Fixed detents can lay content out at full height, which hides the bottom actions.
 * Content draws its own header (`components/sheet.tsx`).
 */
const halfSheet: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  headerShown: false,
  sheetAllowedDetents: 'fitToContents',
  sheetCornerRadius: radius.lg + 4,
  sheetGrabberVisible: false,
};

export default function RootLayout() {
  const { colors } = useTheme();
  const setAccount = usePreviewStore((s) => s.setAccount);
  const syncAssessment = usePreviewStore((s) => s.syncAssessment);

  // A profile or answers saved while offline are upserted on the next launch.
  useEffect(() => {
    retryPendingProfileSync()
      .then((profile) => profile && setAccount(profile))
      .catch(() => {});
    syncAssessment();
  }, [setAccount, syncAssessment]);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="dark" />
      <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen
            name="settings"
            options={{ presentation: 'modal', headerShown: true, title: t('settings.title') }}
          />
          <Stack.Screen name="check-in" options={{ ...halfSheet, title: t('checkin.title') }} />
          <Stack.Screen name="stats" options={{ ...halfSheet, title: t('stats.breakdown') }} />
          <Stack.Screen name="quest/[id]" options={{ ...halfSheet, title: t('quests.details') }} />
        </Stack>
        <ToastHost />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
