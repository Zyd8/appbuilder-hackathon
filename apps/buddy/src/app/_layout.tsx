import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ToastHost } from '@/components/toast';
import { t } from '@/i18n';
import { retryPendingProfileSync } from '@/lib/auth';
import { usePreviewStore } from '@/state/preview-store';
import { useTheme } from '@/theme/use-theme';

export default function RootLayout() {
  const { colors } = useTheme();
  const setAccount = usePreviewStore((s) => s.setAccount);

  // A profile saved while offline is upserted on the next launch.
  useEffect(() => {
    retryPendingProfileSync()
      .then((profile) => profile && setAccount(profile))
      .catch(() => {});
  }, [setAccount]);
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen
            name="settings"
            options={{ presentation: 'modal', headerShown: true, title: t('settings.title') }}
          />
          <Stack.Screen
            name="check-in"
            options={{ presentation: 'modal', headerShown: true, title: t('checkin.title') }}
          />
        </Stack>
        <ToastHost />
      </View>
    </ThemeProvider>
  );
}
