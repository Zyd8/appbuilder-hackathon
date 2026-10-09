import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Chip } from '@/components/chip';
import { OnDeviceBadge } from '@/components/on-device-badge';
import { Screen } from '@/components/screen';
import type { ChatMessage } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SUGGESTIONS = ['buddy.suggestion.focus', 'buddy.suggestion.stuck', 'buddy.suggestion.plan'] as const;

export default function AskBuddy() {
  const { colors } = useTheme();
  const chat = usePreviewStore((s) => s.chat);
  const typing = usePreviewStore((s) => s.buddyTyping);
  const sendChat = usePreviewStore((s) => s.sendChat);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = (text: string) => {
    sendChat(text);
    setDraft('');
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <BuddyMascot mood={typing ? 'thinking' : 'happy'} size={40} />
          <View style={styles.flex}>
            <AppText variant="title">{t('buddy.title')}</AppText>
            <OnDeviceBadge />
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={chat}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BuddyMascot mood="happy" size={96} />
              <AppText color="textMuted" style={styles.center}>
                {t('buddy.empty')}
              </AppText>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((key) => (
                  <Chip key={key} label={t(key)} onPress={() => send(t(key))} />
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => <Bubble message={item} />}
          ListFooterComponent={
            typing ? (
              <AppText variant="caption" color="textMuted" style={styles.typing} accessibilityLiveRegion="polite">
                {t('buddy.thinking')}
              </AppText>
            ) : null
          }
        />

        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('buddy.placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            accessibilityLabel={t('buddy.placeholder')}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('buddy.send')}
            disabled={!draft.trim() || typing}
            onPress={() => send(draft)}
            style={[styles.send, { backgroundColor: colors.primary, opacity: !draft.trim() || typing ? 0.4 : 1 }]}>
            <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const { colors } = useTheme();
  const mine = message.role === 'user';
  return (
    <View style={[styles.bubbleWrap, mine ? styles.right : styles.left]}>
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
        ]}>
        <AppText style={{ color: mine ? colors.onPrimary : colors.text }}>{message.text}</AppText>
      </View>
      {message.contextUsed?.length ? (
        <AppText variant="caption" color="textMuted">
          {t('buddy.contextUsed', { items: message.contextUsed.join(', ') })}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  empty: { alignItems: 'center', gap: spacing.lg, marginTop: spacing.xxl },
  center: { textAlign: 'center' },
  suggestions: { gap: spacing.sm, alignSelf: 'stretch' },
  typing: { marginTop: spacing.sm },
  bubbleWrap: { maxWidth: '85%', gap: spacing.xs },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 44,
  },
  send: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
