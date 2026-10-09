import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BuddyMascot } from '@/components/buddy-mascot';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { LIFE_AREA_ICONS } from '@/data/life-areas';
import { ONBOARDING_PAGES } from '@/data/onboarding-questions';
import type { OnboardingAnswer, OnboardingQuestion } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { areaColors, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SCALE = [1, 2, 3, 4, 5];

export default function OnboardingPages() {
  const { colors } = useTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const scrollRef = useRef<ScrollView>(null);
  const answers = usePreviewStore((s) => s.answers);
  const setAnswer = usePreviewStore((s) => s.setAnswer);
  const syncAssessment = usePreviewStore((s) => s.syncAssessment);

  const page = ONBOARDING_PAGES[pageIndex];
  const total = ONBOARDING_PAGES.length;
  const isLast = pageIndex === total - 1;

  const goTo = (index: number) => {
    setDirection(index > pageIndex ? 'forward' : 'back');
    setPageIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const next = () => {
    // Answers are already saved on the device per tap; back them up once per page.
    syncAssessment();
    if (isLast) router.replace('/onboarding/analysis');
    else goTo(pageIndex + 1);
  };
  const back = () => (pageIndex === 0 ? router.back() : goTo(pageIndex - 1));

  const scaleQuestions = page.questions.filter((q) => q.kind === 'scale');
  const otherQuestions = page.questions.filter((q) => q.kind !== 'scale');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.steps} accessibilityLabel={t('onboarding.step', { current: pageIndex + 1, total })}>
            {ONBOARDING_PAGES.map((p, i) => (
              <View
                key={p.id}
                style={[styles.step, { backgroundColor: i <= pageIndex ? colors.primary : colors.surfaceAlt }]}
              />
            ))}
          </View>
          <View style={styles.headerRow}>
            <AppText variant="caption" color="textMuted">
              {t('onboarding.step', { current: pageIndex + 1, total })}
            </AppText>
            <Button label={t('onboarding.skip')} variant="ghost" size="sm" onPress={next} />
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Animated.View
            key={page.id}
            entering={(direction === 'forward' ? FadeInRight : FadeInLeft).duration(250)}
            style={styles.page}>
            <View style={styles.buddyRow}>
              <BuddyMascot mood={isLast ? 'celebrating' : 'happy'} size={48} />
              <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AppText variant="caption">{page.buddyLine}</AppText>
              </View>
            </View>

            <View style={styles.titleBlock}>
              <AppText variant="display" accessibilityRole="header">
                {page.title}
              </AppText>
              <AppText color="textMuted">{page.subtitle}</AppText>
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
                <View style={styles.ratingLegend}>
                  <AppText variant="caption" color="textMuted">
                    1 · {t('onboarding.scaleLow')}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    5 · {t('onboarding.scaleHigh')}
                  </AppText>
                </View>
                {scaleQuestions.map((question) => (
                  <RatingRow
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

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.flex}>
            <Button label={t('onboarding.back')} variant="secondary" onPress={back} />
          </View>
          <View style={styles.flex2}>
            <Button
              label={isLast ? t('onboarding.finish') : t('onboarding.next')}
              icon={isLast ? 'sparkles' : 'arrow-forward'}
              onPress={next}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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

  const label = (
    <View style={styles.promptRow}>
      <AppText variant="bodyStrong" style={styles.flex}>
        {question.prompt}
      </AppText>
      {question.kind === 'multi' ? (
        <AppText variant="caption" color="textMuted">
          {t('onboarding.picked', { count: Array.isArray(answer) ? answer.length : 0, max: question.max })}
        </AppText>
      ) : null}
    </View>
  );

  switch (question.kind) {
    case 'single':
      return (
        <View style={styles.question}>
          {label}
          <View style={styles.chips}>
            {question.options.map((o) => (
              <Chip
                key={o.value}
                size="compact"
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
      return (
        <View style={styles.question}>
          {label}
          <View style={styles.chips}>
            {question.options.map((o) => {
              const isOn = selected.includes(o.value);
              return (
                <Chip
                  key={o.value}
                  size="compact"
                  label={o.label}
                  selected={isOn}
                  onPress={() => {
                    if (isOn) onChange(selected.filter((v) => v !== o.value));
                    else if (selected.length < question.max) onChange([...selected, o.value]);
                  }}
                />
              );
            })}
          </View>
        </View>
      );
    }
    case 'text':
      return (
        <View style={styles.question}>
          {label}
          <TextInput
            value={typeof answer === 'string' ? answer : ''}
            onChangeText={(v) => onChange(v.length ? v : undefined)}
            placeholder={question.placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={200}
            accessibilityLabel={question.prompt}
            style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
        </View>
      );
    case 'scale':
      return null;
  }
}

function RatingRow({
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
    <View style={styles.ratingRow}>
      <View style={styles.ratingLabel}>
        <Ionicons name={LIFE_AREA_ICONS[question.area]} size={18} color={color} />
        <AppText variant="caption" style={styles.flex} numberOfLines={1}>
          {question.prompt}
        </AppText>
      </View>
      <View style={styles.dots} accessibilityRole="radiogroup" accessibilityLabel={question.prompt}>
        {SCALE.map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${question.prompt} ${n}`}
              hitSlop={4}
              onPress={() => onChange(selected ? undefined : n)}
              style={[
                styles.dot,
                {
                  borderColor: selected ? color : colors.border,
                  backgroundColor: selected ? color : value !== undefined && n < value ? `${color}33` : colors.surface,
                },
              ]}>
              <AppText variant="caption" style={{ color: selected ? '#FFFFFF' : colors.textMuted }}>
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
  flex2: { flex: 2 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.xs },
  steps: { flexDirection: 'row', gap: spacing.xs },
  step: { flex: 1, height: 6, borderRadius: radius.pill },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' },
  page: { width: '100%', maxWidth: 640, gap: spacing.xl },
  buddyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bubble: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    borderBottomLeftRadius: radius.sm / 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  titleBlock: { gap: spacing.xs },
  question: { gap: spacing.sm },
  promptRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  textArea: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 88,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  ratingCard: { gap: spacing.sm },
  ratingLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  ratingLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
