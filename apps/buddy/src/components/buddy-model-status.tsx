import { AppText } from '@/components/app-text';
import { t, type StringKey } from '@/i18n';
import type { AIEngineReadiness } from '@/features/buddy/contracts/ai-engine';

const STATUS: Record<AIEngineReadiness | 'checking', StringKey> = {
  'not-installed': 'buddy.modelStatus.notInstalled', downloading: 'buddy.modelStatus.downloading',
  verifying: 'buddy.modelStatus.verifying', ready: 'buddy.modelStatus.ready',
  incompatible: 'buddy.modelStatus.incompatible', error: 'buddy.modelStatus.error',
  checking: 'buddy.modelStatus.checking',
};
export function BuddyModelStatus({ status }: { status: AIEngineReadiness | 'checking' }) {
  return <AppText variant="caption" color={status === 'error' || status === 'incompatible' ? 'danger' : 'textMuted'} accessibilityLiveRegion="polite">
    {t(STATUS[status])}
  </AppText>;
}
