import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { LIFE_AREA_ICONS, areaLabel } from '@/data/life-areas';
import type { ActivityGrid } from '@/domain/activity';
import { shortDateLabel } from '@/domain/dates';
import type { ProgressSummary } from '@/domain/progress-share';
import type { StatBlock } from '@/domain/types';
import { t } from '@/i18n';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';
import { BrandLogo } from './brand-logo';
import { GradientPanel } from './gradient-panel';
import { ShareBars, ShareRadar, ShareRecord } from './share-charts';

export type ShareCardStyle = 'overlay' | 'gradient' | 'photo';
export type ShareMode = 'journey' | 'status';
export type ShareChart = 'bars' | 'radar' | 'record';
export type ShareAlign = 'top' | 'center' | 'bottom';

export interface ShareOptions {
  mode: ShareMode;
  chart: ShareChart;
  cardStyle: ShareCardStyle;
  /** `dark` is navy text for light photos. The gradient is always light. */
  ink: 'light' | 'dark';
  align: ShareAlign;
  show: { stats: boolean; chart: boolean; name: boolean };
}

/** Logical size of the card (9:16, an Instagram story). It is captured at 3x, so 1080 x 1920 px. */
export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 640;

/** The big number is a one-off graphic, so it is larger than the `hero` variant. See design system section 7. */
const BIG_NUMBER_SIZE = 76;
const RADAR_SIZE = 230;
const ALIGN = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;

type ShareCardProps = {
  summary: ProgressSummary;
  name: string;
  playerTitle: string;
  level: number;
  streakDays: number;
  stats: StatBlock;
  grid: ActivityGrid;
  options: ShareOptions;
  /** Local photo behind the card (`photo` style only). */
  photoUri?: string;
  /** Drag and pinch offsets for the content block, applied inside the captured view. */
  contentStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
};

/**
 * The image people share. `overlay` has no background (a transparent PNG to lay over a photo in
 * Instagram), `photo` adds the person's own photo under a scrim, and `gradient` is the Angat blue.
 * The header stays put; the content block can be aligned, dragged, and resized. Captured by `captureRef`.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { summary, name, playerTitle, level, streakDays, stats, grid, options, photoUri, contentStyle },
  ref,
) {
  const { colors } = useTheme();
  const { mode, chart, cardStyle, align, show } = options;
  const dark = options.ink === 'dark' && cardStyle !== 'gradient';
  const inkColor = dark ? 'text' : 'onPrimary';
  const ink = dark ? colors.text : colors.onPrimary;
  const lift = {
    textShadowColor: dark ? `${colors.surface}80` : `${colors.shadow}80`,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  };

  const isJourney = mode === 'journey';
  const title = isJourney ? t('share.card.dayOne', { count: summary.days }) : t('share.card.level', { count: level });
  const subtitle = isJourney ? t('share.card.dayOneSub') : playerTitle;
  const caption = isJourney
    ? t('share.card.since', { date: shortDateLabel(summary.startDate) })
    : t('share.card.dayCaption', { count: summary.days });

  const figures = [
    { label: t('share.card.quests'), value: summary.questsDone },
    { label: t('share.card.activeDays'), value: summary.activeDays },
    { label: t('share.card.xp'), value: summary.xp },
  ];

  return (
    <View
      ref={ref}
      collapsable={false}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('share.card.summary', {
        title,
        quests: summary.questsDone,
        days: summary.activeDays,
        xp: summary.xp,
      })}
      style={styles.card}>
      {cardStyle === 'gradient' ? <GradientPanel radius={0} style={StyleSheet.absoluteFill} /> : null}
      {cardStyle === 'photo' && photoUri ? (
        <>
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: dark ? `${colors.surface}40` : `${colors.shadow}59` }]}
          />
        </>
      ) : null}

      <View style={styles.top}>
        {/* The wordmark only goes on white (design system section 2), so it sits in a white pill. */}
        <View style={[styles.logoPill, { backgroundColor: colors.surface }]}>
          <BrandLogo height={20} />
        </View>
      </View>

      <Animated.View style={[styles.content, { justifyContent: ALIGN[align] }, contentStyle]}>
        <View>
          <AppText
            variant="hero"
            color={inkColor}
            style={[styles.bigNumber, lift]}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {title}
          </AppText>
          <AppText variant="title" color={inkColor} style={lift} numberOfLines={1}>
            {subtitle}
          </AppText>
          <AppText variant="caption" color={inkColor} style={[styles.caption, lift]}>
            {caption}
          </AppText>
        </View>

        {show.stats ? (
          <View style={styles.statsRow}>
            {figures.map((figure) => (
              <View key={figure.label} style={styles.stat}>
                <AppText variant="display" color={inkColor} style={lift}>
                  {figure.value}
                </AppText>
                <AppText variant="overline" color={inkColor} style={lift}>
                  {figure.label.toUpperCase()}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {show.chart ? (
          <View style={chart === 'radar' ? styles.center : undefined}>
            {chart === 'radar' ? <ShareRadar stats={stats} ink={ink} size={RADAR_SIZE} /> : null}
            {chart === 'record' ? <ShareRecord grid={grid} today={summary.endDate} ink={ink} /> : null}
            {chart === 'bars' ? <ShareBars bars={summary.bars} ink={ink} /> : null}
          </View>
        ) : null}

        {show.name ? (
          <View style={styles.footer}>
            <View style={styles.footerText}>
              <AppText variant="bodyStrong" color={inkColor} numberOfLines={1} style={lift}>
                {name}
              </AppText>
              {summary.topArea ? (
                <View style={styles.area}>
                  <Ionicons name={LIFE_AREA_ICONS[summary.topArea]} size={14} color={ink} />
                  <AppText variant="caption" color={inkColor} style={lift}>
                    {t('share.card.topArea', { area: areaLabel(summary.topArea) })}
                  </AppText>
                </View>
              ) : null}
            </View>
            <View style={styles.pills}>
              <View style={[styles.pill, { backgroundColor: colors.surface }]}>
                <AppText variant="caption" color="primary">
                  {t('player.levelShort')} {level}
                </AppText>
              </View>
              {streakDays > 0 ? (
                <View style={[styles.pill, { backgroundColor: colors.surface }]}>
                  <Ionicons name="flame" size={13} color={colors.primary} />
                  <AppText variant="caption" color="primary">
                    {streakDays}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    padding: spacing.xl,
    gap: spacing.lg,
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoPill: {
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: spacing.xl },
  bigNumber: { fontSize: BIG_NUMBER_SIZE, lineHeight: BIG_NUMBER_SIZE + 6, letterSpacing: -2 },
  caption: { opacity: 0.9, marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.xl },
  stat: { gap: spacing.xs },
  center: { alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footerText: { flex: 1, gap: spacing.xs },
  area: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pills: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
