import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BuddyMascot, type BuddyMood } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { t, type StringKey } from '@/i18n';
import { signInWithGoogle } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

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

export default function Login() {
  const { colors } = useTheme();
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
        // Bring back answers saved on another phone before deciding where to go.
        await restoreAssessment();
        if (!result.synced) showToast(t('login.syncPending'));
        setStatus('idle');
        router.replace(usePreviewStore.getState().onboarded ? '/today' : '/onboarding/questions');
        return;
      case 'not_configured':
        setStatus('error');
        return;
      default:
        setStatus(result.status);
    }
  }

  const message = MESSAGES[status];
  const loading = status === 'loading';

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <BuddyMascot mood={MOODS[status]} size={120} />
        <AppText variant="display" style={styles.center}>
          {t('login.title')}
        </AppText>
        <AppText color="textMuted" style={styles.center}>
          {t('login.body')}
        </AppText>
      </View>

      {message ? (
        <Card tone="muted" style={styles.row}>
          <Ionicons
            name={status === 'offline' ? 'cloud-offline-outline' : 'information-circle-outline'}
            size={20}
            color={status === 'error' ? colors.danger : colors.primary}
          />
          <AppText style={styles.flex} accessibilityLiveRegion="polite">
            {t(message)}
          </AppText>
        </Card>
      ) : null}

      {isSupabaseConfigured ? null : (
        <AppText variant="caption" color="danger" style={styles.center}>
          {t('login.notConfigured')}
        </AppText>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText color="textMuted">{t('login.loading')}</AppText>
        </View>
      ) : (
        <Button
          label={status === 'offline' || status === 'error' ? t('login.retry') : t('login.google')}
          icon={status === 'offline' || status === 'error' ? 'refresh' : 'logo-google'}
          disabled={!isSupabaseConfigured}
          onPress={onSignIn}
        />
      )}

      <Card tone="muted" style={styles.row}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.success} />
        <AppText variant="caption" style={styles.flex}>
          {t('login.privacy')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl, marginBottom: spacing.lg },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 48 },
});
