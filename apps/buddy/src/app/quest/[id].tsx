import { router, useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/app-text';
import { QuestDetails } from '@/components/quest-details';
import { Sheet } from '@/components/sheet';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';

/** Quest details sheet, opened from a compact quest row. Follows the quest when it is swapped. */
export default function QuestRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const daily = usePreviewStore((s) => s.dailyQuests);
  const weekly = usePreviewStore((s) => s.weeklyQuest);
  const side = usePreviewStore((s) => s.sideQuests);
  const quest = [...daily, weekly, ...side].find((q) => q.id === id);

  if (!quest) {
    return (
      <Sheet title={t('quests.details')}>
        <AppText color="textMuted">{t('quests.notFound')}</AppText>
      </Sheet>
    );
  }

  return (
    <QuestDetails
      quest={quest}
      canSwap={daily.some((q) => q.id === quest.id)}
      onSwapped={(newId) => router.setParams({ id: newId })}
    />
  );
}
