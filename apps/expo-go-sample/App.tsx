import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { guides, checklistItems } from './src/fixtures';
import { searchGuides } from './src/retrieval';
import { ChatMessage, loadState, saveState } from './src/storage';
import { generateWithSelectedModel } from './src/nativeInference';
import { getModelProfile, MODEL_PROFILES, ModelId } from './src/modelRegistry';

const colors = {
  ink: '#10202B', muted: '#68808A', paper: '#F4F7F5', card: '#FFFFFF',
  line: '#DCE8E3', green: '#0B6B55', mint: '#D9F1E7', navy: '#163B4A', red: '#C54B4B',
};

const defaultModelPath = Platform.OS === 'android'
  ? 'file:///sdcard/Android/data/com.anonymous.pocketops/files/models/Qwen3-1.7B-Q8_0.gguf'
  : '';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelId>('qwen3-1.7b');
  const [modelPath, setModelPath] = useState(defaultModelPath);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Qwen3 1.7B · native mode');
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const selectedProfile = getModelProfile(selectedModel);

  useEffect(() => {
    loadState().then((state) => setMessages(state.messages)).catch(() => setError('Could not load local chat history.'));
  }, []);

  const persistMessages = async (next: ChatMessage[]) => {
    const current = await loadState();
    await saveState({
      messages: next,
      notes: current.notes,
      checklist: current.checklist.length === checklistItems.length ? current.checklist : checklistItems.map(() => false),
      queue: current.queue,
    });
  };

  const send = async () => {
    const prompt = question.trim();
    if (!prompt || busy) return;
    setQuestion('');
    setError('');
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: prompt };
    const withUser = [...messages, userMessage];
    setMessages(withUser);
    await persistMessages(withUser);
    setBusy(true);
    setStatus(`${selectedProfile.label} · typing…`);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    try {
      const hits = searchGuides(guides, prompt);
      const result = await generateWithSelectedModel(selectedModel, modelPath, prompt, hits);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.text,
        mode: 'Qwen3 1.7B · llama.rn · on device',
      };
      const next = [...withUser, assistantMessage];
      setMessages(next);
      await persistMessages(next);
      setStatus(`${selectedProfile.label} · on device · no network`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Native Qwen inference failed.');
      setStatus(`${selectedProfile.label} · unavailable`);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} translucent={false} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>ON-DEVICE CHAT</Text><Text style={styles.title}>PocketOps</Text></View>
          <View style={styles.nativePill}><View style={styles.dot} /><Text style={styles.pillText}>NATIVE</Text></View>
        </View>
        <View style={styles.modelBar}><Text style={styles.modelName}>{selectedProfile.label}</Text><Text style={styles.modelStatus}>{status}</Text></View>
        <View style={styles.modelSwitch}>{MODEL_PROFILES.map((profile) => <Pressable key={profile.id} onPress={() => { setSelectedModel(profile.id); setModelPath(profile.modelPath); setStatus(profile.available ? `${profile.label} · native mode` : `${profile.label} · adapter required`); setError(''); }} style={[styles.modelChip, selectedModel === profile.id && styles.modelChipActive]}><Text style={[styles.modelChipText, selectedModel === profile.id && styles.modelChipTextActive]}>{profile.label}</Text><Text style={styles.modelChipRuntime}>{profile.runtime}</Text></Pressable>)}</View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Talk to {selectedProfile.label} offline.</Text><Text style={styles.emptyText}>The selected model runs inside this app. No account, cloud API, or laptop host.</Text><Text style={styles.example}>Try: “Why is the generator showing E17?”</Text></View>}
          renderItem={({ item }) => <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}><Text style={item.role === 'user' ? styles.userText : styles.botText}>{item.text}</Text>{item.mode ? <Text style={styles.modeText}>{item.mode}</Text> : null}</View>}
        />
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><TextInput value={modelPath} onChangeText={setModelPath} autoCapitalize="none" autoCorrect={false} style={styles.pathInput} placeholder="file:///path/to/Qwen3-1.7B-Q8_0.gguf" placeholderTextColor={colors.muted} /></View> : null}
        {busy ? <View style={styles.typingInline}><ActivityIndicator color={colors.green} size="small" /><Text style={styles.typingText}>Qwen is typing…</Text></View> : null}
        <View style={styles.composer}><TextInput value={question} onChangeText={setQuestion} onSubmitEditing={send} editable={!busy} returnKeyType="send" placeholder="Message Qwen3…" placeholderTextColor={colors.muted} style={styles.input} /><Pressable onPress={send} disabled={busy || !question.trim()} style={[styles.send, (busy || !question.trim()) && styles.sendDisabled]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendText}>↑</Text>}</Pressable></View>
        <Text style={styles.disclaimer}>Synthetic demo data · model stays on this device</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0 }, flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 },
  nativePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.mint, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 }, dot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.green }, pillText: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modelBar: { marginHorizontal: 20, backgroundColor: colors.navy, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 }, modelName: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 }, modelStatus: { color: '#B7E8D8', fontSize: 11, marginTop: 3 },
  modelSwitch: { flexDirection: 'row', gap: 7, paddingHorizontal: 20, paddingTop: 9 }, modelChip: { flex: 1, minHeight: 42, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }, modelChipActive: { backgroundColor: colors.mint, borderColor: colors.green }, modelChipText: { color: colors.ink, fontSize: 10, fontWeight: '900' }, modelChipTextActive: { color: colors.green }, modelChipRuntime: { color: colors.muted, fontSize: 9, marginTop: 2 },
  messages: { padding: 20, paddingBottom: 12, flexGrow: 1, justifyContent: 'flex-end' }, empty: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 20, marginBottom: 12 }, emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' }, emptyText: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 }, example: { color: colors.green, fontSize: 13, fontWeight: '800', marginTop: 18 },
  typing: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 }, typingText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  typingInline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingBottom: 7 },
  bubble: { maxWidth: '90%', padding: 14, borderRadius: 16, marginBottom: 10 }, userBubble: { alignSelf: 'flex-end', backgroundColor: colors.green, borderBottomRightRadius: 4 }, botBubble: { alignSelf: 'flex-start', backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderBottomLeftRadius: 4 }, userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 }, botText: { color: colors.ink, fontSize: 15, lineHeight: 22 }, modeText: { color: colors.muted, fontSize: 9, fontWeight: '900', marginTop: 8, textTransform: 'uppercase' },
  error: { marginHorizontal: 20, marginBottom: 8, padding: 10, backgroundColor: '#FFF0F0', borderColor: '#F2C3C3', borderWidth: 1, borderRadius: 12 }, errorText: { color: colors.red, fontSize: 12, lineHeight: 17 }, pathInput: { backgroundColor: colors.card, color: colors.ink, borderColor: colors.line, borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 11, marginTop: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 20 }, input: { flex: 1, minHeight: 50, maxHeight: 120, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, paddingVertical: 13, color: colors.ink, fontSize: 15 }, send: { width: 50, height: 50, borderRadius: 15, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: 0.4 }, sendText: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' }, disclaimer: { color: colors.muted, textAlign: 'center', fontSize: 10, paddingVertical: 10 },
});
