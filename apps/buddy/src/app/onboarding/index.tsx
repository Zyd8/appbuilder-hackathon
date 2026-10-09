import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BrandLogo } from '@/components/brand-logo';
import { BuddyMascot, type BuddyMood } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { GradientPanel } from '@/components/gradient-panel';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { t, type StringKey } from '@/i18n';
import { signInWithGoogle } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Status = 'idle' | 'loading' | 'cancelled' | 'offline' | 'error';

const MESSAGES: Partial<Record<Status, StringKey>> = {
  cancelled: 'login.cancelled',
  offline: 'login.offline',
  error: 'login.error',
};

const MOODS: Record<Status, BuddyMood> = {
  idle: 'happy',
  loading: 'thinking',
  cancelled: 'happy',
  offline: 'sleepy',
  error: 'thinking',
};

const FEATURES: { icon: IconName; label: StringKey }[] = [
  { icon: 'flag-outline', label: 'landing.feature.quests' },
  { icon: 'cloud-offline-outline', label: 'landing.feature.offline' },
  { icon: 'lock-closed-outline', label: 'landing.feature.private' },
];

/** Landing page. Google sign-in is required before onboarding (ADR-005). */
export default function Landing() {
  const { colors } = useTheme();
  const account = usePreviewStore((s) => s.account);
  const setAccount = usePreviewStore((s) => s.setAccount);
  const restoreAssessment = usePreviewStore((s) => s.restoreAssessment);
  const showToast = useToast((s) => s.show);
  const [status, setStatus] = useState<Status>('idle');

  async function onSignIn() {
    setStatus('loading');
    const result = await signInWithGoogle();
    switch (result.status) {
      case 'ok':
        setAccount(result.profile);
        // Bring back answers saved on another phone before deciding where to go (ADR-006).
        await restoreAssessment();
        if (!result.synced) showToast(t('login.syncPending'));
        setStatus('idle');
        if (usePreviewStore.getState().onboarded) router.replace('/today');
        else router.push('/onboarding/questions');
        return;
      case 'not_configured':
        setStatus('error');
        return;
      default:
        setStatus(result.status);
    }
  }

  const message = MESSAGES[status];
  const retry = status === 'offline' || status === 'error';

  return (
    <Screen edges={['top', 'bottom']}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <GradientPanel style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.markBadge}>
              <BrandLogo variant="mark" height={20} />
            </View>
            <AppText variant="overline" color="onPrimary" style={styles.heroOverline}>
              {t('landing.overline')}
            </AppText>
          </View>
          <FloatingBuddy mood={MOODS[status]} />
          <View style={styles.chips}>
            <HeroChip icon="flash" label={t('landing.chip.xp')} />
            <HeroChip icon="trending-up" label={t('landing.chip.level')} />
            <HeroChip icon="flame" label={t('landing.chip.streak')} />
          </View>
        </GradientPanel>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.copy}>
        <BrandLogo height={26} />
        <AppText variant="hero" accessibilityRole="header">
          {t('landing.title')}
        </AppText>
        <AppText color="textMuted">{t('landing.body')}</AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.label} style={[styles.feature, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name={f.icon} size={20} color={colors.primary} />
            <AppText variant="caption" style={styles.featureLabel}>
              {t(f.label)}
            </AppText>
          </View>
        ))}
      </Animated.View>

      {message ? (
        <View
          style={[styles.notice, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          accessibilityLiveRegion="polite">
          <Ionicons
            name={status === 'offline' ? 'cloud-offline-outline' : 'information-circle-outline'}
            size={20}
            color={status === 'error' ? colors.danger : colors.primary}
          />
          <AppText style={styles.flex}>{t(message)}</AppText>
        </View>
      ) : null}

      {isSupabaseConfigured || account ? null : (
        <AppText variant="caption" color="danger" style={styles.center}>
          {t('login.notConfigured')}
        </AppText>
      )}

      <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.actions}>
        {account ? (
          <Button
            label={t('landing.continueAs', { name: account.displayName ?? account.email ?? '' })}
            icon="arrow-forward"
            onPress={() => router.push('/onboarding/questions')}
          />
        ) : status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <AppText color="textMuted">{t('login.loading')}</AppText>
          </View>
        ) : (
          <Button
            label={retry ? t('login.retry') : t('login.google')}
            icon={retry ? 'refresh' : 'logo-google'}
            disabled={!isSupabaseConfigured}
            onPress={onSignIn}
          />
        )}
        <AppText variant="caption" color="textMuted" style={styles.center}>
          {t('landing.time')}
        </AppText>
      </Animated.View>

      <View style={styles.privacy}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
        <AppText variant="caption" color="textMuted" style={styles.flex}>
          {t('login.privacy')}
        </AppText>
      </View>
    </Screen>
  );
}

/** Buddy in a white halo, bobbing gently (still when Reduce Motion is on). */
function FloatingBuddy({ mood }: { mood: BuddyMood }) {
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    bob.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, bob]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * bob.get() }] }));

  return (
    <Animated.View style={[styles.halo, style]}>
      <BuddyMascot mood={mood} size={112} />
    </Animated.View>
  );
}

function HeroChip({ icon, label }: { icon: IconName; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={13} color={colors.primary} />
      <AppText variant="caption" color="primary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center', gap: spacing.lg },
  heroTop: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  markBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverline: { opacity: 0.9 },
  halo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001A66',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  copy: { gap: spacing.sm },
  features: { flexDirection: 'row', gap: spacing.sm },
  feature: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md },
  featureLabel: { textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  actions: { gap: spacing.sm },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 52 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
});
