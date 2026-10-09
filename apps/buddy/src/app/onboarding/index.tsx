import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { OnDeviceBadge } from '@/components/on-device-badge';
import { Screen } from '@/components/screen';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function Welcome() {
  const { colors } = useTheme();
  const signedIn = usePreviewStore((s) => Boolean(s.account));
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <BuddyMascot mood="happy" size={140} />
        <AppText variant="overline" color="primary">
          {t('app.name').toUpperCase()}
        </AppText>
        <AppText variant="display" style={styles.center}>
          {t('onboarding.welcome.title')}
        </AppText>
        <AppText color="textMuted" style={styles.center}>
          {t('onboarding.welcome.body')}
        </AppText>
      </View>

      <Card tone="muted" style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.success} />
        <AppText variant="bodyStrong" style={styles.flex}>
          {t('onboarding.welcome.privacy')}
        </AppText>
      </Card>

      <Button
        label={t('onboarding.welcome.start')}
        icon="arrow-forward"
        onPress={() => router.push(signedIn ? '/onboarding/questions' : '/onboarding/login')}
      />
      <AppText variant="caption" color="textMuted" style={styles.center}>
        {t('onboarding.welcome.time')}
      </AppText>
      <View style={styles.badge}>
        <OnDeviceBadge />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl, marginBottom: spacing.lg },
  center: { textAlign: 'center' },
  privacy: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  badge: { alignItems: 'center' },
});
