import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { MEMORY_DOCUMENT_MAX_BYTES, memoryBytes } from './memory-policy';
import type { MemoryDocument, MemoryDocumentName } from './memory-types';

export interface MemoryManagementLabels {
  title: string;
  localOnly: string;
  userDocument: string;
  botDocument: string;
  usage: (used: number, max: number) => string;
  editHint: string;
  save: string;
  reset: string;
  delete: string;
  confirmReset: string;
  confirmDelete: string;
  cancel: string;
  error: string;
}

export interface MemoryManagementProps {
  documents: readonly MemoryDocument[];
  labels: MemoryManagementLabels;
  onSave(name: MemoryDocumentName, text: string, expectedRevision: string): Promise<void>;
  onReset(name: MemoryDocumentName, expectedRevision: string): Promise<void>;
  onDelete(name: MemoryDocumentName, expectedRevision: string): Promise<void>;
}

/** Controlled, direct-user memory editor. Callbacks never expose model-initiated writes. */
export function MemoryManagement({ documents, labels, onSave, onReset, onDelete }: MemoryManagementProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<MemoryDocumentName>('USER.md');
  const current = documents.find((item) => item.name === selected);
  const [editedText, setEditedText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<'reset' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const draft = dirty ? editedText : current?.text ?? '';

  function select(name: MemoryDocumentName) {
    setSelected(name);
    setDirty(false);
    setPending(null);
    setError(false);
  }

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError(false);
    try { await action(); setPending(null); setDirty(false); } catch { setError(true); } finally { setBusy(false); }
  }

  const count = memoryBytes(draft);
  return (
    <Card accessibilityLabel={labels.title}>
      <AppText variant="title" accessibilityRole="header">{labels.title}</AppText>
      <AppText variant="caption" color="textMuted">{labels.localOnly}</AppText>
      <View style={styles.row}>
        <Button label={labels.userDocument} variant={selected === 'USER.md' ? 'primary' : 'secondary'}
          onPress={() => select('USER.md')} disabled={busy} />
        <Button label={labels.botDocument} variant={selected === 'BOT.md' ? 'primary' : 'secondary'}
          onPress={() => select('BOT.md')} disabled={busy} />
      </View>
      <TextInput
        multiline value={draft} onChangeText={(text) => { setEditedText(text); setDirty(true); }} editable={!busy}
        accessibilityLabel={labels.editHint} accessibilityHint={labels.localOnly}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        textAlignVertical="top"
      />
      <AppText variant="caption" color={count > MEMORY_DOCUMENT_MAX_BYTES ? 'danger' : 'textMuted'}>
        {labels.usage(count, MEMORY_DOCUMENT_MAX_BYTES)}
      </AppText>
      {error ? <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">{labels.error}</AppText> : null}
      {pending ? (
        <View style={styles.row}>
          <Button label={pending === 'reset' ? labels.confirmReset : labels.confirmDelete}
            variant="secondary" disabled={busy || !current}
            onPress={() => current && void perform(() => pending === 'reset'
              ? onReset(selected, current.revision) : onDelete(selected, current.revision))} />
          <Button label={labels.cancel} variant="ghost" onPress={() => setPending(null)} disabled={busy} />
        </View>
      ) : (
        <View style={styles.row}>
          <Button label={labels.save} disabled={busy || !current || count > MEMORY_DOCUMENT_MAX_BYTES || draft === current.text}
            onPress={() => current && void perform(() => onSave(selected, draft, current.revision))} />
          <Button label={labels.reset} variant="secondary" disabled={busy || !current} onPress={() => setPending('reset')} />
          <Button label={labels.delete} variant="ghost" disabled={busy || !current} onPress={() => setPending('delete')} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, minHeight: 180 },
});
