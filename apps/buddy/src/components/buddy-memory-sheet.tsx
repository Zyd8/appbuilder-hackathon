import { ScrollView } from 'react-native';
import { MemoryManagement, type MemoryManagementLabels } from '@/features/buddy/memory/memory-management';
import { t } from '@/i18n';
import type { MemoryDocument, MemoryDocumentName } from '@/features/buddy/memory/memory-types';

const labels: MemoryManagementLabels = {
  title: t('buddy.memory.title'), localOnly: t('buddy.memory.localOnly'),
  userDocument: 'USER.md', botDocument: 'BOT.md', usage: (used, max) => t('buddy.memory.usage', { used, max }),
  editHint: t('buddy.memory.edit'), save: t('buddy.memory.save'), reset: t('buddy.memory.reset'),
  delete: t('buddy.memory.delete'), confirmReset: t('buddy.memory.confirmReset'),
  confirmDelete: t('buddy.memory.confirmDelete'), cancel: t('buddy.confirm.cancel'), error: t('buddy.memory.error'),
};
export function BuddyMemorySheet({ documents, onSave, onReset, onDelete }: {
  documents: readonly MemoryDocument[];
  onSave(name: MemoryDocumentName, text: string, revision: string): Promise<void>;
  onReset(name: MemoryDocumentName, revision: string): Promise<void>;
  onDelete(name: MemoryDocumentName, revision: string): Promise<void>;
}) {
  return <ScrollView keyboardShouldPersistTaps="handled"><MemoryManagement documents={documents} labels={labels}
    onSave={onSave} onReset={onReset} onDelete={onDelete} /></ScrollView>;
}
