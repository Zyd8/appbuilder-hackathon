import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { Insight } from '@/domain/types';
import { t } from '@/i18n';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { Card } from './card';
import { SectionHeader } from './section-header';

/** Strengths, growth areas, and 30-day focus, each with its plain-language reasoning. */
export function InsightList({ insights }: { insights: Insight[] }) {
  const groups: { type: Insight['type']; title: string; icon: 'star' | 'trending-up' | 'flag' }[] = [
    { type: 'strength', title: t('player.strengths'), icon: 'star' },
    { type: 'growth_area', title: t('player.growth'), icon: 'trending-up' },
    { type: 'focus', title: t('player.focus'), icon: 'flag' },
  ];

  return (
    <View style={styles.gap}>
      {groups.map((group) => {
        const items = insights.filter((i) => i.type === group.type);
        if (items.length === 0) return null;
        return (
          <View key={group.type} style={styles.gapSm}>
            <SectionHeader title={group.title} />
            {items.map((insight) => (
              <InsightRow key={insight.id} insight={insight} icon={group.icon} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function InsightRow({ insight, icon }: { insight: Insight; icon: 'star' | 'trending-up' | 'flag' }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{insight.text}</AppText>
        <AppText variant="caption" color="textMuted">
          {insight.reason}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
});
