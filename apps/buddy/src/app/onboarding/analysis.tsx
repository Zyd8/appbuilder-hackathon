import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { InsightList } from '@/components/insight-list';
import { Screen } from '@/components/screen';
import { StatRadar } from '@/components/stat-radar';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Phase 1 shows the synthetic preview profile. Phase 2 computes it from the answers (deterministic scoring). */
export default function Analysis() {
  const { colors } = useTheme();
  const profile = usePreviewStore((s) => s.profile);
  const finishOnboarding = usePreviewStore((s) => s.finishOnboarding);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={styles.loading}>
          <BuddyMascot mood="thinking" size={120} />
          <ActivityIndicator color={colors.primary} />
          <AppText variant="title">{t('analysis.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Animated.View entering={FadeInDown} style={styles.gap}>
        <View style={styles.header}>
          <BuddyMascot mood="celebrating" size={72} />
          <View style={styles.flex}>
            <AppText variant="overline" color="primary">
              {t('analysis.title').toUpperCase()}
            </AppText>
            <AppText variant="display">{profile.title}</AppText>
          </View>
        </View>
        <AppText variant="caption" color="textMuted">
          {t('analysis.disclaimer')}
        </AppText>
        <View style={styles.center}>
          <StatRadar stats={profile.stats} />
        </View>
        <InsightList insights={profile.insights} />
        <Button
          label={t('analysis.continue')}
          icon="arrow-forward"
          onPress={() => {
            finishOnboarding();
            router.replace('/today');
          }}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: spacing.lg, marginTop: 120 },
  gap: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  center: { alignItems: 'center' },
});
