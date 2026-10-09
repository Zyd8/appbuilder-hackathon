import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { spacing } from '@/theme/tokens';
import { t } from '@/i18n';

export function BuddyResponse({ summary, answer }: { summary: readonly string[]; answer: string }) {
  return <View style={styles.root} accessibilityRole="summary">
    {summary.length ? <View style={styles.section}>
      <AppText variant="overline" color="textMuted">{t('buddy.response.checked').toUpperCase()}</AppText>
      {summary.map((line, index) => <AppText key={`${index}-${line}`} variant="caption" color="textMuted">{line}</AppText>)}
    </View> : null}
    <View style={styles.section}>
      <AppText variant="overline" color="primary">{t('buddy.response.answer').toUpperCase()}</AppText>
      <AppText>{answer}</AppText>
    </View>
  </View>;
}
const styles = StyleSheet.create({ root: { gap: spacing.md }, section: { gap: spacing.xs } });
