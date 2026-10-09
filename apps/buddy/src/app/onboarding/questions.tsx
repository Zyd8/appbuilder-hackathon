import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ProgressBar } from '@/components/progress-bar';
import { ONBOARDING_QUESTIONS } from '@/data/onboarding-questions';
import type { OnboardingAnswer, OnboardingQuestion } from '@/domain/types';
import { t } from '@/i18n';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SCALE = [1, 2, 3, 4, 5];

export default function Questions() {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const answers = usePreviewStore((s) => s.answers);
  const setAnswer = usePreviewStore((s) => s.setAnswer);

  const question = ONBOARDING_QUESTIONS[index];
  const total = ONBOARDING_QUESTIONS.length;
  const isLast = index === total - 1;
  const answer = answers[question.id];

  const next = () => {
    if (isLast) router.replace('/onboarding/analysis');
    else setIndex(index + 1);
  };
  const back = () => (index === 0 ? router.back() : setIndex(index - 1));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.safe}>
        <View style={styles.header}>
          <ProgressBar progress={(index + 1) / total} accessibilityLabel={t('onboarding.progress', { current: index + 1, total })} />
          <View style={styles.headerRow}>
            <AppText variant="caption" color="textMuted">
              {t('onboarding.progress', { current: index + 1, total })} · {question.section}
            </AppText>
            <Button label={t('onboarding.skip')} variant="ghost" size="sm" onPress={next} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <AppText variant="display" accessibilityRole="header">
            {question.kind === 'scale'
              ? t('onboarding.scalePrompt', { area: question.prompt.toLowerCase() })
              : question.prompt}
          </AppText>
          {question.kind === 'multi' ? (
            <AppText color="textMuted">{t('onboarding.pickUpTo', { max: question.max })}</AppText>
          ) : null}
          <AnswerInput
            question={question}
            answer={answer}
            onChange={(value) => setAnswer(question.id, value)}
          />
        </ScrollView>

        <View style={styles.footer}>
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

function AnswerInput({
  question,
  answer,
  onChange,
}: {
  question: OnboardingQuestion;
  answer: OnboardingAnswer | undefined;
  onChange: (value: OnboardingAnswer | undefined) => void;
}) {
  const { colors } = useTheme();

  switch (question.kind) {
    case 'single':
      return (
        <View style={styles.options}>
          {question.options.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={answer === o.value}
              onPress={() => onChange(answer === o.value ? undefined : o.value)}
            />
          ))}
        </View>
      );
    case 'multi': {
      const selected = Array.isArray(answer) ? answer : [];
      return (
        <View style={styles.options}>
          {question.options.map((o) => {
            const isOn = selected.includes(o.value);
            return (
              <Chip
                key={o.value}
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
      );
    }
    case 'scale':
      return (
        <View style={styles.scaleWrap}>
          <View style={styles.scaleRow}>
            {SCALE.map((n) => (
              <View key={n} style={styles.flex}>
                <Chip label={String(n)} selected={answer === n} onPress={() => onChange(answer === n ? undefined : n)} />
              </View>
            ))}
          </View>
          <View style={styles.scaleLabels}>
            <AppText variant="caption" color="textMuted">
              1 · {t('onboarding.scaleLow')}
            </AppText>
            <AppText variant="caption" color="textMuted">
              5 · {t('onboarding.scaleHigh')}
            </AppText>
          </View>
        </View>
      );
    case 'text':
      return (
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
      );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { padding: spacing.lg, gap: spacing.lg },
  options: { gap: spacing.sm },
  scaleWrap: { gap: spacing.sm },
  scaleRow: { flexDirection: 'row', gap: spacing.sm },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  textArea: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  flex: { flex: 1 },
  flex2: { flex: 2 },
});
