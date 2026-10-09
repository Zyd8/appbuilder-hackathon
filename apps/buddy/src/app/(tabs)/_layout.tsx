import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { t } from '@/i18n';
import { useTheme } from '@/theme/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}>
      <Tabs.Screen name="today" options={{ title: t('tabs.today'), tabBarIcon: icon('sunny-outline') }} />
      <Tabs.Screen name="quests" options={{ title: t('tabs.quests'), tabBarIcon: icon('flag-outline') }} />
      <Tabs.Screen name="player" options={{ title: t('tabs.player'), tabBarIcon: icon('person-circle-outline') }} />
      <Tabs.Screen name="buddy" options={{ title: t('tabs.buddy'), tabBarIcon: icon('chatbubble-ellipses-outline') }} />
      <Tabs.Screen name="notes" options={{ title: t('tabs.notes'), tabBarIcon: icon('document-text-outline') }} />
    </Tabs>
  );
}
