import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { LIFE_AREA_ICONS } from '@/data/life-areas';
import { ONBOARDING_PAGES } from '@/data/onboarding-questions';
import type { LifeArea, OnboardingAnswer, OnboardingQuestion } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { areaColors, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SCALE = [1, 2, 3, 4, 5];
const TEXT_MAX = 200;

export default function OnboardingPages() {
  const { colors } = useTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const scrollRef = useRef<ScrollView>(null);
  const answers = usePreviewStore((s) => s.answers);
  const setAnswer = usePreviewStore((s) => s.setAnswer);

  const page = ONBOARDING_PAGES[pageIndex];
  const total = ONBOARDING_PAGES.length;
  const isLast = pageIndex === total - 1;

  const goTo = (index: number) => {
    setDirection(index > pageIndex ? 'forward' : 'back');
    setPageIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const next = () => (isLast ? router.replace('/onboarding/analysis') : goTo(pageIndex + 1));
  const back = () => (pageIndex === 0 ? router.back() : goTo(pageIndex - 1));

  const scaleQuestions = page.questions.filter((q) => q.kind === 'scale');
  const otherQuestions = page.questions.filter((q) => q.kind !== 'scale');
  const stepLabel = t('onboarding.step', { current: pageIndex + 1, total });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.back')}
            onPress={back}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={stepLabel}>
            {ONBOARDING_PAGES.map((p, i) => (
              <StepSegment key={p.id} filled={i <= pageIndex} />
            ))}
          </View>
          <Button label={t('onboarding.skip')} variant="ghost" size="sm" onPress={next} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Animated.View
            key={page.id}
            entering={(direction === 'forward' ? FadeInRight : FadeInLeft).duration(280)}
            style={styles.page}>
            <View style={styles.titleBlock}>
              <AppText variant="overline" color="primary">
                {stepLabel.toUpperCase()}
              </AppText>
              <AppText variant="hero" accessibilityRole="header">
                {page.title}
              </AppText>
              <AppText color="textMuted">{page.subtitle}</AppText>
            </View>

            <View style={styles.buddyRow}>
              <BuddyMascot mood={isLast ? 'celebrating' : 'happy'} size={44} />
              <View style={[styles.bubble, { backgroundColor: colors.surfaceAlt }]}>
                <AppText variant="caption" color="primary">
                  {page.buddyLine}
                </AppText>
              </View>
            </View>

            {otherQuestions.map((question) => (
              <QuestionBlock
                key={question.id}
                question={question}
                answer={answers[question.id]}
                onChange={(value) => setAnswer(question.id, value)}
              />
            ))}

            {scaleQuestions.length > 0 ? (
              <Card style={styles.ratingCard}>
                <View style={styles.legend}>
                  <AppText variant="caption" color="textMuted">
                    1 · {t('onboarding.scaleLow')}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    5 · {t('onboarding.scaleHigh')}
                  </AppText>
                </View>
                {scaleQuestions.map((question) => (
                  <RatingMeter
                    key={question.id}
                    question={question}
                    value={typeof answers[question.id] === 'number' ? (answers[question.id] as number) : undefined}
                    onChange={(value) => setAnswer(question.id, value)}
                  />
                ))}
              </Card>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Button
            label={isLast ? t('onboarding.finish') : t('onboarding.next')}
            icon={isLast ? 'sparkles' : 'arrow-forward'}
            onPress={next}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** One progress segment; its fill slides in when the page is reached. */
function StepSegment({ filled }: { filled: boolean }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    fill.set(reduceMotion ? (filled ? 1 : 0) : withTiming(filled ? 1 : 0, { duration: 350 }));
  }, [filled, reduceMotion, fill]);

  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={[styles.step, { backgroundColor: colors.surfaceAlt }]}>
      <Animated.View style={[styles.stepFill, { backgroundColor: colors.primary }, style]} />
    </View>
  );
}

function isLifeArea(value: string): value is LifeArea {
  return value in LIFE_AREA_ICONS;
}

function QuestionBlock({
  question,
  answer,
  onChange,
}: {
  question: OnboardingQuestion;
  answer: OnboardingAnswer | undefined;
  onChange: (value: OnboardingAnswer | undefined) => void;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const hint =
    question.kind === 'single'
      ? t('onboarding.pickOne')
      : question.kind === 'multi'
        ? `${t('onboarding.pickUpTo', { max: question.max })} · ${t('onboarding.picked', {
            count: Array.isArray(answer) ? answer.length : 0,
            max: question.max,
          })}`
        : undefined;

  const label = (
    <View style={styles.prompt}>
      <AppText variant="title">{question.prompt}</AppText>
      {hint ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );

  switch (question.kind) {
    case 'single':
      return (
        <View style={styles.question}>
          {label}
          <View style={styles.grid} accessibilityRole="radiogroup">
            {question.options.map((o) => (
              <OptionTile
                key={o.value}
                kind="single"
                label={o.label}
                selected={answer === o.value}
                onPress={() => onChange(answer === o.value ? undefined : o.value)}
              />
            ))}
          </View>
        </View>
      );
    case 'multi': {
      const selected = Array.isArray(answer) ? answer : [];
      const full = selected.length >= question.max;
      return (
        <View style={styles.question}>
          {label}
          <View style={styles.grid}>
            {question.options.map((o) => {
              const isOn = selected.includes(o.value);
              return (
                <OptionTile
                  key={o.value}
                  kind="multi"
                  label={o.label}
                  area={isLifeArea(o.value) ? o.value : undefined}
                  selected={isOn}
                  dimmed={full && !isOn}
                  onPress={() => {
                    if (isOn) onChange(selected.filter((v) => v !== o.value));
                    else if (!full) onChange([...selected, o.value]);
                  }}
                />
              );
            })}
          </View>
        </View>
      );
    }
    case 'text': {
      const value = typeof answer === 'string' ? answer : '';
      return (
        <View style={styles.question}>
          {label}
          <TextInput
            value={value}
            onChangeText={(v) => onChange(v.length ? v : undefined)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={question.placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={TEXT_MAX}
            accessibilityLabel={question.prompt}
            style={[
              styles.textArea,
              {
                color: colors.text,
                borderColor: focused ? colors.primary : colors.border,
                backgroundColor: focused ? colors.surface : colors.surfaceAlt,
              },
            ]}
          />
          <AppText variant="caption" color="textMuted" style={styles.counter}>
            {value.length}/{TEXT_MAX}
          </AppText>
        </View>
      );
    }
    case 'scale':
      return null;
  }
}

function OptionTile({
  kind,
  label,
  area,
  selected,
  dimmed,
  onPress,
}: {
  kind: 'single' | 'multi';
  label: string;
  area?: LifeArea;
  selected: boolean;
  dimmed?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const accent = area ? areaColors[area] : colors.primary;
  return (
    <Pressable
      accessibilityRole={kind === 'single' ? 'radio' : 'checkbox'}
      accessibilityState={kind === 'single' ? { selected } : { checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.surfaceAlt : colors.surface,
          opacity: dimmed ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      {area ? (
        <View style={[styles.tileIcon, { backgroundColor: `${accent}1A` }]}>
          <Ionicons name={LIFE_AREA_ICONS[area]} size={16} color={accent} />
        </View>
      ) : null}
      <AppText variant="bodyStrong" style={[styles.flex, { color: selected ? colors.primary : colors.text }]}>
        {label}
      </AppText>
      <View
        style={[
          kind === 'single' ? styles.radio : styles.checkbox,
          {
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : colors.surface,
          },
        ]}>
        {selected ? <Ionicons name="checkmark" size={13} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

/** 1–5 rating as a segmented "level meter" in the area's color. */
function RatingMeter({
  question,
  value,
  onChange,
}: {
  question: Extract<OnboardingQuestion, { kind: 'scale' }>;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const { colors } = useTheme();
  const color = areaColors[question.area];

  return (
    <View style={styles.meter}>
      <View style={styles.meterLabel}>
        <View style={[styles.tileIcon, { backgroundColor: `${color}1A` }]}>
          <Ionicons name={LIFE_AREA_ICONS[question.area]} size={16} color={color} />
        </View>
        <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
          {question.prompt}
        </AppText>
        <AppText variant="caption" style={{ color: value ? color : colors.textMuted }}>
          {value ? `${value}/5` : t('onboarding.notRated')}
        </AppText>
      </View>
      <View style={styles.segments} accessibilityRole="radiogroup" accessibilityLabel={question.prompt}>
        {SCALE.map((n) => {
          const lit = value !== undefined && n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected: value === n }}
              accessibilityLabel={`${question.prompt} ${n}`}
              hitSlop={{ top: 6, bottom: 6 }}
              onPress={() => onChange(value === n ? undefined : n)}
              style={({ pressed }) => [
                styles.segment,
                n === 1 && styles.segmentFirst,
                n === SCALE.length && styles.segmentLast,
                { backgroundColor: lit ? color : colors.surfaceAlt, opacity: pressed ? 0.75 : 1 },
              ]}>
              <AppText variant="caption" style={{ color: lit ? colors.onPrimary : colors.textMuted }}>
                {n}
              </AppText>
            </Pressable>
          );
        })}
      </View>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconButton: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  steps: { flex: 1, flexDirection: 'row', gap: 6 },
  step: { flex: 1, height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  stepFill: { height: '100%', borderRadius: radius.pill },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, alignItems: 'center' },
  page: { width: '100%', maxWidth: 640, gap: spacing.xl },
  titleBlock: { gap: spacing.sm },
  buddyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  bubble: {
    flex: 1,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  question: { gap: spacing.md },
  prompt: { gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  tileIcon: { width: 30, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  textArea: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 104,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  counter: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  ratingCard: { gap: spacing.lg },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  meter: { gap: spacing.sm },
  meterLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  segmentFirst: { borderTopLeftRadius: radius.pill, borderBottomLeftRadius: radius.pill },
  segmentLast: { borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
