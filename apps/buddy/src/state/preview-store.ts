/**
 * Phase 1 store. Drives the clickable UI shell with synthetic data.
 * The account (ADR-005), onboarding answers (ADR-006) and notes (ADR-008) persist on the device;
 * XP (ADR-010) is saved too and backed up;
 * everything else is still in memory and is lost on restart until Phase 2 adds SQLite.
 */
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import { useToast } from '@/components/toast';
import { QUEST_LIBRARY } from '@/data/quest-library';
import {
  previewDailyQuests,
  previewSideQuests,
  previewWeeklyQuest,
  questFromTemplate,
  todayIso,
} from '@/data/preview';
import type { AccountProfile } from '@/domain/account';
import {
  answerValues,
  emptyAssessment,
  markCompleted,
  resetAssessment,
  setAnswer as setAssessmentAnswer,
  type AssessmentDoc,
} from '@/domain/assessment';
import type {
  ChatMessage,
  CheckIn,
  Note,
  OnboardingAnswer,
  PlayerProfile,
  Quest,
} from '@/domain/types';
import { applyOrder } from '@/domain/reorder';
import { analyzeProfile } from '@/domain/profile-analysis';
import { createNote, editNote, softDelete, toggleDone, visibleNotes } from '@/domain/notes';
import { emptyNotesDoc, pendingCount, type NotesDoc, type StoredNote } from '@/domain/notes-sync';
import { grantXp, levelFromTotalXp } from '@/domain/xp';
import { pickBuddyAttachments } from '@/features/buddy/attachment-service';
import { getBuddyChatController, releaseBuddyChatController, chatHistory, type BuddyChatResult } from '@/features/buddy/chat-service';
import type { AIEngineReadiness } from '@/features/buddy/contracts/ai-engine';
import type { ConfirmationDescriptor } from '@/features/buddy/contracts/tool-protocol';
import type { MemoryDocument, MemoryDocumentName } from '@/features/buddy/memory/memory-types';
import {
  DEFAULT_BUDDY_MODEL,
  type BuddyModelId,
  type ChatAttachment,
} from '@/features/buddy/types';
import { t } from '@/i18n';
import { loadCachedProfile } from '@/lib/account-storage';
import { openBuddyDatabase } from '@/lib/buddy-database';
import { ProfileRepository } from '@/lib/profile-repository';
import { ProgressRepository } from '@/lib/progress-repository';
import { accountNamespace } from '@/lib/repository-namespace';
import { loadAssessment, writeAssessment } from '@/lib/assessment-storage';
import { restoreAssessment, syncPendingAssessment } from '@/lib/assessment-sync';
import { loadNotes, writeNotes } from '@/lib/notes-storage';
import { loadProgress } from '@/lib/progress-storage';
import { syncProgress } from '@/lib/progress-sync';
import { scheduleNotesSync, syncNotes } from '@/lib/notes-sync';

export const FREE_REROLLS_PER_DAY = 2;

export interface CompletionResult {
  granted: number;
  leveledUpTo?: number;
}

/** Backup state of the notes, shown honestly in the UI (never "synced" before it is confirmed). */
export interface NotesSyncState {
  status: 'idle' | 'syncing' | 'failed';
  /** Changes saved on the device that have not reached the cloud yet. */
  pending: number;
  lastSyncedAt?: string;
}

interface PreviewState {
  /** Signed-in Google account, cached on the device (ADR-005). Required before onboarding. */
  account?: AccountProfile;
  /** Saved onboarding answers for `account` (ADR-006). `answers` and `onboarded` are derived from it. */
  assessment?: AssessmentDoc;
  onboarded: boolean;
  answers: Record<string, OnboardingAnswer>;
  profile: PlayerProfile;
  profileStatus: 'loading' | 'ready' | 'empty' | 'error';
  xpEarnedToday: number;
  rerollsLeft: number;
  dailyQuests: Quest[];
  weeklyQuest: Quest;
  sideQuests: Quest[];
  history: Quest[];
  checkIn?: CheckIn;
  /** Visible notes (no deletions). The full device document lives in `notesDoc`. */
  notes: Note[];
  notesDoc?: NotesDoc;
  notesSync: NotesSyncState;
  chat: ChatMessage[];
  buddyTyping: boolean;
  /** Model the user picked; Gemma Default unless they switch. */
  selectedModelId: BuddyModelId;
  /** Attachments staged for the next message. */
  pendingAttachments: ChatAttachment[];
  /** Last model error, shown under the transcript. */
  chatError?: string;
  pendingConfirmation?: ConfirmationDescriptor;
  modelStatus: AIEngineReadiness | 'checking';
  memoryDocuments: readonly MemoryDocument[];
  memoryError?: string;
  allowPhysical: boolean;

