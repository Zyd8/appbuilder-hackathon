import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { GradientPanel } from '@/components/gradient-panel';
import { InsightList } from '@/components/insight-list';
import { PulseRings } from '@/components/pulse-rings';
import { Screen } from '@/components/screen';
import { StatRadar } from '@/components/stat-radar';
import { t, type StringKey } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const STEPS: StringKey[] = ['analysis.step.read', 'analysis.step.stats', 'analysis.step.quests'];
const STEP_MS = 650;

/** Phase 1 shows the synthetic preview profile. Phase 2 computes it from the answers (deterministic scoring). */
export default function Analysis() {
  const profile = usePreviewStore((s) => s.profile);
  const finishOnboarding = usePreviewStore((s) => s.finishOnboarding);
  const [done, setDone] = useState(0);

  // Tick through the checklist, then one extra beat so the last check is visible.
  useEffect(() => {
    if (done > STEPS.length) return;
    const timer = setTimeout(() => setDone((d) => d + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [done]);

  if (done <= STEPS.length) return <Analyzing done={done} />;

  return (
    <Screen edges={['top', 'bottom']}>
      <Animated.View entering={FadeInDown.duration(450)}>
        <GradientPanel style={styles.hero}>
          <View style={styles.flex}>
            <AppText variant="overline" color="onPrimary" style={styles.soft}>
              {t('analysis.title').toUpperCase()}
            </AppText>
            <AppText variant="hero" color="onPrimary" accessibilityRole="header">
              {profile.title}
            </AppText>
            <AppText variant="caption" color="onPrimary" style={styles.soft}>
              {t('analysis.disclaimer')}
            </AppText>
          </View>
          <View style={styles.halo}>
            <BuddyMascot mood="celebrating" size={64} />
          </View>
        </GradientPanel>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(450)}>
        <Card style={styles.center}>
          <AppText variant="overline" color="primary" style={styles.selfStart}>
            {t('analysis.stats').toUpperCase()}
          </AppText>
          <StatRadar stats={profile.stats} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(450)}>
        <InsightList insights={profile.insights} />
      </Animated.View>

      <Button
        label={t('analysis.continue')}
        icon="arrow-forward"
        onPress={() => {
          finishOnboarding();
          router.replace('/today');
        }}
      />
    </Screen>
  );
}

function Analyzing({ done }: { done: number }) {
  const { colors } = useTheme();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.loading}>
        <PulseRings size={150}>
          <View style={[styles.loadingHalo, { backgroundColor: colors.surfaceAlt }]}>
            <BuddyMascot mood="thinking" size={96} />
          </View>
        </PulseRings>
        <AppText variant="title" style={styles.centerText} accessibilityLiveRegion="polite">
          {t('analysis.loading')}
        </AppText>
        <View style={styles.steps}>
          {STEPS.map((key, i) => {
            const state = i < done ? 'done' : i === done ? 'active' : 'pending';
            return (
              <Animated.View key={key} entering={FadeIn} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    { backgroundColor: state === 'done' ? colors.primary : colors.surfaceAlt },
                  ]}>
                  {state === 'done' ? (
                    <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                  ) : state === 'active' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : null}
                </View>
                <AppText color={state === 'pending' ? 'textMuted' : 'text'} variant="bodyStrong">
                  {t(key)}
                </AppText>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  soft: { opacity: 0.88 },
  halo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center' },
  selfStart: { alignSelf: 'flex-start' },
  loading: { alignItems: 'center', gap: spacing.xl, marginTop: 96 },
  loadingHalo: { width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  steps: { gap: spacing.md, alignSelf: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: { width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
