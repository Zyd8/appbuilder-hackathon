import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AreaTag } from '@/components/area-tag';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Card } from '@/components/card';
import { QuestCard } from '@/components/quest-card';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { spacing } from '@/theme/tokens';

type QuestTab = 'daily' | 'weekly' | 'side' | 'history';

export default function Quests() {
  const [tab, setTab] = useState<QuestTab>('daily');
  const daily = usePreviewStore((s) => s.dailyQuests);
  const weekly = usePreviewStore((s) => s.weeklyQuest);
  const side = usePreviewStore((s) => s.sideQuests);
  const history = usePreviewStore((s) => s.history);

  return (
    <Screen>
      <AppText variant="display" accessibilityRole="header">
        {t('tabs.quests')}
      </AppText>
      <Segmented<QuestTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'daily', label: t('quests.daily') },
          { value: 'weekly', label: t('quests.weekly') },
          { value: 'side', label: t('quests.side') },
          { value: 'history', label: t('quests.history') },
        ]}
      />

      {tab === 'daily' && daily.map((q) => <QuestCard key={q.id} quest={q} canSwap />)}
      {tab === 'weekly' && <QuestCard quest={weekly} />}
      {tab === 'side' && side.map((q) => <QuestCard key={q.id} quest={q} />)}
      {tab === 'history' &&
        (history.length === 0 ? (
          <Card tone="muted" style={styles.empty}>
            <BuddyMascot mood="sleepy" size={64} />
            <AppText color="textMuted" style={styles.center}>
              {t('quests.history.empty')}
            </AppText>
          </Card>
        ) : (
          history.map((q) => (
            <Card key={q.id}>
              <View style={styles.historyRow}>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {q.title}
                </AppText>
                <AppText variant="caption" color="accent">
                  {t('quests.xp', { count: q.xp })}
                </AppText>
              </View>
              <AreaTag area={q.area} />
              {q.reflection ? (
                <AppText variant="caption" color="textMuted">
                  “{q.reflection}”
                </AppText>
              ) : null}
            </Card>
          ))
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center' },
  center: { textAlign: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
