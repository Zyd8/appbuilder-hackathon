import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, findNodeHandle, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { BuddyResponse } from '@/components/buddy-response';
import { BuddyToolConfirmation } from '@/components/buddy-tool-confirmation';
import { BuddyModelStatus } from '@/components/buddy-model-status';
import { BuddyMemorySheet } from '@/components/buddy-memory-sheet';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import type { ChatMessage } from '@/domain/types';
import { BUDDY_MODEL_LIST } from '@/features/buddy/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SUGGESTIONS = ['buddy.suggestion.focus', 'buddy.suggestion.stuck', 'buddy.suggestion.plan'] as const;

export default function AskBuddy() {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const chat = usePreviewStore((s) => s.chat);
  const typing = usePreviewStore((s) => s.buddyTyping);
  const sendChat = usePreviewStore((s) => s.sendChat);
  const selectedModelId = usePreviewStore((s) => s.selectedModelId);
  const setModel = usePreviewStore((s) => s.setModel);
  const chatError = usePreviewStore((s) => s.chatError);
  const clearChatError = usePreviewStore((s) => s.clearChatError);
  const pendingConfirmation = usePreviewStore((s) => s.pendingConfirmation);
  const decideBuddyTool = usePreviewStore((s) => s.decideBuddyTool);
  const modelStatus = usePreviewStore((s) => s.modelStatus);
  const modelProgress = usePreviewStore((s) => s.modelProgress);
  const pollModelProgress = usePreviewStore((s) => s.pollModelProgress);
  const refreshModelStatus = usePreviewStore((s) => s.refreshModelStatus);
  const installBuddyModel = usePreviewStore((s) => s.installBuddyModel);
  const retryBuddyModel = usePreviewStore((s) => s.retryBuddyModel);
  const deleteBuddyModel = usePreviewStore((s) => s.deleteBuddyModel);
  const memoryDocuments = usePreviewStore((s) => s.memoryDocuments);
  const memoryError = usePreviewStore((s) => s.memoryError);
  const loadBuddyMemory = usePreviewStore((s) => s.loadBuddyMemory);
  const saveBuddyMemory = usePreviewStore((s) => s.saveBuddyMemory);
  const resetBuddyMemory = usePreviewStore((s) => s.resetBuddyMemory);
  const deleteBuddyMemory = usePreviewStore((s) => s.deleteBuddyMemory);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => { void refreshModelStatus(); }, [refreshModelStatus]);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const hadConfirmation = useRef(false);
  useEffect(() => {
    if (pendingConfirmation) { hadConfirmation.current = true; return; }
    if (!hadConfirmation.current) return;
    hadConfirmation.current = false;
    const timer = setTimeout(() => {
      const node = typeof findNodeHandle === 'function' ? findNodeHandle(inputRef.current) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
    return () => clearTimeout(timer);
  }, [pendingConfirmation]);
  const modelControlsBusy = typing || Boolean(pendingConfirmation);

  // While a download runs, poll so the bar moves. Stopping the interval on any other state keeps
  // this off the JS thread the rest of the time.
  useEffect(() => {
    if (modelStatus !== 'downloading') return;
    const timer = setInterval(() => { void pollModelProgress(); }, 400);
    return () => clearInterval(timer);
  }, [modelStatus, pollModelProgress]);

  const send = (text: string) => {
    sendChat(text);
    setDraft('');
  };
  // Refuse to send until the selected model is genuinely ready: otherwise the runtime answers
  // "model unavailable", which reads like a reply from Buddy rather than a blocked action.
  const modelReady = modelStatus === 'ready';
  const canSend = Boolean(draft.trim()) && !typing && !pendingConfirmation && modelReady;

  return (
    <Screen scroll={false}>
      {/* The composer is lifted by KeyboardStickyView instead of a KeyboardAvoidingView. The
          avoid view needs to add bottom padding to the whole column, and that fought the tab-bar
          clearance the Screen wrapper already applies: the composer ended up hidden while the
          keyboard was open and stuck mid-screen after it closed. Sticky view only translates the
          composer, so nothing else in the layout moves. It reads the IME insets natively, which
          is required here because the activity is edge-to-edge and React Native's own Keyboard
          events never fire. */}
      <View style={styles.flex}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <BuddyMascot mood={typing ? 'thinking' : 'happy'} size={40} />
          <View style={styles.flex}>
            <AppText variant="title">{t('buddy.title')}</AppText>
          </View>
        </View>

        <View style={styles.modelRow} accessibilityLabel={t('buddy.model')}>
          {BUDDY_MODEL_LIST.map((model) => (
            <Chip
              key={model.id}
              size="compact"
              label={model.label}
              selected={model.id === selectedModelId}
              disabled={model.retired}
              accessibilityLabel={`${model.label} (${model.sizeLabel}). ${model.note}`}
              onPress={modelControlsBusy || model.retired ? undefined : () => setModel(model.id)}
            />
          ))}
        </View>

        <View style={styles.statusRow}>
          <BuddyModelStatus status={modelStatus} />
          {modelStatus === 'not-installed' ? <Pressable style={styles.memoryButton} disabled={modelControlsBusy} accessibilityState={{ disabled: modelControlsBusy }} accessibilityRole="button" accessibilityLabel={t('buddy.model.install')}
            onPress={() => Alert.alert(t('buddy.model.install'), t('buddy.model.installConfirm', { size: BUDDY_MODEL_LIST.find((model) => model.id === selectedModelId)?.sizeLabel ?? '' }), [
              { text: t('buddy.confirm.cancel'), style: 'cancel' },
              { text: t('buddy.model.install'), onPress: () => void installBuddyModel(true) },
            ])}><AppText variant="caption" color="primary">{t('buddy.model.install')}</AppText></Pressable> : null}
          {modelStatus === 'error' || modelStatus === 'incompatible' ? <Pressable style={styles.memoryButton} disabled={modelControlsBusy} accessibilityState={{ disabled: modelControlsBusy }} accessibilityRole="button" accessibilityLabel={t('buddy.model.retry')}
            onPress={() => void retryBuddyModel()}><AppText variant="caption" color="primary">{t('buddy.model.retry')}</AppText></Pressable> : null}
          {modelStatus === 'ready' ? <Pressable style={styles.memoryButton} disabled={modelControlsBusy} accessibilityState={{ disabled: modelControlsBusy }} accessibilityRole="button" accessibilityLabel={t('buddy.model.remove')}
            onPress={() => Alert.alert(t('buddy.model.remove'), t('buddy.model.removeConfirm'), [
              { text: t('buddy.confirm.cancel'), style: 'cancel' },
              { text: t('buddy.model.remove'), style: 'destructive', onPress: () => void deleteBuddyModel(true) },
            ])}><AppText variant="caption" color="danger">{t('buddy.model.remove')}</AppText></Pressable> : null}
          <Pressable style={styles.memoryButton} accessibilityRole="button" accessibilityLabel={t('buddy.memory.open')} onPress={() => { setMemoryOpen((open) => !open); void loadBuddyMemory(); }}>
            <AppText variant="caption" color="primary">{t('buddy.memory.open')}</AppText>
          </Pressable>
        </View>

        {modelStatus === 'downloading' ? (
          <View
            style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}
            accessibilityRole="progressbar"
            accessibilityLabel={t('buddy.modelStatus.downloading')}
            accessibilityValue={{ min: 0, max: 100, now: Math.round((modelProgress ?? 0) * 100) }}>
            <View style={[styles.progressFill, { width: `${Math.round((modelProgress ?? 0) * 100)}%`, backgroundColor: colors.primary }]} />
          </View>
        ) : null}

        {memoryOpen ? <View style={styles.memoryPanel}>
          {memoryError ? <AppText color="danger">{memoryError}</AppText> : null}
          {memoryDocuments.length ? <BuddyMemorySheet documents={memoryDocuments} onSave={saveBuddyMemory} onReset={resetBuddyMemory} onDelete={deleteBuddyMemory} />
            : <AppText color="textMuted">{t('buddy.memory.loading')}</AppText>}
        </View> : null}

        <FlatList
          ref={listRef}
          data={chat}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: !reduceMotion })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BuddyMascot mood="happy" size={96} />
              <AppText color="textMuted" style={styles.center}>
                {t('buddy.empty')}
              </AppText>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((key) => (
                  <Chip key={key} label={t(key)} onPress={modelReady ? () => send(t(key)) : undefined} />
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

        {pendingConfirmation ? <BuddyToolConfirmation confirmation={pendingConfirmation} busy={typing} onDecide={(decision) => void decideBuddyTool(decision)} /> : null}

        {chatError ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${chatError}. ${t('buddy.modelUnavailable')}`}
            onPress={clearChatError}
            style={[styles.error, { borderColor: colors.danger, backgroundColor: colors.surface }]}>
            <AppText variant="caption" color="danger">
              {chatError}
            </AppText>
          </Pressable>
        ) : null}

        <KeyboardStickyView>
          <View style={[styles.composerWrap, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            ref={inputRef}
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
            disabled={!canSend}
            onPress={() => send(draft)}
            style={[styles.send, { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.4 }]}>
            <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
          </Pressable>
          </View>
          </View>
        </KeyboardStickyView>
      </View>
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
        {message.attachments?.length ? (
          <AppText
            variant="caption"
            style={[styles.bubbleAttachments, { color: mine ? colors.onPrimary : colors.textMuted }]}>
            {message.attachments.map((attachment) => attachment.name).join(' · ')}
          </AppText>
        ) : null}
        {mine ? <AppText style={{ color: colors.onPrimary }}>{message.text}</AppText>
          : <BuddyResponse summary={message.contextUsed ?? []} answer={message.text} />}
      </View>
      {message.generationState === 'failed' ? (
        <AppText variant="caption" color="danger">
          {t('buddy.modelUnavailable')}
        </AppText>
      ) : null}
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
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  memoryPanel: { maxHeight: 300, paddingHorizontal: spacing.lg },
  memoryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  modelRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  empty: { alignItems: 'center', gap: spacing.lg, marginTop: spacing.xxl },
  center: { textAlign: 'center' },
  suggestions: { gap: spacing.sm, alignSelf: 'stretch' },
  typing: { marginTop: spacing.sm },
  error: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  bubbleWrap: { maxWidth: '85%', gap: spacing.xs },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bubbleAttachments: { marginBottom: spacing.xs },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
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
