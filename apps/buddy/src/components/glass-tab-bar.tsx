import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import type { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Outline icon when idle, filled icon when selected (design system, section 6). */
export const TAB_ICONS: Record<string, { idle: IconName; active: IconName }> = {
  today: { idle: 'sunny-outline', active: 'sunny' },
  quests: { idle: 'flag-outline', active: 'flag' },
  buddy: { idle: 'chatbubble-ellipses-outline', active: 'chatbubble-ellipses' },
  notes: { idle: 'document-text-outline', active: 'document-text' },
  player: { idle: 'person-circle-outline', active: 'person-circle' },
};

const BAR_HEIGHT = 68;
const BAR_GAP = spacing.sm;
/** Space screens must keep free at the bottom so content never hides behind the bar. */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BAR_GAP * 2 + spacing.lg;

/** The route shown as the separate round button beside the pill. */
const ACTION_ROUTE = 'buddy';

/**
 * Floating frosted-glass tab bar: a pill of four tabs plus a separate round button for Buddy.
 * The selected tab gets a soft `glow` capsule with a filled `primary` icon and label; the rest
 * stay quiet with outline icons and a muted label, so there is always one clear "you are here".
 */
export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, spacing.sm) + BAR_GAP - spacing.xs;

  // Like the stock tab bar, step aside while the keyboard is open (e.g. chatting with Buddy).
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboardOpen) return null;


  const renderTab = (route: TabBarProps['state']['routes'][number], round: boolean) => {
    const focused = state.routes[state.index]?.key === route.key;
    const label = descriptors[route.key].options.title ?? route.name;
    const icons = TAB_ICONS[route.name];
    const iconName = focused ? icons?.active : icons?.idle;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        style={({ pressed }) => [
          round ? styles.round : styles.tab,
          focused && !round && { backgroundColor: colors.glow },
          focused && round && { backgroundColor: colors.primary },
          pressed && { opacity: 0.8 },
        ]}>
        <Ionicons
          name={iconName}
          size={round ? 28 : 24}
          color={round ? (focused ? colors.onPrimary : colors.primary) : focused ? colors.primary : colors.textMuted}
        />
        {round ? null : (
          <AppText variant="caption" color={focused ? 'primary' : 'textMuted'} numberOfLines={1}>
            {label}
          </AppText>
        )}
      </Pressable>
    );
  };

  const pillRoutes = state.routes.filter((r) => r.name !== ACTION_ROUTE);
  const actionRoute = state.routes.find((r) => r.name === ACTION_ROUTE);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={styles.bar} pointerEvents="box-none">
        <Glass style={styles.pill}>
          <View style={styles.row} accessibilityRole="tablist">
            {pillRoutes.map((route) => renderTab(route, false))}
          </View>
        </Glass>
        {actionRoute ? <Glass style={styles.circle}>{renderTab(actionRoute, true)}</Glass> : null}
      </View>
    </View>
  );
}

/** One frosted-glass surface: blur, white veil, hairline edge, soft shadow. */
function Glass({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.shadow, { shadowColor: colors.shadow }, style]}>
      <View style={[styles.clip, { borderColor: colors.glassBorder }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 60 : 0} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  bar: { width: '100%', maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { flex: 1, height: BAR_HEIGHT },
  circle: { width: BAR_HEIGHT, height: BAR_HEIGHT },
  shadow: {
    borderRadius: radius.pill,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  clip: { flex: 1, borderRadius: radius.pill, borderWidth: 1, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: spacing.xs },
  tab: {
    flex: 1,
    height: '100%',
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  round: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
