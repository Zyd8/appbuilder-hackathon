import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Sheet } from '@/components/sheet';
import { SectionHeader } from '@/components/section-header';
import type { Energy, Mood } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const MOODS: Mood[] = [1, 2, 3, 4, 5];
const ENERGIES: Energy[] = ['low', 'medium', 'high'];

/** Phase 1 saves the check-in in memory. Phase 4 uses energy to adapt quest difficulty. */
export default function CheckInScreen() {
  const { colors } = useTheme();
  const saveCheckIn = usePreviewStore((s) => s.saveCheckIn);
  const existing = usePreviewStore((s) => s.checkIn);
  const phase2Error = usePreviewStore((s) => s.phase2Error);
  const [saving, setSaving] = useState(false);
  const [mood, setMood] = useState<Mood>(existing?.mood ?? 3);
  const [energy, setEnergy] = useState<Energy>(existing?.energy ?? 'medium');
  const [focusText, setFocusText] = useState(existing?.focusText ?? '');

  return (
    <Sheet
      title={t('checkin.title')}
      footer={
        <>
          <Button
            label={t('checkin.save')}
            icon="checkmark"
            disabled={saving}
            onPress={() => {
              setSaving(true);
              void saveCheckIn({ mood, energy, focusText: focusText.trim() || undefined })
                .then(() => router.back()).catch(() => undefined).finally(() => setSaving(false));
            }}
          />
          {phase2Error ? <AppText color="danger" accessibilityLiveRegion="polite">{phase2Error}</AppText> : null}
          <AppText variant="caption" color="textMuted" style={styles.center}>
            {t('checkin.privacy')}
          </AppText>
        </>
      }>
      <SectionHeader title={t('checkin.mood')} />
      <View style={styles.wrapRow}>
        {MOODS.map((m) => (
          <Chip key={m} label={t(`mood.${m}`)} selected={mood === m} onPress={() => setMood(m)} />
        ))}
      </View>

      <SectionHeader title={t('checkin.energy')} />
      <View style={styles.row}>
        {ENERGIES.map((e) => (
          <View key={e} style={styles.flex}>
            <Chip label={t(`energy.${e}`)} selected={energy === e} onPress={() => setEnergy(e)} />
          </View>
        ))}
      </View>

      <SectionHeader title={t('checkin.focus')} />
      <TextInput
        value={focusText}
        onChangeText={setFocusText}
        placeholder={t('checkin.focus.placeholder')}
        placeholderTextColor={colors.textMuted}
        maxLength={140}
        accessibilityLabel={t('checkin.focus')}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
      />

    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    minHeight: 48,
  },
});