  setAccount: (account: AccountProfile) => void;
  clearAccount: () => void;
  /** Load this account's answers, merging in the cloud copy when reachable (e.g. a new phone). */
  restoreAssessment: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Merge XP with the cloud copy (the larger total wins) and push if the device is ahead. Failures stay pending. */
  syncProgress: () => void;
  /** Push unsynced answers to Supabase. Fire-and-forget; failures stay pending for the next call. */
  syncAssessment: () => void;
  setAnswer: (questionId: string, answer: OnboardingAnswer | undefined) => void;
  finishOnboarding: () => void;
  completeQuest: (questId: string, reflection?: string) => CompletionResult;
  /** Swap a daily quest for a new one. Returns the new quest's id, or undefined if nothing changed. */
  swapQuest: (questId: string) => string | undefined;
  /** Put today's daily quests in the order of `ids` (drag to reorder). */
  reorderDailyQuests: (ids: string[]) => void;
  saveCheckIn: (checkIn: Omit<CheckIn, 'date'>) => void;
  toggleNote: (noteId: string) => void;
  /** Add a note (newest first), optionally scheduled for `date`. Blank input is ignored. */
  addNote: (body: string, options?: { date?: string }) => void;
  /** Change a note's text and/or date. Passing `date: undefined` clears the date. */
  updateNote: (noteId: string, changes: { body?: string; date?: string }) => void;
  deleteNote: (noteId: string) => void;
  /** Back up pending notes and pull other devices' changes. Fire-and-forget; failures stay pending. */
  syncNotes: () => void;
  sendChat: (text: string) => void;
  decideBuddyTool: (decision: 'confirm' | 'reject' | 'cancel') => Promise<void>;
  refreshModelStatus: () => Promise<void>;
  installBuddyModel: (confirmed: boolean) => Promise<void>;
  retryBuddyModel: () => Promise<void>;
  deleteBuddyModel: (confirmed: boolean) => Promise<void>;
  loadBuddyMemory: () => Promise<void>;
  saveBuddyMemory: (name: MemoryDocumentName, text: string, revision: string) => Promise<void>;
  resetBuddyMemory: (name: MemoryDocumentName, revision: string) => Promise<void>;
  deleteBuddyMemory: (name: MemoryDocumentName, revision: string) => Promise<void>;
  setModel: (modelId: BuddyModelId) => void;
  addAttachments: () => Promise<void>;
  removeAttachment: (attachmentId: string) => void;
  clearChatError: () => void;
  setAllowPhysical: (allow: boolean) => void;
  reset: () => void;
}

function initialState() {
  return {
    onboarded: false,
    answers: {},
    profile: profileFor(undefined),
    profileStatus: 'empty' as const,
    xpEarnedToday: 0,
    rerollsLeft: FREE_REROLLS_PER_DAY,
    dailyQuests: previewDailyQuests(),
    weeklyQuest: previewWeeklyQuest(),
    sideQuests: previewSideQuests(),
    history: [],
    checkIn: undefined,
    chat: [] as ChatMessage[],
    buddyTyping: false,
    selectedModelId: DEFAULT_BUDDY_MODEL,
    pendingAttachments: [],
    chatError: undefined,
    pendingConfirmation: undefined,
    modelStatus: 'checking' as const,
    memoryDocuments: [] as readonly MemoryDocument[],
    memoryError: undefined,
    allowPhysical: true,
  };
}

function assessmentState(doc: AssessmentDoc | undefined) {
  return { assessment: doc, answers: answerValues(doc), onboarded: Boolean(doc?.completedAt) };
}

function notesState(doc: NotesDoc | undefined) {
  return { notesDoc: doc, notes: visibleNotes(doc?.notes ?? []) };
}

