import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { t, type StringKey } from '@/i18n';
import { signInWithGoogle } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Status = 'idle' | 'loading' | 'cancelled' | 'offline' | 'error';

const MESSAGES: Partial<Record<Status, StringKey>> = {
  cancelled: 'login.cancelled',
  offline: 'login.offline',
  error: 'login.error',
};

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
        // Notes saved on another phone come back in the background (ADR-008).
        usePreviewStore.getState().syncNotes();
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
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.brand}>
          <View style={[styles.glowOuter, { backgroundColor: colors.glow }]}>
            <View style={[styles.glowInner, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <BrandLogo variant="mark" height={84} />
            </View>
          </View>
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.name}>
            <BrandLogo height={30} />
            <AppText variant="title" color="textMuted" accessibilityRole="header" style={styles.center}>
              {t('landing.title')}
            </AppText>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.actions}>
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
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  glowOuter: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  glowInner: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { alignItems: 'center', gap: spacing.md },
  actions: { gap: spacing.md },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 52 },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
});
