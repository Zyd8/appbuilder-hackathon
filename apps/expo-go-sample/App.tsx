import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { buildOfflineAnswer, searchGuides, SearchHit } from './src/retrieval';
import { checklistItems, guides, QueueItem, seedQuestion } from './src/fixtures';
import { loadState, resetState, saveState } from './src/storage';

type Mode = 'OFFLINE' | 'FIXTURE' | 'LAN';
type Tab = 'HOME' | 'ASK' | 'CHECKLIST' | 'ACTIVITY' | 'SETTINGS';

const colors = {
  ink: '#10202B',
  muted: '#68808A',
  paper: '#F4F7F5',
  card: '#FFFFFF',
  line: '#DCE8E3',
  green: '#0B6B55',
  mint: '#D9F1E7',
  amber: '#F3B64C',
  red: '#C54B4B',
  navy: '#163B4A',
};

const emptyChecklist = checklistItems.map(() => false);

export default function App() {
  const [tab, setTab] = useState<Tab>('HOME');
  const [mode, setMode] = useState<Mode>('OFFLINE');
  const [question, setQuestion] = useState(seedQuestion);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [answer, setAnswer] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [checklist, setChecklist] = useState<boolean[]>(emptyChecklist);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [hostUrl, setHostUrl] = useState('http://192.168.1.10:8787');
  const [hostStatus, setHostStatus] = useState('Not tested');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState('');

  const pendingCount = queue.filter((item) => item.state === 'pending').length;
  const activeGuide = guides[0];
  const modeLabel = mode === 'OFFLINE' ? 'Offline retrieval' : mode === 'FIXTURE' ? 'Fixture response' : 'LAN local model';

  useEffect(() => {
    loadState().then((state) => {
      setNotes(state.notes);
      setChecklist(state.checklist.length === checklistItems.length ? state.checklist : emptyChecklist);
      setQueue(state.queue);
      setLoading(false);
    }).catch(() => {
      setBanner('Could not load local state. Demo data is still available.');
      setLoading(false);
    });
  }, []);

  const persist = async (next: { notes?: string[]; checklist?: boolean[]; queue?: QueueItem[] }) => {
    const state = {
      notes: next.notes ?? notes,
      checklist: next.checklist ?? checklist,
      queue: next.queue ?? queue,
    };
    await saveState(state);
  };

  const ask = async () => {
    const results = searchGuides(guides, question);
    setHits(results);
    setBanner('');
    if (mode === 'LAN') {
      try {
        const response = await fetch(`${hostUrl.replace(/\/$/, '')}/v1/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, sources: results.map((item) => ({ id: item.sectionId, text: item.body })) }),
        });
        if (!response.ok) throw new Error('Host unavailable');
        const payload = await response.json() as { answer?: string };
        if (!payload.answer) throw new Error('Invalid host response');
        setAnswer(payload.answer);
        setBanner('LAN host answered using the selected local source passages.');
        return;
      } catch {
        setBanner('LAN host unavailable. Falling back to local retrieval; no work was lost.');
      }
    }
    setAnswer(buildOfflineAnswer(question, results));
  };

  const saveNote = async () => {
    const value = noteDraft.trim();
    if (!value) return;
    const nextNotes = [value, ...notes];
    const item: QueueItem = {
      id: `note-${Date.now()}`,
      title: 'Service note queued',
      detail: value,
      state: 'pending',
      createdAt: new Date().toISOString(),
    };
    const nextQueue = [item, ...queue];
    setNotes(nextNotes);
    setQueue(nextQueue);
    setNoteDraft('');
    await persist({ notes: nextNotes, queue: nextQueue });
    setBanner('Saved locally. It is queued, not synced.');
  };

  const toggleChecklist = async (index: number) => {
    const next = checklist.map((done, itemIndex) => itemIndex === index ? !done : done);
    setChecklist(next);
    await persist({ checklist: next });
  };

  const syncQueue = async () => {
    if (mode !== 'LAN') {
      setBanner('Switch to LAN mode to try synchronization. Local work remains safe.');
      return;
    }
    const pending = queue.filter((item) => item.state === 'pending');
    if (!pending.length) {
      setBanner('Nothing is waiting to sync.');
      return;
    }
    try {
      const response = await fetch(`${hostUrl.replace(/\/$/, '')}/v1/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: pending }),
      });
      if (!response.ok) throw new Error('Sync failed');
      const next = queue.map((item) => item.state === 'pending' ? { ...item, state: 'acknowledged' as const } : item);
      setQueue(next);
      await persist({ queue: next });
      setBanner('Sync acknowledged by the local host.');
    } catch {
      setBanner('Sync failed safely. Pending work remains on this device.');
    }
  };

  const testHost = async () => {
    setHostStatus('Testing…');
    try {
      const response = await fetch(`${hostUrl.replace(/\/$/, '')}/health`);
      setHostStatus(response.ok ? 'Reachable' : 'Unavailable');
    } catch {
      setHostStatus('Unavailable');
    }
  };

  const resetDemo = () => {
    Alert.alert('Reset synthetic demo?', 'This removes local notes, checklist progress, and queue history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await resetState();
        setNotes([]);
        setChecklist(emptyChecklist);
        setQueue([]);
        setAnswer('');
        setHits([]);
        setBanner('Synthetic demo state reset.');
      } },
    ]);
  };

  const overview = useMemo(() => `${checklist.filter(Boolean).length}/${checklist.length} checklist steps`, [checklist]);

  if (loading) {
    return <SafeAreaView style={styles.loading}><Text style={styles.brand}>POCKETOPS</Text><Text style={styles.muted}>Loading local demo state…</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>LOCAL-FIRST FIELD GUIDE</Text>
            <Text style={styles.title}>PocketOps</Text>
          </View>
          <View style={styles.offlinePill}><View style={styles.dot} /><Text style={styles.pillText}>OFFLINE READY</Text></View>
        </View>

        <View style={styles.syntheticBanner}><Text style={styles.syntheticText}>SYNTHETIC DEMO DATA</Text><Text style={styles.syntheticSub}>No cloud account. No real records.</Text></View>

        {banner ? <View style={styles.notice}><Text style={styles.noticeText}>{banner}</Text></View> : null}

        {tab === 'HOME' && <>
          <Text style={styles.sectionLabel}>CURRENT RUNBOOK</Text>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}><Text style={styles.heroKicker}>ACTIVE WORK ORDER</Text><Text style={styles.statusTag}>E17 · OPEN</Text></View>
            <Text style={styles.heroTitle}>ACX-200 generator startup</Text>
            <Text style={styles.heroBody}>Demo Plant · Cooling Bay 2</Text>
            <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(checklist.filter(Boolean).length / checklist.length) * 100}%` }]} /></View><Text style={styles.progressText}>{overview}</Text></View>
            <Pressable style={styles.primaryButton} onPress={() => setTab('ASK')}><Text style={styles.primaryButtonText}>Ask PocketOps</Text><Text style={styles.arrow}>→</Text></Pressable>
          </View>

          <View style={styles.statGrid}>
            <Stat value={String(guides.length)} label="cached guides" />
            <Stat value={String(notes.length)} label="local notes" />
            <Stat value={String(pendingCount)} label="queued" accent={pendingCount > 0} />
          </View>

          <Text style={styles.sectionLabel}>WHAT STILL WORKS WITHOUT CLOUD</Text>
          {['Search local guides', 'Write notes and checklists', 'Draft work and queue sync'].map((item) => <View key={item} style={styles.checkRow}><Text style={styles.checkMark}>✓</Text><Text style={styles.checkText}>{item}</Text></View>)}
        </>}

        {tab === 'ASK' && <>
          <View style={styles.screenHeading}><Text style={styles.screenTitle}>Ask PocketOps</Text><ModeBadge mode={modeLabel} /></View>
          <Text style={styles.muted}>Retrieval happens on this device first. The selected source passages are visible below.</Text>
          <TextInput value={question} onChangeText={setQuestion} placeholder="Ask about a local guide…" placeholderTextColor={colors.muted} style={styles.input} multiline />
          <Pressable style={styles.primaryButton} onPress={ask}><Text style={styles.primaryButtonText}>Search and answer</Text><Text style={styles.arrow}>→</Text></Pressable>
          {answer ? <View style={styles.answerCard}><View style={styles.answerHeader}><Text style={styles.answerKicker}>{modeLabel.toUpperCase()}</Text><Text style={styles.sourceCount}>{hits.length} sources</Text></View><Text style={styles.answer}>{answer}</Text></View> : null}
          <Text style={styles.sectionLabel}>LOCAL SOURCES</Text>
          {hits.length ? hits.map((hit) => <View key={hit.sectionId} style={styles.sourceCard}><View style={styles.sourceHeader}><Text style={styles.sourceTitle}>{hit.heading}</Text><Text style={styles.score}>SCORE {hit.score}</Text></View><Text style={styles.sourceGuide}>{hit.guideTitle}</Text><Text style={styles.sourceBody}>{hit.body}</Text></View>) : <Text style={styles.empty}>Run a search to see cited local passages.</Text>}
          <Text style={styles.sectionLabel}>INSPECTION NOTE</Text>
          <TextInput value={noteDraft} onChangeText={setNoteDraft} placeholder="Write what you found…" placeholderTextColor={colors.muted} style={[styles.input, styles.noteInput]} multiline />
          <Pressable style={styles.secondaryButton} onPress={saveNote}><Text style={styles.secondaryButtonText}>Save locally and queue</Text></Pressable>
        </>}

        {tab === 'CHECKLIST' && <>
          <View style={styles.screenHeading}><Text style={styles.screenTitle}>Checklist</Text><Text style={styles.statusTag}>{overview}</Text></View>
          <Text style={styles.muted}>Progress is stored on this device. It does not wait for a server.</Text>
          <View style={styles.checklistCard}>{checklistItems.map((item, index) => <Pressable key={item} style={styles.taskRow} onPress={() => toggleChecklist(index)}><View style={[styles.taskBox, checklist[index] && styles.taskBoxDone]}>{checklist[index] ? <Text style={styles.taskDone}>✓</Text> : null}</View><Text style={[styles.taskText, checklist[index] && styles.taskTextDone]}>{item}</Text></Pressable>)}</View>
          <Text style={styles.sectionLabel}>CACHED GUIDES</Text>
          {guides.map((guide) => <View key={guide.id} style={styles.guideRow}><View style={styles.guideIcon}><Text style={styles.guideIconText}>{guide.category.slice(0, 1)}</Text></View><View style={styles.guideCopy}><Text style={styles.guideTitle}>{guide.title}</Text><Text style={styles.guideSummary}>{guide.summary}</Text></View></View>)}
        </>}

        {tab === 'ACTIVITY' && <>
          <View style={styles.screenHeading}><Text style={styles.screenTitle}>Activity</Text><Text style={styles.statusTag}>{pendingCount} pending</Text></View>
          <Text style={styles.muted}>Queued work stays here until the local host acknowledges it. Nothing is silently discarded.</Text>
          <Pressable style={styles.secondaryButton} onPress={syncQueue}><Text style={styles.secondaryButtonText}>Try sync now</Text></Pressable>
          {queue.length ? queue.map((item) => <View key={item.id} style={styles.queueRow}><View style={[styles.queueDot, item.state === 'acknowledged' && styles.queueDotDone]} /><View style={styles.queueCopy}><Text style={styles.queueTitle}>{item.title}</Text><Text style={styles.queueDetail}>{item.detail}</Text></View><Text style={[styles.queueState, item.state === 'acknowledged' && styles.queueStateDone]}>{item.state.toUpperCase()}</Text></View>) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Nothing queued</Text><Text style={styles.muted}>Save a note from Ask PocketOps to see local-first sync behavior.</Text></View>}
        </>}

        {tab === 'SETTINGS' && <>
          <View style={styles.screenHeading}><Text style={styles.screenTitle}>Settings</Text><Text style={styles.statusTag}>Expo Go</Text></View>
          <Text style={styles.sectionLabel}>ASSISTANCE MODE</Text>
          {(['OFFLINE', 'FIXTURE', 'LAN'] as Mode[]).map((option) => <Pressable key={option} style={[styles.modeRow, mode === option && styles.modeRowActive]} onPress={() => setMode(option)}><View style={[styles.radio, mode === option && styles.radioActive]} /> <View><Text style={styles.modeTitle}>{option === 'OFFLINE' ? 'Offline retrieval' : option === 'FIXTURE' ? 'Fixture response' : 'LAN local model'}</Text><Text style={styles.modeDescription}>{option === 'OFFLINE' ? 'No network calls. Source passages only.' : option === 'FIXTURE' ? 'Deterministic synthetic responses for demos.' : 'Optional host on the same Wi-Fi network.'}</Text></View></Pressable>)}
          <Text style={styles.sectionLabel}>LOCAL HOST URL</Text>
          <TextInput value={hostUrl} onChangeText={setHostUrl} autoCapitalize="none" autoCorrect={false} style={styles.input} placeholderTextColor={colors.muted} />
          <Pressable style={styles.secondaryButton} onPress={testHost}><Text style={styles.secondaryButtonText}>Test host · {hostStatus}</Text></Pressable>
          <View style={styles.limitCard}><Text style={styles.limitTitle}>Expo Go boundary</Text><Text style={styles.limitBody}>This demo supports local storage, retrieval, and optional foreground LAN requests in Expo Go. An embedded LLM on the phone requires a development build with custom native modules.</Text></View>
          <Pressable style={styles.resetButton} onPress={resetDemo}><Text style={styles.resetText}>Reset synthetic demo data</Text></Pressable>
        </>}
      </ScrollView>
      <View style={styles.nav}>{([['HOME', 'Home'], ['ASK', 'Ask'], ['CHECKLIST', 'Check'], ['ACTIVITY', 'Queue'], ['SETTINGS', 'More']] as [Tab, string][]).map(([key, label]) => <Pressable key={key} style={styles.navItem} onPress={() => setTab(key)}><Text style={[styles.navLabel, tab === key && styles.navLabelActive]}>{label}</Text>{key === 'ACTIVITY' && pendingCount > 0 ? <View style={styles.navBadge}><Text style={styles.navBadgeText}>{pendingCount}</Text></View> : null}</Pressable>)}</View>
    </SafeAreaView>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return <View style={styles.stat}><Text style={[styles.statValue, accent && { color: colors.amber }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function ModeBadge({ mode }: { mode: string }) {
  return <View style={styles.modeBadge}><View style={styles.modeDot} /><Text style={styles.modeBadgeText}>{mode}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, gap: 10 },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  brand: { color: colors.green, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 },
  offlinePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.mint, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.green },
  pillText: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  syntheticBanner: { backgroundColor: colors.navy, padding: 13, borderRadius: 14, marginBottom: 18 },
  syntheticText: { color: '#C9F7E5', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  syntheticSub: { color: '#A9C1C8', fontSize: 12, marginTop: 3 },
  notice: { backgroundColor: '#FFF4D9', borderColor: '#F1D28A', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  noticeText: { color: '#765318', fontSize: 13, lineHeight: 19 },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginTop: 22, marginBottom: 10 },
  heroCard: { backgroundColor: colors.green, padding: 19, borderRadius: 22 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroKicker: { color: '#B7E8D8', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  statusTag: { color: colors.green, backgroundColor: colors.mint, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  heroTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '800', marginTop: 14, letterSpacing: -0.5 },
  heroBody: { color: '#B7E8D8', fontSize: 13, marginTop: 5 },
  progressRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { height: 7, backgroundColor: '#438E79', borderRadius: 8, flex: 1, overflow: 'hidden' },
  progressFill: { height: 7, backgroundColor: '#F9D77C', borderRadius: 8 },
  progressText: { color: '#E5FFF6', fontSize: 11, fontWeight: '700' },
  primaryButton: { marginTop: 20, backgroundColor: '#F9D77C', paddingVertical: 13, paddingHorizontal: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryButtonText: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  arrow: { fontSize: 22, color: colors.ink, lineHeight: 22 },
  statGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 15, padding: 15, flex: 1 },
  statValue: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 7 },
  checkMark: { backgroundColor: colors.mint, color: colors.green, width: 23, height: 23, borderRadius: 23, textAlign: 'center', lineHeight: 23, fontWeight: '900' },
  checkText: { color: colors.ink, fontSize: 14 },
  screenHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  screenTitle: { color: colors.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.8 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: colors.line, borderWidth: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 7 },
  modeDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.green },
  modeBadgeText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 14, padding: 14, color: colors.ink, fontSize: 15, marginTop: 15, minHeight: 55, textAlignVertical: 'top' },
  noteInput: { minHeight: 88 },
  answerCard: { backgroundColor: colors.navy, borderRadius: 17, padding: 17, marginTop: 17 },
  answerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  answerKicker: { color: '#9EE0C9', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  sourceCount: { color: '#BDD1D6', fontSize: 11 },
  answer: { color: '#FFFFFF', fontSize: 16, lineHeight: 24, marginTop: 12 },
  sourceCard: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 15, padding: 15, marginBottom: 10 },
  sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sourceTitle: { color: colors.ink, fontWeight: '900', fontSize: 14, flex: 1 },
  score: { color: colors.green, fontSize: 9, fontWeight: '900' },
  sourceGuide: { color: colors.green, fontSize: 11, fontWeight: '700', marginTop: 4 },
  sourceBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  empty: { color: colors.muted, paddingVertical: 12 },
  secondaryButton: { backgroundColor: colors.card, borderColor: colors.green, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 13 },
  secondaryButtonText: { color: colors.green, fontWeight: '900', fontSize: 13 },
  checklistCard: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 17, padding: 7, marginTop: 17 },
  taskRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  taskBox: { width: 25, height: 25, borderRadius: 8, borderColor: colors.line, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskBoxDone: { backgroundColor: colors.green, borderColor: colors.green },
  taskDone: { color: '#FFFFFF', fontWeight: '900' },
  taskText: { color: colors.ink, flex: 1, fontSize: 14 },
  taskTextDone: { color: colors.muted, textDecorationLine: 'line-through' },
  guideRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  guideIcon: { backgroundColor: colors.mint, width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  guideIconText: { color: colors.green, fontWeight: '900', fontSize: 17 },
  guideCopy: { flex: 1 },
  guideTitle: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  guideSummary: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  queueRow: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 15, padding: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  queueDot: { width: 10, height: 10, borderRadius: 10, backgroundColor: colors.amber },
  queueDotDone: { backgroundColor: colors.green },
  queueCopy: { flex: 1 },
  queueTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  queueDetail: { color: colors.muted, fontSize: 11, marginTop: 3 },
  queueState: { color: '#9A6B18', fontSize: 9, fontWeight: '900' },
  queueStateDone: { color: colors.green },
  emptyCard: { backgroundColor: colors.card, padding: 18, borderRadius: 15, marginTop: 18, borderColor: colors.line, borderWidth: 1 },
  emptyTitle: { color: colors.ink, fontWeight: '900', marginBottom: 4 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 14, marginBottom: 9 },
  modeRowActive: { borderColor: colors.green, backgroundColor: '#F0FBF6' },
  radio: { width: 18, height: 18, borderRadius: 18, borderColor: colors.line, borderWidth: 2 },
  radioActive: { borderColor: colors.green, backgroundColor: colors.green },
  modeTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  modeDescription: { color: colors.muted, fontSize: 12, marginTop: 3 },
  limitCard: { backgroundColor: '#FFF4D9', borderColor: '#F1D28A', borderWidth: 1, borderRadius: 15, padding: 15, marginTop: 20 },
  limitTitle: { color: '#765318', fontWeight: '900', fontSize: 13 },
  limitBody: { color: '#765318', fontSize: 12, lineHeight: 18, marginTop: 5 },
  resetButton: { paddingVertical: 16, alignItems: 'center' },
  resetText: { color: colors.red, fontSize: 13, fontWeight: '800' },
  nav: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', paddingBottom: 8, paddingTop: 10 },
  navItem: { flex: 1, alignItems: 'center', position: 'relative' },
  navLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', paddingVertical: 7 },
  navLabelActive: { color: colors.green, fontWeight: '900' },
  navBadge: { position: 'absolute', right: 19, top: 0, backgroundColor: colors.amber, minWidth: 15, height: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  navBadgeText: { color: colors.ink, fontSize: 9, fontWeight: '900' },
});
