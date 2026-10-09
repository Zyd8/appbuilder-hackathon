import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueueItem } from './fixtures';

export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; mode?: string };

const KEYS = {
  messages: 'pocketops.messages.v2',
  notes: 'pocketops.notes.v1',
  checklist: 'pocketops.checklist.v1',
  queue: 'pocketops.queue.v1',
};

export async function loadState() {
  const [messagesRaw, notesRaw, checklistRaw, queueRaw] = await AsyncStorage.multiGet(Object.values(KEYS));
  return {
    messages: JSON.parse(messagesRaw[1] ?? '[]') as ChatMessage[],
    notes: JSON.parse(notesRaw[1] ?? '[]') as string[],
    checklist: JSON.parse(checklistRaw[1] ?? '[]') as boolean[],
    queue: JSON.parse(queueRaw[1] ?? '[]') as QueueItem[],
  };
}

export async function saveState(state: { messages: ChatMessage[]; notes: string[]; checklist: boolean[]; queue: QueueItem[] }) {
  await AsyncStorage.multiSet([
    [KEYS.messages, JSON.stringify(state.messages)],
    [KEYS.notes, JSON.stringify(state.notes)],
    [KEYS.checklist, JSON.stringify(state.checklist)],
    [KEYS.queue, JSON.stringify(state.queue)],
  ]);
}

export async function resetState() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