/** Fresh notes for a newly loaded account; sync status starts from what is still pending. */
function loadedNotesState(doc: NotesDoc | undefined) {
  return { ...notesState(doc), notesSync: { status: 'idle', pending: pendingCount(doc) } as NotesSyncState };
}

const nowIso = () => new Date().toISOString();

const cachedAccount = loadCachedProfile();

/** Display projection from the completed assessment; no preview profile is treated as truth. */
function profileFor(userId: string | undefined, assessment?: AssessmentDoc): PlayerProfile {
  const totalXp = userId ? loadProgress(userId)?.totalXp ?? 0 : 0;
  const analysis = assessment?.completedAt ? analyzeProfile(assessment) : null;
  const neutral = Object.fromEntries(['focus', 'creativity', 'knowledge', 'social', 'finance', 'calm', 'health', 'organization'].map((area) => [area, 50])) as PlayerProfile['stats'];
  return { displayName: 'Player', title: analysis && !analysis.warnings.includes('assessment_version_mismatch') ? analysis.title : 'Player',
    totalXp, streakDays: 0, restTokens: 0, stats: analysis?.stats ?? neutral, insights: analysis?.insights ?? [] };
}

let idCounter = 0;
function localId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/**
 * Apply a change to the notes. Reads the device copy (not memory) so cloud notes merged by a sync
 * in the meantime are never overwritten, saves it, then schedules a backup.
 * Without an account, notes live in memory only.
 */
function changeNotes(change: (notes: StoredNote[]) => StoredNote[]) {
  const { account, notesDoc } = usePreviewStore.getState();
  const userId = account?.id;
  const base = userId ? loadNotes(userId) : (notesDoc ?? emptyNotesDoc('local'));
  const doc: NotesDoc = { ...base, notes: change(base.notes) };
  if (userId) writeNotes(doc);
  usePreviewStore.setState((s) => ({ ...notesState(doc), notesSync: { ...s.notesSync, pending: pendingCount(doc) } }));
  if (userId) scheduleNotesSync(() => usePreviewStore.getState().syncNotes());
}

function changeNote(noteId: string, change: (note: StoredNote, now: string) => StoredNote) {
  changeNotes((notes) => {
    const now = nowIso();
    return notes.map((note) => (note.id === noteId && !note.deletedAt ? change(note, now) : note));
  });
}

