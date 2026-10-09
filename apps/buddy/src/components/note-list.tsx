import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { LIFE_AREA_ICONS } from '@/data/life-areas';
import { shortDateLabel } from '@/domain/dates';
import { NOTE_MAX, sortNotes } from '@/domain/notes';
import { moveItem } from '@/domain/reorder';
import type { Note } from '@/domain/types';
import type { VoiceNotice } from '@/domain/voice-input';
import { t } from '@/i18n';
import { useVoiceInput } from '@/lib/use-voice-input';
import { usePreviewStore } from '@/state/preview-store';
import { areaColors, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { Calendar } from './calendar';
import { MicButton } from './mic-button';

/** Width of the Edit / Delete panel revealed by swiping a note row; releasing past half of it triggers the action. */
const SWIPE_ACTION_WIDTH = 88;
/** Hold this long before a row lifts for dragging (same as `DraggableList`). */
const LONG_PRESS_MS = 280;

/** The row being dragged: its index when lifted (`from`) and where it would land (`to`). */
type DragState = { id: string | null; from: number; to: number };
const IDLE: DragState = { id: null, from: -1, to: -1 };

/** Rows have different heights, so a slot's top is the sum of the rows above it. */
function rowTops(order: readonly string[], heights: Record<string, number>): number[] {
  'worklet';
  const tops: number[] = [];
  let y = 0;
  for (const id of order) {
    tops.push(y);
    y += heights[id] ?? 0;
  }
  tops.push(y);
  return tops;
}

/** Where a lifted row would land: one slot past every other row whose middle it has crossed. */
function landingIndex(order: readonly string[], heights: Record<string, number>, from: number, dy: number): number {
  'worklet';
  const tops = rowTops(order, heights);
  const center = tops[from] + (heights[order[from]] ?? 0) / 2 + dy;
  let to = 0;
  for (let i = 0; i < order.length; i++) {
    if (i !== from && center > tops[i] + (heights[order[i]] ?? 0) / 2) to += 1;
  }
  return to;
}

/** How far the lifted row travels to sit in slot `to`. */
function landingOffset(order: readonly string[], heights: Record<string, number>, from: number, to: number): number {
  'worklet';
  const tops = rowTops(order, heights);
  const height = heights[order[from]] ?? 0;
  return to > from ? tops[to + 1] - tops[from] - height : tops[to] - tops[from];
}

type NoteListProps = {
  notes: Note[];
  /** Today's local ISO date; a note scheduled for this day doesn't repeat it on the row (unless `showAllDates`). */
  today: string;
  /** Show the date on every dated note, "Today" included (Notes list, where notes from many days mix). */
  showAllDates?: boolean;
  emptyText: string;
  addPlaceholder: string;
  onAdd: (body: string, date?: string) => void;
  /** Long-form capture (Notes tab): Return adds a line break, the send button saves. */
  multiline?: boolean;
  /** Show a calendar button in the add row to schedule the new note. */
  datePicker?: boolean;
  /** Show a mic for on-device dictation (ADR-009). */
  voice?: boolean;
};

/** Checkable notes in one card: an add row on top, open notes next, finished notes sink to the bottom. */
export function NoteList({
  notes,
  today,
  showAllDates = false,
  emptyText,
  addPlaceholder,
  onAdd,
  multiline = false,
  datePicker = false,
  voice = false,
}: NoteListProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState('');
  const [draftDate, setDraftDate] = useState<string>();
  const [picking, setPicking] = useState(false);
  const mic = useVoiceInput({ enabled: voice, draft, setDraft });
  const recording = mic.state.status !== 'idle';
  const sorted = sortNotes(notes);
  const moveNote = usePreviewStore((s) => s.moveNote);

  // Drag to reorder (ADR-011). Gesture state lives on the UI thread; the order is saved on drop.
  const ids = sorted.map((note) => note.id);
  const idsKey = ids.join('|');
  const order = useSharedValue(ids);
  const heights = useSharedValue<Record<string, number>>({});
  const drag = useSharedValue<DragState>(IDLE);
  const dragY = useSharedValue(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  // The order a drop produced. While it is on screen, rows were already slid into place by the drag,
  // so the layout transition is skipped instead of animating them from their old slots again.
  const [droppedKey, setDroppedKey] = useState<string>();
  const layout = reduceMotion || droppedKey === idsKey ? undefined : LinearTransition.duration(250);

  useLayoutEffect(() => {
    order.set(idsKey ? idsKey.split('|') : []);
  }, [idsKey, order]);

  // The drop (and its new order) is on screen: clear the drag offsets in the same frame.
  useLayoutEffect(() => {
    if (activeId !== null) return;
    drag.set(IDLE);
    dragY.set(0);
  }, [activeId, idsKey, drag, dragY]);

  const drop = (id: string, from: number, to: number) => {
    setActiveId(null);
    if (from === to) return;
    const next = moveItem(ids, from, to);
    setDroppedKey(next.join('|'));
    moveNote(id, next);
  };

  /** Screen-reader "Move up" / "Move down". */
  const nudge = (id: string, delta: number) => {
    const index = ids.indexOf(id);
    const next = moveItem(ids, index, index + delta);
    if (next.join('|') !== idsKey) moveNote(id, next);
  };

  const add = () => {
    onAdd(draft, draftDate);
    setDraft('');
    setDraftDate(undefined);
    setPicking(false);
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
        {datePicker ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notes.pickDate')}
            accessibilityState={{ expanded: picking }}
            onPress={() => setPicking((open) => !open)}
            hitSlop={8}
            style={[styles.iconButton, { backgroundColor: picking || draftDate ? colors.surfaceAlt : 'transparent' }]}>
            <Ionicons name={draftDate ? 'calendar' : 'calendar-outline'} size={18} color={colors.primary} />
          </Pressable>
        ) : null}
        {draft.trim() && !recording ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notes.add')}
            onPress={add}
            hitSlop={8}
            style={[styles.iconButton, { backgroundColor: colors.primary }]}>
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

      {draftDate ? (
        <View style={styles.chipRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('notes.scheduled', { date: shortDateLabel(draftDate) })}. ${t('notes.clearDate')}`}
            onPress={() => setDraftDate(undefined)}
            hitSlop={8}
            style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}>
            <Ionicons name="calendar" size={13} color={colors.primary} />
            <AppText variant="caption" color="primary">
              {shortDateLabel(draftDate)}
            </AppText>
            <Ionicons name="close" size={13} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      {picking ? (
        <Animated.View entering={FadeIn.duration(reduceMotion ? 150 : 250)} style={styles.picker}>
          <Calendar
            framed={false}
            today={today}
            selected={draftDate}
            onSelect={(iso) => {
              setDraftDate(iso);
              setPicking(false);
            }}
          />
        </Animated.View>
      ) : null}

      {notes.length === 0 ? (
        <AppText color="textMuted" style={[styles.empty, styles.divider, { borderColor: colors.border }]}>
          {emptyText}
        </AppText>
      ) : null}

      {sorted.map((note, index) => (
        <DraggableSlot
          key={note.id}
          id={note.id}
          layout={layout}
          order={order}
          heights={heights}
          drag={drag}
          dragY={dragY}
          lifted={activeId === note.id}
          onLift={setActiveId}
          onDrop={drop}>
          {(handle) => (
            <>
              {/* The divider stays put while the row slides over its swipe actions. */}
              <View style={[styles.divider, styles.inset, { borderColor: colors.border }]} />
              <NoteRow
                note={note}
                today={today}
                showAllDates={showAllDates}
                handle={handle}
                lifted={activeId === note.id}
                onMoveUp={index > 0 ? () => nudge(note.id, -1) : undefined}
                onMoveDown={index < sorted.length - 1 ? () => nudge(note.id, 1) : undefined}
              />
            </>
          )}
        </DraggableSlot>
      ))}
    </View>
  );
}

type DraggableSlotProps = {
  id: string;
  layout: LinearTransition | undefined;
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  drag: SharedValue<DragState>;
  dragY: SharedValue<number>;
  lifted: boolean;
  onLift: (id: string) => void;
  onDrop: (id: string, from: number, to: number) => void;
  /** Gets the gesture for the row's drag handle, which drags right away instead of after a hold. */
  children: (handle: PanGesture) => ReactNode;
};

/** Rows making room: a critically damped spring, so they glide and settle without bouncing. */
const SHIFT_SPRING = { damping: 30, stiffness: 320, mass: 0.8, overshootClamping: true };
/** Lifting and setting a row down. */
const LIFT_TIMING = { duration: 160, easing: Easing.out(Easing.cubic) };
const DROP_TIMING = { duration: 200, easing: Easing.out(Easing.cubic) };

/**
 * One note in the list that can be dragged up or down: by its handle at once, or anywhere on the
 * row after a hold. Rows can be different heights, so each one reports its height and the others
 * slide by the lifted row's height to make room.
 */
function DraggableSlot({ id, layout, order, heights, drag, dragY, lifted, onLift, onDrop, children }: DraggableSlotProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  /** 0 resting, 1 lifted; drives the scale so it eases instead of snapping. */
  const lift = useSharedValue(0);
  /** Which of this row's two gestures owns the drag, so the other one ending can't drop it. */
  const owner = useSharedValue<'handle' | 'row' | null>(null);

  const dragGesture = (kind: 'handle' | 'row') =>
    Gesture.Pan()
      .onStart(() => {
        // One drag at a time, and never while a drop is still settling.
        if (drag.get().id !== null) return;
        const from = order.get().indexOf(id);
        if (from < 0) return;
        owner.set(kind);
        dragY.set(0);
        drag.set({ id, from, to: from });
        lift.set(reduceMotion ? 1 : withTiming(1, LIFT_TIMING));
        scheduleOnRN(onLift, id);
      })
      .onUpdate((e) => {
        const current = drag.get();
        if (current.id !== id || owner.get() !== kind) return;
        const ids = order.get();
        const sizes = heights.get();
        const tops = rowTops(ids, sizes);
        // Stay inside the list: the card clips anything that leaves it.
        const min = -tops[current.from];
        const max = tops[ids.length] - tops[current.from + 1];
        const dy = Math.min(Math.max(e.translationY, min), max);
        dragY.set(dy);
        const to = landingIndex(ids, sizes, current.from, dy);
        if (to !== current.to) drag.set({ ...current, to });
      })
      .onFinalize(() => {
        const current = drag.get();
        if (current.id !== id || owner.get() !== kind) return;
        owner.set(null);
        // Glide into the landing slot, then save; the list clears the offsets once the new order renders.
        const offset = landingOffset(order.get(), heights.get(), current.from, current.to);
        const done = () => {
          'worklet';
          scheduleOnRN(onDrop, id, current.from, current.to);
        };
        lift.set(reduceMotion ? 0 : withTiming(0, DROP_TIMING));
        if (reduceMotion) {
          dragY.set(offset);
          done();
        } else {
          dragY.set(withTiming(offset, DROP_TIMING, done));
        }
      });

  const handle = dragGesture('handle').activeOffsetY([-4, 4]);
  const row = dragGesture('row').activateAfterLongPress(LONG_PRESS_MS);

  const style = useAnimatedStyle(() => {
    const current = drag.get();
    const scale = 1 + lift.get() * 0.02;
    if (current.id === id) return { zIndex: 10, transform: [{ translateY: dragY.get() }, { scale }] };
    if (current.id === null) return { zIndex: 0, transform: [{ translateY: 0 }, { scale }] };
    // Make room: rows between the lifted row's old and new slot move by its height.
    const index = order.get().indexOf(id);
    const height = heights.get()[current.id] ?? 0;
    const shift = current.from < index && index <= current.to ? -height : current.to <= index && index < current.from ? height : 0;
    return { zIndex: 0, transform: [{ translateY: reduceMotion ? shift : withSpring(shift, SHIFT_SPRING) }, { scale }] };
  });

  return (
    <GestureDetector gesture={row}>
      <Animated.View
        layout={layout}
        entering={reduceMotion ? undefined : FadeIn.duration(250)}
        onLayout={(e) => {
          const height = e.nativeEvent.layout.height;
          if (heights.get()[id] !== height) heights.set({ ...heights.get(), [id]: height });
        }}
        style={[styles.bleed, style]}>
        {children(handle)}
        {lifted ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.lifted, { borderColor: colors.primary }]} />
        ) : null}
      </Animated.View>
    </GestureDetector>
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

type NoteRowProps = {
  note: Note;
  today: string;
  showAllDates: boolean;
  /** Drag gesture for the grip on the left. */
  handle: PanGesture;
  lifted: boolean;
  /** Screen-reader stand-ins for dragging; unset at the ends of the list. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

function NoteRow({ note, today, showAllDates, handle, lifted, onMoveUp, onMoveDown }: NoteRowProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const toggleNote = usePreviewStore((s) => s.toggleNote);
  const deleteNote = usePreviewStore((s) => s.deleteNote);
  const swipeable = useRef<SwipeableMethods>(null);
  const pop = useSharedValue(1);
  const wasDone = useRef(note.done);

  const edit = () => {
    swipeable.current?.close();
    router.push({ pathname: '/note/[id]', params: { id: note.id } });
  };

  // Deleting also removes the cloud backup, so a swipe still asks first (same prompt as the edit sheet).
  const confirmDelete = () =>
    Alert.alert(t('note.delete.title'), t('note.delete.body'), [
      { text: t('note.delete.cancel'), style: 'cancel', onPress: () => swipeable.current?.close() },
      { text: t('note.delete.confirm'), style: 'destructive', onPress: () => deleteNote(note.id) },
    ], { cancelable: true, onDismiss: () => swipeable.current?.close() });

  // Swipe right to edit, swipe left to delete.
  const onSwipeOpen = (direction: SwipeDirection) => (direction === SwipeDirection.RIGHT ? edit() : confirmDelete());

  // Small pop when a note gets checked off.
  useEffect(() => {
    if (note.done && !wasDone.current && !reduceMotion) {
      pop.set(withSequence(withTiming(1.25, { duration: 120 }), withTiming(1, { duration: 160 })));
    }
    wasDone.current = note.done;
  }, [note.done, reduceMotion, pop]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const high = note.priority === 'high' && !note.done;
  const dateLabel = !note.date
    ? undefined
    : note.date !== today
      ? shortDateLabel(note.date)
      : showAllDates
        ? t('calendar.today')
        : undefined;

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={1.5}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={SWIPE_ACTION_WIDTH / 2}
      rightThreshold={SWIPE_ACTION_WIDTH / 2}
      onSwipeableOpen={onSwipeOpen}
      renderLeftActions={() => (
        <SwipeAction icon="create-outline" label={t('notes.swipe.edit')} color={colors.primary} onPress={edit} />
      )}
      renderRightActions={() => (
        <SwipeAction icon="trash-outline" label={t('notes.swipe.delete')} color={colors.danger} onPress={confirmDelete} />
      )}
      childrenContainerStyle={[styles.row, styles.inset, { backgroundColor: colors.surface }]}>
      {/* Grip: shows the row can be rearranged and drags without the hold. Screen readers use Move up / down. */}
      <GestureDetector gesture={handle}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.handle}>
          <Ionicons name="reorder-two" size={18} color={lifted ? colors.primary : colors.textMuted} />
        </View>
      </GestureDetector>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: note.done }}
        accessibilityLabel={note.body}
        onPress={() => toggleNote(note.id)}
        hitSlop={9}
        style={({ pressed }) => pressed && styles.pressed}>
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
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          t('notes.edit'),
          note.body,
          high ? t('notes.priorityHigh') : undefined,
          dateLabel ? t('notes.scheduled', { date: dateLabel }) : undefined,
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint={t('notes.editHint')}
        // Swipes and drags have no screen-reader equivalent, so they are offered as actions too.
        accessibilityActions={[
          { name: 'delete', label: t('notes.swipe.delete') },
          ...(onMoveUp ? [{ name: 'moveUp', label: t('quests.moveUp') }] : []),
          ...(onMoveDown ? [{ name: 'moveDown', label: t('quests.moveDown') }] : []),
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') confirmDelete();
          if (event.nativeEvent.actionName === 'moveUp') onMoveUp?.();
          if (event.nativeEvent.actionName === 'moveDown') onMoveDown?.();
        }}
        onPress={edit}
        style={({ pressed }) => [styles.bodyPress, pressed && styles.pressed]}>
        <View style={styles.body}>
          <AppText numberOfLines={3} color={note.done ? 'textMuted' : 'text'} style={note.done && styles.done}>
            {note.body}
          </AppText>
          {dateLabel ? (
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <AppText variant="caption" color="textMuted">
                {dateLabel}
              </AppText>
            </View>
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
    </ReanimatedSwipeable>
  );
}

/** The colored panel a note row slides off to reveal; tapping it does the same as finishing the swipe. */
function SwipeAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.swipeAction, { backgroundColor: color }]}>
      <Ionicons name={icon} size={20} color={colors.onPrimary} />
      <AppText variant="caption" color="onPrimary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // `overflow: hidden` clips the swipe panels to the card's rounded corners.
  card: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.lg, overflow: 'hidden' },
  empty: { paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  // Note rows reach the card edges so the swipe panels fill the width; their content is inset back.
  bleed: { marginHorizontal: -spacing.lg },
  inset: { marginHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  lifted: { borderWidth: 1.5, borderRadius: radius.md },
  // Full row height and a wide strip, so the grip is easy to catch; the negative margin keeps the row gap tight.
  handle: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: spacing.sm, marginLeft: -spacing.sm, marginRight: -spacing.xs },
  swipeAction: { width: SWIPE_ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bodyPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, minHeight: 52 },
  pressed: { opacity: 0.8 },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
  iconButton: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', paddingBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  picker: { paddingBottom: spacing.md },
  voiceStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm, flexWrap: 'wrap' },
  voiceText: { flexShrink: 1 },
});
