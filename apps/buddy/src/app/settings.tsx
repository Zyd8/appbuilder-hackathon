import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { t } from '@/i18n';
import { signOut } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePreviewStore } from '@/state/preview-store';
import { useTheme } from '@/theme/use-theme';

export default function Settings() {
  const { colors } = useTheme();
  const allowPhysical = usePreviewStore((s) => s.allowPhysical);
  const setAllowPhysical = usePreviewStore((s) => s.setAllowPhysical);
  const reset = usePreviewStore((s) => s.reset);
  const account = usePreviewStore((s) => s.account);
  const clearAccount = usePreviewStore((s) => s.clearAccount);

  return (
    <Screen edges={['bottom']}>
      {account ? (
        <>
          <SectionHeader title={t('settings.account')} />
          <Card>
            <View style={styles.row}>
              <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">
                  {account.displayName ?? account.email ?? t('settings.account.signedIn')}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {account.email ? `${t('settings.account.signedIn')} · ${account.email}` : t('settings.account.signedIn')}
                </AppText>
                {account.syncedAt ? null : (
                  <AppText variant="caption" color="accent">
                    {t('settings.account.pending')}
                  </AppText>
                )}
              </View>
            </View>
            <Button
              label={t('settings.account.signOut')}
              variant="secondary"
              icon="log-out-outline"
              onPress={async () => {
                await signOut();
                clearAccount();
                router.dismissAll();
                router.replace('/onboarding');
              }}
            />
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('settings.quests')} />
      <Card style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{t('settings.physical')}</AppText>
          <AppText variant="caption" color="textMuted">
            {t('settings.physical.hint')}
          </AppText>
        </View>
        <Switch
          value={allowPhysical}
          onValueChange={setAllowPhysical}
          accessibilityLabel={t('settings.physical')}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </Card>

      <SectionHeader title={t('settings.ai')} />
      <InfoCard icon="hardware-chip-outline" title={t('settings.ai.lite')} body={t('settings.ai.hint')} phase={5} />

      <SectionHeader title={t('settings.cloud')} />
      <InfoCard
        icon={isSupabaseConfigured ? 'cloud-offline-outline' : 'phone-portrait-outline'}
        title={isSupabaseConfigured ? t('settings.cloud.configured') : t('settings.cloud.notConfigured')}
        phase={7}
      />

      <SectionHeader title={t('settings.privacy')} />
      <InfoCard icon="lock-closed-outline" title={t('settings.privacy.body')} />

      <Card tone="muted">
        <AppText variant="caption" color="textMuted">
          {t('settings.reset.hint')}
        </AppText>
        <Button
          label={t('settings.reset')}
          variant="secondary"
          icon="refresh"
          onPress={() => {
            reset();
            router.dismissAll();
            router.replace('/onboarding');
          }}
        />
      </Card>
    </Screen>
  );
}

function InfoCard({
  icon,
  title,
  body,
  phase,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  phase?: number;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        {body ? (
          <AppText variant="caption" color="textMuted">
            {body}
          </AppText>
        ) : null}
        {phase ? (
          <AppText variant="caption" color="accent">
            {t('phase.comingIn', { phase })}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
});
