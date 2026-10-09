import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';

import { useToast } from './toast';

/** Complete a quest and show the matching XP, level-up, or daily-cap toast. */
export function useCompleteQuest() {
  const completeQuest = usePreviewStore((s) => s.completeQuest);
  const showToast = useToast((s) => s.show);

  return (questId: string, reflection?: string) => {
    const result = completeQuest(questId, reflection);
    if (result.leveledUpTo) showToast(t('quests.levelUp', { level: result.leveledUpTo }));
    else if (result.granted > 0) showToast(t('quests.toast', { xp: result.granted }));
    else showToast(t('quests.toastCapped'));
  };
}
