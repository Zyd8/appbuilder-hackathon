import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import type { ConfirmationDescriptor } from '@/features/buddy/contracts/tool-protocol';
import { spacing } from '@/theme/tokens';
import { t } from '@/i18n';

export function BuddyToolConfirmation({ confirmation, busy, onDecide }: {
  confirmation: ConfirmationDescriptor;
  busy?: boolean;
  onDecide: (decision: 'confirm' | 'reject' | 'cancel') => void;
}) {
  const heading = useRef<View>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const node = typeof findNodeHandle === 'function' ? findNodeHandle(heading.current) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
    return () => clearTimeout(timer);
  }, [confirmation.callId]);
  return <View style={styles.root} accessibilityRole="alert">
    <View ref={heading} accessible accessibilityLabel={t('buddy.confirm.title', { title: confirmation.title })}>
      <AppText variant="title" accessibilityRole="header">{confirmation.title}</AppText>
    </View>
    <AppText>{confirmation.body}</AppText>
    {Object.entries(confirmation.metadata).map(([key, value]) =>
      <AppText key={key} variant="caption" color="textMuted">{key}: {value}</AppText>)}
    <AppText variant="caption" color="textMuted">{confirmation.reason}</AppText>
    <AppText variant="caption" color="textMuted">{confirmation.privacyImpact}</AppText>
    <AppText variant="caption" color="textMuted">{confirmation.storageImpact}</AppText>
    <View style={styles.actions}>
      <Button label={t('buddy.confirm.save')} onPress={() => onDecide('confirm')} disabled={busy} />
      <Button label={t('buddy.confirm.reject')} variant="secondary" onPress={() => onDecide('reject')} disabled={busy} />
      <Button label={t('buddy.confirm.cancel')} variant="ghost" onPress={() => onDecide('cancel')} disabled={busy} />
    </View>
  </View>;
}
const styles = StyleSheet.create({ root: { gap: spacing.sm, padding: spacing.lg }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
