import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueueItem } from './fixtures';

const KEYS = {
  notes: 'pocketops.notes.v1',
  checklist: 'pocketops.checklist.v1',
  queue: 'pocketops.queue.v1',
};

export async function loadState() {
  const [notesRaw, checklistRaw, queueRaw] = await AsyncStorage.multiGet(Object.values(KEYS));
  return {
    notes: JSON.parse(notesRaw[1] ?? '[]') as string[],
    checklist: JSON.parse(checklistRaw[1] ?? '[]') as boolean[],
    queue: JSON.parse(queueRaw[1] ?? '[]') as QueueItem[],
  };
}

export async function saveState(state: { notes: string[]; checklist: boolean[]; queue: QueueItem[] }) {
  await AsyncStorage.multiSet([
    [KEYS.notes, JSON.stringify(state.notes)],
    [KEYS.checklist, JSON.stringify(state.checklist)],
    [KEYS.queue, JSON.stringify(state.queue)],
  ]);
}

export async function resetState() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