export const usePreviewStore = create<PreviewState>()((set, get) => ({
  ...initialState(),
  account: cachedAccount,
  profile: profileFor(cachedAccount?.id, cachedAccount ? loadAssessment(cachedAccount.id) : undefined),
  profileStatus: cachedAccount && loadAssessment(cachedAccount.id)?.completedAt ? 'ready' : 'empty',
  ...assessmentState(cachedAccount ? loadAssessment(cachedAccount.id) : undefined),
  ...loadedNotesState(cachedAccount ? loadNotes(cachedAccount.id) : undefined),

  setAccount: (account) => {
    const previous = get().account?.id;
    if (previous && previous !== account.id) void releaseBuddyChatController(previous);
    set((s) =>
      s.account?.id === account.id
        ? { account }
        : {
            account,
            profile: profileFor(account.id, loadAssessment(account.id)),
            profileStatus: loadAssessment(account.id)?.completedAt ? 'ready' : 'empty',
            ...assessmentState(loadAssessment(account.id)),
            ...loadedNotesState(loadNotes(account.id)),
          },
    );
    void get().refreshModelStatus();
    void get().refreshProfile();
  },

  clearAccount: () => {
    const previous = get().account?.id;
    if (previous) void releaseBuddyChatController(previous);
    set({ ...initialState(), ...loadedNotesState(undefined), account: undefined, assessment: undefined });
  },

  restoreAssessment: async () => {
    const userId = get().account?.id;
    if (!userId) return;
    const doc = await restoreAssessment(userId);
    if (get().account?.id === userId) { set(assessmentState(doc)); await get().refreshProfile(); }
  },

  refreshProfile: async () => {
    const userId = get().account?.id;
    if (!userId) { set({ profileStatus: 'empty' }); return; }
    const assessment = get().assessment;
    if (!assessment?.completedAt) { set({ profileStatus: 'empty', profile: profileFor(userId) }); return; }
    set({ profileStatus: 'loading' });
    let db: Awaited<ReturnType<typeof openBuddyDatabase>> | undefined;
    try {
      db = await openBuddyDatabase();
      const namespace = accountNamespace(userId);
      const repository = new ProfileRepository(db, namespace);
      const analysis = analyzeProfile(assessment);
      if (analysis.warnings.includes('assessment_version_mismatch')) throw new Error('Assessment version changed');
      await repository.save(analysis);
      const saved = await repository.read();
      if (!saved) throw new Error('Profile was not saved');
      const progress = await new ProgressRepository(db, namespace).hydrate(nowIso());
      if (get().account?.id === userId) set({ profileStatus: 'ready', profile: {
        displayName: get().account?.displayName || 'Player', title: saved.title,
        stats: saved.stats, insights: saved.insights, totalXp: progress.doc.totalXp, streakDays: 0, restTokens: 0,
      } });
    } catch { if (get().account?.id === userId) set({ profileStatus: 'error' }); }
    finally { await db?.closeAsync(); }
  },

  syncProgress: () => {
    const { account, profile } = get();
    if (!account) return;
    const userId = account.id;
    void syncProgress(userId, profile.totalXp).then((doc) => {
      // XP only goes up: take the merged total (e.g. earned on another phone), never a lower one.
      set((s) =>
        s.account?.id === userId && doc.totalXp > s.profile.totalXp
          ? { profile: { ...s.profile, totalXp: doc.totalXp } }
          : {},
      );
    });
  },

  syncAssessment: () => {
    const userId = get().account?.id;
    if (!userId) return;
    void syncPendingAssessment(userId).then((doc) => {
      // Only record which version reached the cloud; never replace newer in-memory edits.
      set((s) =>
        doc && s.assessment?.userId === doc.userId ? { assessment: { ...s.assessment, syncedAt: doc.syncedAt } } : {},
      );
    });
  },

  setAnswer: (questionId, answer) => {
    const { account, assessment } = get();
    if (!account) return;
    const doc = setAssessmentAnswer(assessment ?? emptyAssessment(account.id, nowIso()), questionId, answer, nowIso());
    writeAssessment(doc);
    set({ assessment: doc, answers: answerValues(doc) });
  },

  finishOnboarding: () => {
    const { account, assessment } = get();
    if (!account) return set({ onboarded: true });
    const doc = markCompleted(assessment ?? emptyAssessment(account.id, nowIso()), nowIso());
    writeAssessment(doc);
    set({ ...assessmentState(doc), profile: profileFor(account.id, doc), profileStatus: 'loading' });
    void get().refreshProfile();
    get().syncAssessment();
  },

  completeQuest: (questId, reflection) => {
    const s = get();
    const quest = [...s.dailyQuests, s.weeklyQuest, ...s.sideQuests].find((q) => q.id === questId);
    if (!quest || quest.status === 'done') return { granted: 0 };

    const granted = grantXp(s.xpEarnedToday, quest.xp);
    const before = levelFromTotalXp(s.profile.totalXp).level;
    const after = levelFromTotalXp(s.profile.totalXp + granted).level;
    const done: Quest = {
      ...quest,
      status: 'done',
      completedAt: new Date().toISOString(),
      reflection: reflection?.trim() || undefined,
    };
    const mark = (q: Quest) => (q.id === questId ? done : q);

    set({
      dailyQuests: s.dailyQuests.map(mark),
      weeklyQuest: mark(s.weeklyQuest),
      sideQuests: s.sideQuests.map(mark),
      history: [done, ...s.history],
      xpEarnedToday: s.xpEarnedToday + granted,
      profile: { ...s.profile, totalXp: s.profile.totalXp + granted },
    });
    if (granted > 0) get().syncProgress();
    return { granted, leveledUpTo: after > before ? after : undefined };
  },

  swapQuest: (questId) => {
    const s = get();
    if (s.rerollsLeft <= 0) return undefined;
    const current = s.dailyQuests.find((q) => q.id === questId);
    if (!current || current.status === 'done') return undefined;

    const inUse = new Set(s.dailyQuests.map((q) => q.templateId));
    const candidates = QUEST_LIBRARY.filter(
      (q) => !inUse.has(q.id) && (s.allowPhysical || !q.physical),
    );
    const sameArea = candidates.filter((q) => q.area === current.area);
    const pool = sameArea.length > 0 ? sameArea : candidates;
    if (pool.length === 0) return undefined;

    const next = questFromTemplate(pool[Math.floor(Math.random() * pool.length)], 'daily', current.why);
    set({
      dailyQuests: s.dailyQuests.map((q) => (q.id === questId ? next : q)),
      rerollsLeft: s.rerollsLeft - 1,
    });
    return next.id;
  },

  reorderDailyQuests: (ids) => set((s) => ({ dailyQuests: applyOrder(s.dailyQuests, ids) })),

  saveCheckIn: (checkIn) => set({ checkIn: { ...checkIn, date: todayIso() } }),

  toggleNote: (noteId) => changeNote(noteId, toggleDone),

  addNote: (body, options) => {
    const note = createNote(randomUUID(), body, nowIso(), options?.date);
    if (!note) return;
    changeNotes((notes) => [{ ...note, syncedAt: null }, ...notes]);
  },

  updateNote: (noteId, changes) => changeNote(noteId, (note, now) => editNote(note, changes, now)),

  deleteNote: (noteId) => changeNote(noteId, softDelete),

  syncNotes: () => {
    const userId = get().account?.id;
    if (!userId) return;
    set((s) => ({ notesSync: { ...s.notesSync, status: 'syncing' } }));
    const stillSameUser = () => get().account?.id === userId;
    void syncNotes(userId, (doc) => {
      if (stillSameUser()) set(notesState(doc));
    }).then(({ doc, ok, conflicts }) => {
      if (!stillSameUser()) return;
      set((s) => ({
        ...notesState(doc),
        notesSync: {
          status: ok ? 'idle' : 'failed',
          pending: pendingCount(doc),
          lastSyncedAt: ok ? nowIso() : s.notesSync.lastSyncedAt,
        },
      }));
      if (conflicts > 0) useToast.getState().show(t('notes.sync.conflict'));
    });
  },

  sendChat: (text) => {
    const trimmed = text.trim();
    const state = get();
    if (!trimmed || state.buddyTyping || state.pendingConfirmation) return;
    const staged = state.pendingAttachments;
    const userMessage: ChatMessage = { id: localId('msg'), role: 'user', text: trimmed,
      attachments: staged.length ? staged : undefined, createdAt: nowIso() };
    const history = [...state.chat, userMessage];
    set({ chat: history, buddyTyping: true, pendingAttachments: [], chatError: undefined });
    const userId = state.account?.id;
    if (!userId) {
      set({ buddyTyping: false, chatError: 'Sign in to use local Buddy tools.' });
      return;
    }
    void getBuddyChatController(userId)
      .then((controller) => controller.start({ modelId: state.selectedModelId, history: chatHistory(history), localContext: [] }))
      .then((result) => {
        if (get().account?.id === userId) applyBuddyResult(result, state.selectedModelId, set, get);
      })
      .catch(() => {
        if (get().account?.id === userId) set({ buddyTyping: false, chatError: 'Buddy could not open local data.' });
      });
  },

  decideBuddyTool: async (decision) => {
    const pending = get().pendingConfirmation;
    const userId = get().account?.id;
    if (!pending || !userId || get().buddyTyping) return;
    set({ buddyTyping: true });
    try {
      const result = await (await getBuddyChatController(userId)).decide(pending.callId, decision);
      if (get().account?.id === userId) {
        applyBuddyResult(result, get().selectedModelId, set, get);
        if (decision === 'confirm' && result.state === 'complete') {
          const doc = loadNotes(userId);
          set({ ...loadedNotesState(doc) });
          scheduleNotesSync(() => get().syncNotes());
        }
      }
    } catch {
      if (get().account?.id === userId) set({ buddyTyping: false, pendingConfirmation: undefined, chatError: 'Buddy could not finish the local action.' });
    }
  },

  refreshModelStatus: async () => {
    const userId = get().account?.id;
    const modelId = get().selectedModelId;
    set({ modelStatus: 'checking' });
    if (!userId) return;
    try {
      const status = await (await getBuddyChatController(userId)).modelStatus(modelId);
      if (get().account?.id === userId && get().selectedModelId === modelId) set({ modelStatus: status });
    } catch { if (get().account?.id === userId) set({ modelStatus: 'error' }); }
  },

  installBuddyModel: async (confirmed) => {
    const userId = get().account?.id;
    if (!userId || !confirmed) return;
    const modelId = get().selectedModelId;
    set({ modelStatus: 'downloading', chatError: undefined });
    try { await (await getBuddyChatController(userId)).installModel(modelId, true, confirmed); }
    catch { if (get().account?.id === userId) set({ chatError: 'Model installation failed. Check storage and try again.' }); }
    if (get().account?.id === userId) await get().refreshModelStatus();
  },
  retryBuddyModel: async () => {
    const userId = get().account?.id;
    if (!userId) return;
    try { (await getBuddyChatController(userId)).retryModel(get().selectedModelId); }
    catch { set({ chatError: 'Could not retry model installation.' }); }
    await get().refreshModelStatus();
  },
  deleteBuddyModel: async (confirmed) => {
    const userId = get().account?.id;
    if (!userId || !confirmed) return;
    try { await (await getBuddyChatController(userId)).deleteModel(get().selectedModelId, confirmed); }
    catch { set({ chatError: 'Could not remove the model.' }); }
    await get().refreshModelStatus();
  },

  loadBuddyMemory: async () => {
    const userId = get().account?.id;
    if (!userId) return;
    try {
      const documents = await (await getBuddyChatController(userId)).memory.readAll();
      if (get().account?.id === userId) set({ memoryDocuments: documents, memoryError: undefined });
    } catch { if (get().account?.id === userId) set({ memoryError: 'Could not load local memory.' }); }
  },
  saveBuddyMemory: async (name, text, revision) => {
    const userId = get().account?.id;
    if (!userId) throw new Error('Sign in first');
    await (await getBuddyChatController(userId)).memory.save(name, text, revision);
    await get().loadBuddyMemory();
  },
  resetBuddyMemory: async (name, revision) => {
    const userId = get().account?.id;
    if (!userId) throw new Error('Sign in first');
    await (await getBuddyChatController(userId)).memory.reset(name, revision);
    await get().loadBuddyMemory();
  },
  deleteBuddyMemory: async (name, revision) => {
    const userId = get().account?.id;
    if (!userId) throw new Error('Sign in first');
    await (await getBuddyChatController(userId)).memory.delete(name, revision);
    await get().loadBuddyMemory();
  },

  setModel: (modelId) => { set({ selectedModelId: modelId, chatError: undefined, modelStatus: 'checking' }); void get().refreshModelStatus(); },

  addAttachments: async () => {
    const picked = await pickBuddyAttachments();
    if (!picked.length) return;
    set((current) => ({
      pendingAttachments: [...current.pendingAttachments, ...picked].slice(0, 3),
    }));
  },

  removeAttachment: (attachmentId) =>
    set((current) => ({
      pendingAttachments: current.pendingAttachments.filter((attachment) => attachment.id !== attachmentId),
    })),

  clearChatError: () => set({ chatError: undefined }),

  setAllowPhysical: (allow) => set({ allowPhysical: allow }),

  reset: () => {
    const userId = get().account?.id;
    if (userId) void releaseBuddyChatController(userId);
    const { assessment } = get();
    if (!assessment) return set(initialState());
    const doc = resetAssessment(assessment, nowIso());
    writeAssessment(doc);
    set({ ...initialState(), ...assessmentState(doc) });
    get().syncAssessment();
  },
}));

function applyBuddyResult(
  result: BuddyChatResult, modelId: BuddyModelId,
  set: typeof usePreviewStore.setState, get: typeof usePreviewStore.getState,
): void {
  if (result.state === 'pending') {
    set({ buddyTyping: false, pendingConfirmation: result.confirmation, chatError: undefined });
    return;
  }
  const message: ChatMessage = { id: localId('msg'), role: 'buddy', text: result.answer,
    contextUsed: result.summary, modelId, generationState: result.state === 'complete' ? 'complete' : result.state === 'stopped' ? 'stopped' : 'failed', createdAt: nowIso() };
  set({ buddyTyping: false, pendingConfirmation: undefined,
    chatError: result.state === 'failed' ? result.error ?? result.answer : undefined,
    chat: [...get().chat, message] });
}
