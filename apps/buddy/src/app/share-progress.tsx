import { useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { View as RNView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Segmented } from '@/components/segmented';
import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  ShareCard,
  type ShareAlign,
  type ShareChart,
  type ShareMode,
  type ShareOptions,
} from '@/components/share-card';
import { useToast } from '@/components/toast';
import { buildActivityGrid } from '@/domain/activity';
import { summarizeProgress } from '@/domain/progress-share';
import { levelFromTotalXp } from '@/domain/xp';
import { t } from '@/i18n';
import { canShareImage, captureCard, pickStoryPhoto, saveImageToPhotos, shareImage } from '@/lib/share-image';
import { usePreviewStore } from '@/state/preview-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const RECORD_WEEKS = 16;
const MIN_SIZE = 0.6;
const MAX_SIZE = 1.6;
const SIZE_STEP = 1.1;

const clampSize = (value: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, value));

/** Opened from the Player tab. Builds a story-sized card from local data; nothing leaves the device until the user shares. */
export default function ShareProgress() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const showToast = useToast((s) => s.show);
  const account = usePreviewStore((s) => s.account);
  const profile = usePreviewStore((s) => s.profile);
  const history = usePreviewStore((s) => s.history);

  const cardRef = useRef<RNView>(null);
  const [options, setOptions] = useState<ShareOptions>({
    mode: 'journey',
    chart: 'bars',
    cardStyle: 'overlay',
    ink: 'light',
    align: 'bottom',
    show: { stats: true, chart: true, name: true },
  });
  const [photoUri, setPhotoUri] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const now = new Date();
  const summary = summarizeProgress(history, now);
  const grid = buildActivityGrid(history, now, RECORD_WEEKS);
  const name = account?.displayName?.trim() || profile.displayName;
  const level = levelFromTotalXp(profile.totalXp).level;
  const needsPhoto = options.cardStyle === 'photo' && !photoUri;
  const previewScale = Math.min(1, (Math.min(width, 640) - spacing.lg * 2) / SHARE_CARD_WIDTH);

  const set = (patch: Partial<ShareOptions>) => setOptions((o) => ({ ...o, ...patch }));
  const toggle = (key: keyof ShareOptions['show']) =>
    setOptions((o) => ({ ...o, show: { ...o.show, [key]: !o.show[key] } }));

  // Where the content block sits, in card points. Hold-and-drag moves it, pinch resizes it.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const size = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startSize = useSharedValue(1);
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: size.get() }],
  }));

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      startX.set(x.get());
      startY.set(y.get());
    })
    .onUpdate((e) => {
      x.set(startX.get() + e.translationX / previewScale);
      y.set(startY.get() + e.translationY / previewScale);
    });
  const pinch = Gesture.Pinch()
    .onStart(() => startSize.set(size.get()))
    .onUpdate((e) => size.set(clampSize(startSize.get() * e.scale)));
  const gesture = Gesture.Simultaneous(pan, pinch);

  const resize = (factor: number) => size.set(withTiming(clampSize(size.get() * factor), { duration: 200 }));
  const resetLayout = () => {
    x.set(withTiming(0, { duration: 250 }));
    y.set(withTiming(0, { duration: 250 }));
    size.set(withTiming(1, { duration: 250 }));
  };

  const changeMode = (mode: ShareMode) => set({ mode, chart: mode === 'journey' ? 'bars' : 'radar' });

  async function choosePhoto() {
    const uri = await pickStoryPhoto();
    if (uri) setPhotoUri(uri);
  }

  async function run(action: (uri: string) => Promise<void>) {
    if (busy || needsPhoto) return;
    setBusy(true);
    setNotice(undefined);
    let uri: string;
    try {
      uri = await captureCard(cardRef);
    } catch {
      setNotice(t('share.failed'));
      setBusy(false);
      return;
    }
    try {
      await action(uri);
    } catch {
      setNotice(t('share.failed'));
    } finally {
      setBusy(false);
    }
  }

  const onSave = () =>
    run(async (uri) => {
      if (await saveImageToPhotos(uri)) showToast(t('share.saved'));
      else setNotice(t('share.saveDenied'));
    });

  const onShare = () =>
    run(async (uri) => {
      if (!(await canShareImage())) {
        setNotice(t('share.unavailable'));
        return;
      }
      await shareImage(uri, t('share.title'));
    });

  return (
    <Screen edges={['bottom']}>
      <Segmented
        options={[
          { value: 'journey', label: t('share.range.journey') },
          { value: 'status', label: t('share.range.status') },
        ]}
        value={options.mode}
        onChange={changeMode}
      />

      <GestureDetector gesture={gesture}>
        <View
          style={[
            styles.stage,
            {
              width: SHARE_CARD_WIDTH * previewScale,
              height: SHARE_CARD_HEIGHT * previewScale,
              backgroundColor: colors.text,
            },
          ]}
          accessibilityLabel={t('share.preview')}>
          <View style={{ transform: [{ scale: previewScale }], transformOrigin: 'top left' }}>
            <ShareCard
              ref={cardRef}
              summary={summary}
              name={name}
              playerTitle={profile.title}
              level={level}
              streakDays={profile.streakDays}
              stats={profile.stats}
              grid={grid}
              options={options}
              photoUri={photoUri}
              contentStyle={contentStyle}
            />
          </View>
        </View>
      </GestureDetector>
      <AppText variant="caption" color="textMuted" style={styles.center}>
        {t('share.moveHint')}
      </AppText>

      <View style={styles.group}>
        <SectionHeader title={t('share.section.chart')} />
        <Segmented
          options={[
            { value: 'bars', label: t('share.chart.bars') },
            { value: 'radar', label: t('share.chart.radar') },
            { value: 'record', label: t('share.chart.record') },
          ]}
          value={options.chart}
          onChange={(chart: ShareChart) => set({ chart, show: { ...options.show, chart: true } })}
        />
      </View>

      <View style={styles.group}>
        <SectionHeader title={t('share.section.show')} />
        <View style={styles.row}>
          <Chip size="compact" label={t('share.show.stats')} selected={options.show.stats} onPress={() => toggle('stats')} />
          <Chip size="compact" label={t('share.show.chart')} selected={options.show.chart} onPress={() => toggle('chart')} />
          <Chip size="compact" label={t('share.show.name')} selected={options.show.name} onPress={() => toggle('name')} />
        </View>
      </View>

      <View style={styles.group}>
        <SectionHeader title={t('share.section.layout')} />
        <Segmented
          options={[
            { value: 'top', label: t('share.align.top') },
            { value: 'center', label: t('share.align.center') },
            { value: 'bottom', label: t('share.align.bottom') },
          ]}
          value={options.align}
          onChange={(align: ShareAlign) => set({ align })}
        />
        <View style={styles.row}>
          <Button label={t('share.smaller')} icon="remove" variant="secondary" size="sm" onPress={() => resize(1 / SIZE_STEP)} />
          <Button label={t('share.bigger')} icon="add" variant="secondary" size="sm" onPress={() => resize(SIZE_STEP)} />
          <Button label={t('share.reset')} icon="refresh" variant="ghost" size="sm" onPress={resetLayout} />
        </View>
      </View>

      <View style={styles.group}>
        <SectionHeader title={t('share.section.background')} />
        <Segmented
          options={[
            { value: 'overlay', label: t('share.style.overlay') },
            { value: 'gradient', label: t('share.style.gradient') },
            { value: 'photo', label: t('share.style.photo') },
          ]}
          value={options.cardStyle}
          onChange={(cardStyle: ShareOptions['cardStyle']) => set({ cardStyle })}
        />
        <View style={styles.hintRow}>
          <AppText variant="caption" color="textMuted" style={styles.flex}>
            {t(`share.hint.${options.cardStyle}`)}
          </AppText>
          {options.cardStyle === 'photo' ? (
            <Button
              label={t(photoUri ? 'share.changePhoto' : 'share.pickPhoto')}
              icon="image-outline"
              variant="secondary"
              size="sm"
              onPress={choosePhoto}
            />
          ) : null}
        </View>
        {options.cardStyle !== 'gradient' ? (
          <Segmented
            options={[
              { value: 'light', label: t('share.ink.light') },
              { value: 'dark', label: t('share.ink.dark') },
            ]}
            value={options.ink}
            onChange={(ink: ShareOptions['ink']) => set({ ink })}
          />
        ) : null}
      </View>

      {needsPhoto ? (
        <AppText variant="caption" color="textMuted" accessibilityLiveRegion="polite">
          {t('share.pickPhotoFirst')}
        </AppText>
      ) : null}
      {notice ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.notice, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <AppText variant="caption" style={styles.flex}>
            {notice}
          </AppText>
        </View>
      ) : null}

      <View style={styles.group}>
        <Button
          label={t('share.share')}
          icon="share-outline"
          onPress={onShare}
          disabled={busy || needsPhoto}
          accessibilityHint={t('share.shareHint')}
        />
        <Button
          label={t('share.save')}
          icon="download-outline"
          variant="secondary"
          onPress={onSave}
          disabled={busy || needsPhoto}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden' },
  center: { textAlign: 'center' },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  notice: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
});
