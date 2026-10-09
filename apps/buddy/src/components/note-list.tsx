import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LIFE_AREA_ICONS } from '@/data/life-areas';
import { NOTE_MAX, sortNotes } from '@/domain/notes';
import type { Note } from '@/domain/types';
import type { VoiceNotice } from '@/domain/voice-input';
import { t } from '@/i18n';
import { useVoiceInput } from '@/lib/use-voice-input';
import { usePreviewStore } from '@/state/preview-store';
import { areaColors, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { MicButton } from './mic-button';

type NoteListProps = {
  notes: Note[];
  /** ISO date; a due date equal to this is not repeated on the row. */
  today: string;
  emptyText: string;
  addPlaceholder: string;
  onAdd: (body: string) => void;
  /** Long-form capture (Notes tab): Return adds a line break, the send button saves. */
  multiline?: boolean;
  /** Show a mic for on-device dictation (ADR-008). */
  voice?: boolean;
};

/** Checkable notes in one card: an add row on top, open notes next, finished notes sink to the bottom. */
export function NoteList({ notes, today, emptyText, addPlaceholder, onAdd, multiline = false, voice = false }: NoteListProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState('');
  const mic = useVoiceInput({ enabled: voice, draft, setDraft });
  const recording = mic.state.status !== 'idle';
  const sorted = sortNotes(notes);
  const layout = reduceMotion ? undefined : LinearTransition.duration(250);

  const add = () => {
    onAdd(draft);
    setDraft('');
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.addRow}>
        <Ionicons name="add" size={22} color={colors.primary} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={multiline ? undefined : add}
          placeholder={addPlaceholder}
          placeholderTextColor={colors.textMuted}
          maxLength={NOTE_MAX}
          multiline={multiline}
          returnKeyType={multiline ? 'default' : 'done'}
          submitBehavior={multiline ? 'newline' : 'blurAndSubmit'}
          // Read-only while dictating so typing and speech never fight over the text.
          editable={!recording}
          accessibilityLabel={addPlaceholder}
          style={[styles.input, { color: colors.text }]}
        />
        {draft.trim() && !recording ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notes.add')}
            onPress={add}
            hitSlop={8}
            style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="arrow-up" size={16} color={colors.onPrimary} />
          </Pressable>
        ) : null}
        {/* Last in the row so it never shifts under a holding finger when the send button appears. */}
        {voice ? (
          <MicButton
            status={mic.state.status}
            mode={'mode' in mic.state ? mic.state.mode : undefined}
            available={mic.availability.ready}
            onTap={mic.onTap}
            onHoldStart={mic.onHoldStart}
            onHoldEnd={mic.onHoldEnd}
          />
        ) : null}
      </View>

      {voice ? <VoiceStatus mic={mic} /> : null}

      {notes.length === 0 ? (
        <AppText color="textMuted" style={[styles.empty, styles.divider, { borderColor: colors.border }]}>
          {emptyText}
        </AppText>
      ) : null}

      {sorted.map((note) => (
        <Animated.View
          key={note.id}
          layout={layout}
          entering={reduceMotion ? undefined : FadeIn.duration(250)}
          style={[styles.divider, { borderColor: colors.border }]}>
          <NoteRow note={note} today={today} />
        </Animated.View>
      ))}
    </View>
  );
}

/** One line under the add row: what the mic is doing, or why it stopped. */
function VoiceStatus({ mic }: { mic: ReturnType<typeof useVoiceInput> }) {
  const { colors } = useTheme();
  const { state } = mic;
  let text: string | undefined;
  let action: { label: string; onPress: () => void } | undefined;

  if (state.status === 'listening') {
    text = t(state.mode === 'tap' ? 'notes.voice.listeningTap' : 'notes.voice.listeningHold');
  } else if (state.status === 'requesting') {
    text = t('notes.voice.preparing');
  } else if (state.status === 'finalizing') {
    text = t('notes.voice.finishing');
  } else if (state.notice) {
    text = noticeText(state.notice);
    if (state.notice === 'not-allowed') action = { label: t('notes.voice.openSettings'), onPress: mic.openSettings };
    if (state.notice === 'language-not-supported') action = { label: t('notes.voice.downloadPack'), onPress: () => void mic.downloadLanguagePack() };
  }
  if (!text) return null;

  return (
    <View style={styles.voiceStatus} accessibilityLiveRegion="polite">
      <AppText variant="caption" color="textMuted" style={styles.voiceText}>
        {text}
      </AppText>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <AppText variant="caption" color="primary">
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
      {state.status === 'idle' ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('notes.voice.dismiss')} onPress={mic.dismiss} hitSlop={8}>
          <Ionicons name="close" size={14} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function noticeText(notice: VoiceNotice): string {
  return notice === 'truncated' ? t('notes.voice.notice.truncated', { max: NOTE_MAX.toLocaleString() }) : t(`notes.voice.notice.${notice}`);
}

function NoteRow({ note, today }: { note: Note; today: string }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const toggleNote = usePreviewStore((s) => s.toggleNote);
  const pop = useSharedValue(1);
  const wasDone = useRef(note.done);

  // Small pop when a note gets checked off.
  useEffect(() => {
    if (note.done && !wasDone.current && !reduceMotion) {
      pop.set(withSequence(withTiming(1.25, { duration: 120 }), withTiming(1, { duration: 160 })));
    }
    wasDone.current = note.done;
  }, [note.done, reduceMotion, pop]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const high = note.priority === 'high' && !note.done;
  const dueLabel =
    note.due && note.due !== today
      ? t('notes.due', { date: new Date(`${note.due}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
      : undefined;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: note.done }}
      accessibilityLabel={[note.body, high ? t('notes.priorityHigh') : undefined, dueLabel].filter(Boolean).join(', ')}
      onPress={() => toggleNote(note.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Animated.View
        style={[
          styles.check,
          note.done
            ? { backgroundColor: colors.success, borderColor: colors.success }
            : { borderColor: high ? colors.danger : colors.primary },
          checkStyle,
        ]}>
        {note.done ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
      </Animated.View>

      <View style={styles.body}>
        <AppText numberOfLines={3} color={note.done ? 'textMuted' : 'text'} style={note.done && styles.done}>
          {note.body}
        </AppText>
        {dueLabel ? (
          <AppText variant="caption" color="textMuted">
            {dueLabel}
          </AppText>
        ) : null}
      </View>

      {high ? (
        <View style={[styles.high, { borderColor: colors.danger }]}>
          <Ionicons name="flag" size={11} color={colors.danger} />
          <AppText variant="caption" color="danger">
            {t('notes.high')}
          </AppText>
        </View>
      ) : null}
      {note.area ? <Ionicons name={LIFE_AREA_ICONS[note.area]} size={16} color={areaColors[note.area]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg },
  empty: { paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingVertical: spacing.sm },
  pressed: { opacity: 0.8 },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  done: { textDecorationLine: 'line-through' },
  high: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.sm, maxHeight: 140 },
  voiceStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm, flexWrap: 'wrap' },
  voiceText: { flexShrink: 1 },
  addButton: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
