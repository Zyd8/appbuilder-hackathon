import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/components/glass-tab-bar';
import { t } from '@/i18n';

/**
 * Tab order follows the daily loop: see today, do quests, jot notes, check your progress.
 * Buddy comes last because the tab bar draws it as the separate round button.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
      <Tabs.Screen name="today" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="quests" options={{ title: t('tabs.quests') }} />
      <Tabs.Screen name="notes" options={{ title: t('tabs.notes') }} />
      <Tabs.Screen name="player" options={{ title: t('tabs.player') }} />
      <Tabs.Screen name="buddy" options={{ title: t('tabs.buddy') }} />
    </Tabs>
  );
}
