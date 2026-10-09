import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Insight } from '@/domain/types';
import { t } from '@/i18n';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { Card } from './card';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Group = {
  type: 'strength' | 'growth_area';
  title: string;
  /** Icon beside the card label. */
  icon: IconName;
  /** Icon beside each item. */
  itemIcon: IconName;
};

/** Strengths and growth areas as quiet icon-led rows, each with Buddy's reason. */
export function InsightList({ insights }: { insights: Insight[] }) {
  const groups: Group[] = [
    { type: 'strength', title: t('player.strengths'), icon: 'star', itemIcon: 'checkmark-circle' },
    { type: 'growth_area', title: t('player.growth'), icon: 'trending-up', itemIcon: 'arrow-up-circle' },
  ];

  return (
    <View style={styles.list}>
      {groups.map((group) => {
        const items = insights.filter((i) => i.type === group.type);
        if (items.length === 0) return null;
        return <InsightGroup key={group.type} group={group} items={items} />;
      })}
    </View>
  );
}

function InsightGroup({ group, items }: { group: Group; items: Insight[] }) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.label}>
        <Ionicons name={group.icon} size={14} color={colors.primary} />
        <AppText variant="overline" color="primary" accessibilityRole="header">
          {group.title.toUpperCase()}
        </AppText>
      </View>

      {items.map((insight) => (
        <View key={insight.id} style={styles.item}>
          <Ionicons name={group.itemIcon} size={22} color={colors.primary} style={styles.itemIcon} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{insight.text}</AppText>
            <AppText variant="caption" color="textMuted">
              {insight.reason}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { gap: spacing.lg },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  // Nudge the icon down so it centers on the first line of the headline.
  itemIcon: { marginTop: 1 },
  flex: { flex: 1, gap: 2 },
});
