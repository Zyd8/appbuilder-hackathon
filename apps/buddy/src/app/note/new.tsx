import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { cleanNoteBody, NOTE_MAX } from '@/domain/notes';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * Write a new note with the keyboard already up. The home-screen widgets open this sheet from their
 * "Add a note" button (`buddylevelup:///note/new`), because a widget cannot host a text field.
 */
export default function NewNoteRoute() {
  const signedIn = usePreviewStore((s) => Boolean(s.account));

  // A link from a widget can start the app cold. Notes belong to an account, so sign in first.
  if (!signedIn) return <Redirect href="/" />;
  return <NewNote />;
}

function NewNote() {
  const { colors } = useTheme();
  const addNote = usePreviewStore((s) => s.addNote);
  const [body, setBody] = useState('');
  const canSave = Boolean(cleanNoteBody(body));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const save = () => {
    addNote(body);
    close();
  };

  return (
    <Sheet
      title={t('note.new.title')}
      eyebrow={t('note.sheet.eyebrow')}
      footer={<Button label={t('note.new.save')} icon="checkmark" onPress={save} disabled={!canSave} />}>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={t('note.sheet.placeholder')}
        placeholderTextColor={colors.textMuted}
        maxLength={NOTE_MAX}
        multiline
        autoFocus
        accessibilityLabel={t('note.sheet.placeholder')}
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 96,
    maxHeight: 200,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
