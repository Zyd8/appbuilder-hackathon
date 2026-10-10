/**
 * Presentation store over local assessment, notes, XP, and Phase 2 repositories.
 * Local writes remain usable while cloud backup is unavailable.
 */
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import { useToast } from '@/components/toast';
import { QUEST_LIBRARY } from '@/data/quest-library';
import { questCandidates } from '@/domain/quest-policy';
import { Phase2Actions, type Phase2Snapshot } from '@/features/buddy/adapters/phase2-actions';
import { QuestRepository } from '@/lib/quest-repository';
import { CheckInRepository } from '@/lib/check-in-repository';
import { QuestPhotoProofStore } from '@/lib/quest-proof-store';
import {
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
import { createNote, editNote, moveNote, softDelete, toggleDone, topPosition, visibleNotes } from '@/domain/notes';
import { emptyNotesDoc, pendingCount, type NotesDoc, type StoredNote } from '@/domain/notes-sync';
import { levelFromTotalXp, playerRank } from '@/domain/xp';
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
  weeklyQuest?: Quest;
  phase2Status: 'loading' | 'ready' | 'empty' | 'error';
  phase2Error?: string;
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
  /** 0..1 while the selected model is downloading, otherwise null. */
  modelProgress: number | null;
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
  completeQuest: (questId: string, photoUri: string, reflection?: string) => Promise<CompletionResult>;
  hydratePhase2: () => Promise<void>;
  /** Swap a daily quest for a new one. Returns the new quest's id, or undefined if nothing changed. */
  swapQuest: (questId: string) => Promise<string | undefined>;
  /** Put today's daily quests in the order of `ids` (drag to reorder). */
  reorderDailyQuests: (ids: string[]) => void;
  saveCheckIn: (checkIn: Omit<CheckIn, 'date'>) => Promise<void>;
  toggleNote: (noteId: string) => void;
  /** Add a note (newest first), optionally scheduled for `date`. Blank input is ignored. */
  addNote: (body: string, options?: { date?: string }) => void;
  /** Change a note's text and/or date. Passing `date: undefined` clears the date. */
  updateNote: (noteId: string, changes: { body?: string; date?: string }) => void;
  deleteNote: (noteId: string) => void;
  /** Drag to reorder: put `noteId` where it is in `orderedIds` (the list as arranged). Saved and backed up. */
  moveNote: (noteId: string, orderedIds: string[]) => void;
  /** Back up pending notes and pull other devices' changes. Fire-and-forget; failures stay pending. */
  syncNotes: () => void;
  sendChat: (text: string) => void;
  decideBuddyTool: (decision: 'confirm' | 'reject' | 'cancel') => Promise<void>;
  refreshModelStatus: () => Promise<void>;
  /** Cheap re-read for the download progress bar; never flashes the 'checking' state. */
  pollModelProgress: () => Promise<void>;
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
    dailyQuests: [] as Quest[],
    weeklyQuest: undefined as Quest | undefined,
    sideQuests: [] as Quest[],
    phase2Status: 'empty' as const,
    phase2Error: undefined,
    history: [],
    checkIn: undefined,
    chat: [] as ChatMessage[],
    buddyTyping: false,
    selectedModelId: DEFAULT_BUDDY_MODEL,
    pendingAttachments: [],
    chatError: undefined,
    pendingConfirmation: undefined,
    modelStatus: 'checking' as const,
    modelProgress: null,
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
  profileStatus: cachedAccount && loadAssessment(cachedAccount.id)?.completedAt ? 'loading' : 'empty',
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
    void get().hydratePhase2();
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

  hydratePhase2: async () => {
    const userId = get().account?.id;
    if (!userId) { set({ phase2Status: 'empty', dailyQuests: [], weeklyQuest: undefined, sideQuests: [], history: [] }); return; }
    set({ phase2Status: 'loading', phase2Error: undefined });
    let db: Awaited<ReturnType<typeof openBuddyDatabase>> | undefined;
    try {
      db = await openBuddyDatabase();
      const namespace = accountNamespace(userId);
      const proof = new QuestPhotoProofStore(namespace);
      const quests = new QuestRepository(db, namespace);
      const actions = new Phase2Actions(quests, new CheckInRepository(db, namespace), new ProgressRepository(db, namespace), proof);
      const date = todayIso();
      let snapshot = await actions.hydrate(nowIso(), date);
      const currentBoard = snapshot.board.filter((row) => row.quest.offeredOn === date);
      const completedToday = snapshot.history.some((row) => row.quest.offeredOn === date);
      if (currentBoard.length === 0 && !completedToday && get().account?.id === userId) {
        // Daily quests are generated by the installed local model. Never seed curated or preview
        // quests while the model is absent: the blank board is an honest loading state.
        const controller = await getBuddyChatController(userId);
        const modelStatus = await controller.modelStatus(get().selectedModelId);
        if (modelStatus !== 'ready') {
          set({ dailyQuests: [], weeklyQuest: undefined, sideQuests: [], phase2Status: 'loading', phase2Error: undefined });
          return;
        }
        const boundary = { date, maxRank: 'E' as const, energy: 'medium' as const,
          physicalCompletedToday: false };
        const context = JSON.stringify({ profile: get().profile, answers: get().answers,
          checkIn: snapshot.checkIn?.checkIn ?? null });
        const drafts = await controller.generateDailyQuests(get().selectedModelId, context);
        for (let index = 0; index < drafts.length; index++) {
          const draft = drafts[index];
          const quest: Quest = {
            id: `ai-${date}-${index}-${Date.now()}`,
            source: 'ai', kind: 'daily', area: draft.area, title: draft.title,
            flavor: 'A small goal generated locally for today.', instruction: draft.instruction,
            rank: 'E', xp: 10, estMinutes: draft.estMinutes,
            why: 'Generated privately on this device from your local context.', status: 'offered', offeredOn: date,
          };
          await actions.upsertGeneratedDailyQuest(quest, boundary);
        }
        snapshot = await actions.hydrate(nowIso(), date);
      }
      if (get().account?.id === userId) set(phase2View(snapshot, date, get().profile.totalXp, await rerollsLeftFor(quests, date)));
    } catch {
      if (get().account?.id === userId) set({ phase2Status: 'error', phase2Error: 'Quest and check-in data could not be loaded.' });
    } finally { await db?.closeAsync(); }
  },

  completeQuest: async (questId, photoUri, reflection) => {
    const userId = get().account?.id;
    if (!userId) throw new Error('Sign in before completing a quest.');
    if (!photoUri?.trim()) throw new Error('Add a proof photo before finishing.');
    let db: Awaited<ReturnType<typeof openBuddyDatabase>> | undefined;
    try {
      db = await openBuddyDatabase();
      const namespace = accountNamespace(userId);
      const proof = new QuestPhotoProofStore(namespace);
      const quests = new QuestRepository(db, namespace);
      const actions = new Phase2Actions(quests, new CheckInRepository(db, namespace), new ProgressRepository(db, namespace), proof);
      let row = await quests.get(questId);
      if (!row) throw new Error('Quest was not found.');
      if (row.quest.status === 'offered') row = await actions.activateQuest(questId, row.revision);
      const proofId = await proof.save(questId, photoUri);
      const previousLevel = levelFromTotalXp(get().profile.totalXp).level;
      const result = await actions.completeQuest({ questId, expectedRevision: row.revision, proofId,
        idempotencyKey: randomUUID(), reflection, now: nowIso(), localDate: todayIso() });
      const snapshot = await actions.hydrate(nowIso(), todayIso());
      if (get().account?.id === userId) set(phase2View(snapshot, todayIso(), get().profile.totalXp, await rerollsLeftFor(quests, todayIso())));
      const level = result.progress.level;
      get().syncProgress();
      return { granted: result.completion.grantedXp, leveledUpTo: level > previousLevel ? level : undefined };
    } catch (error) {
      if (get().account?.id === userId) set({ phase2Error: 'Quest could not be completed. Your photo remains on this device.' });
      throw error;
    } finally { await db?.closeAsync(); }
  },

  swapQuest: async (questId) => {
    const userId = get().account?.id;
    if (!userId) return undefined;
    let db: Awaited<ReturnType<typeof openBuddyDatabase>> | undefined;
    try {
      db = await openBuddyDatabase();
      const namespace = accountNamespace(userId);
      const quests = new QuestRepository(db, namespace);
      const actions = new Phase2Actions(quests, new CheckInRepository(db, namespace),
        new ProgressRepository(db, namespace), new QuestPhotoProofStore(namespace));
      const current = await quests.get(questId);
      if (!current || current.quest.kind !== 'daily') return undefined;
      const date = todayIso();
      const snapshot = await actions.hydrate(nowIso(), date);
      const used = (await quests.list()).filter((row) => row.quest.offeredOn === date)
        .map((row) => row.quest.templateId).filter((id): id is string => Boolean(id));
      const boundary = { date, maxRank: playerRank(snapshot.progress.level).rank,
        energy: snapshot.checkIn?.checkIn.date === date ? snapshot.checkIn.checkIn.energy : 'low' as const,
        physicalCompletedToday: snapshot.history.some((row) => row.quest.completedAt?.slice(0, 10) === date &&
          QUEST_LIBRARY.some((item) => item.id === row.quest.templateId && item.physical)),
        excludedTemplateIds: used };
      const available = questCandidates(boundary);
      const replacementTemplate = available.find((item) => item.area === current.quest.area) ?? available[0];
      if (!replacementTemplate) throw new Error('No eligible replacement quest remains.');
      const replacement = questFromTemplate(replacementTemplate, 'daily');
      await actions.rerollQuest(questId, current.revision, replacement, boundary);
      const refreshed = await actions.hydrate(nowIso(), date);
      if (get().account?.id === userId) set(phase2View(refreshed, date, get().profile.totalXp, await rerollsLeftFor(quests, date)));
      return replacement.id;
    } catch {
      if (get().account?.id === userId) set({ phase2Error: 'Quest could not be swapped on this device.' });
      return undefined;
    } finally { await db?.closeAsync(); }
  },

  reorderDailyQuests: (ids) => set((s) => ({ dailyQuests: applyOrder(s.dailyQuests, ids) })),

  saveCheckIn: async (checkIn) => {
    const userId = get().account?.id;
    if (!userId) throw new Error('Sign in before checking in.');
    let db: Awaited<ReturnType<typeof openBuddyDatabase>> | undefined;
    try {
      db = await openBuddyDatabase();
      const namespace = accountNamespace(userId);
      const repository = new CheckInRepository(db, namespace);
      const actions = new Phase2Actions(new QuestRepository(db, namespace), repository,
        new ProgressRepository(db, namespace), new QuestPhotoProofStore(namespace));
      const date = todayIso();
      const prior = await repository.get(date);
      const saved = await actions.saveCheckIn({ ...checkIn, date }, prior?.revision ?? 0);
      if (get().account?.id === userId) set({ checkIn: saved.checkIn, phase2Error: undefined });
    } catch (error) {
      if (get().account?.id === userId) set({ phase2Error: 'Check-in could not be saved on this device.' });
      throw error;
    } finally { await db?.closeAsync(); }
  },

  toggleNote: (noteId) => changeNote(noteId, toggleDone),

  addNote: (body, options) => {
    const now = nowIso();
    const note = createNote(randomUUID(), body, now, options?.date);
    if (!note) return;
    // On top even if older notes were dragged above the newest ones.
    changeNotes((notes) => [{ ...note, position: topPosition(visibleNotes(notes), now), syncedAt: null }, ...notes]);
  },

  updateNote: (noteId, changes) => changeNote(noteId, (note, now) => editNote(note, changes, now)),

  deleteNote: (noteId) => changeNote(noteId, softDelete),

  moveNote: (noteId, orderedIds) => changeNotes((notes) => moveNote(notes, noteId, orderedIds, nowIso())),

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
      const controller = await getBuddyChatController(userId);
      const status = await controller.modelStatus(modelId);
      if (get().account?.id === userId && get().selectedModelId === modelId) {
        set({ modelStatus: status, modelProgress: controller.modelProgress(modelId) });
      }
    } catch { if (get().account?.id === userId) set({ modelStatus: 'error' }); }
  },

  pollModelProgress: async () => {
    const userId = get().account?.id;
    const modelId = get().selectedModelId;
    if (!userId) return;
    try {
      const controller = await getBuddyChatController(userId);
      const status = await controller.modelStatus(modelId);
      if (get().account?.id === userId && get().selectedModelId === modelId) {
        set({ modelStatus: status, modelProgress: controller.modelProgress(modelId) });
      }
    } catch {
      // Polling is best-effort: keep the last known status rather than flashing an error.
    }
  },

  installBuddyModel: async (confirmed) => {
    const userId = get().account?.id;
    if (!userId || !confirmed) return;
    const modelId = get().selectedModelId;
    set({ modelStatus: 'downloading', chatError: undefined });
    try { await (await getBuddyChatController(userId)).installModel(modelId, true, confirmed); }
    catch { if (get().account?.id === userId) set({ chatError: 'Model installation failed. Check storage and try again.' }); }
    if (get().account?.id === userId) {
      await get().refreshModelStatus();
      if (get().modelStatus === 'ready') void get().hydratePhase2();
    }
  },
  retryBuddyModel: async () => {
    const userId = get().account?.id;
    if (!userId) return;
    try { (await getBuddyChatController(userId)).retryModel(get().selectedModelId); }
    catch { set({ chatError: 'Could not retry model installation.' }); }
    await get().refreshModelStatus();
    if (get().modelStatus === 'ready') void get().hydratePhase2();
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

  setModel: (modelId) => {
    set({ selectedModelId: modelId, chatError: undefined, modelStatus: 'checking', dailyQuests: [], phase2Status: 'loading' });
    void get().refreshModelStatus().then(() => { if (get().modelStatus === 'ready') void get().hydratePhase2(); });
  },

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

async function rerollsLeftFor(quests: QuestRepository, date: string): Promise<number> {
  const rows = await quests.list();
  return Math.max(0, FREE_REROLLS_PER_DAY - rows.filter((row) => row.quest.kind === 'daily' && row.quest.offeredOn === date && row.quest.status === 'rerolled').length);
}

function phase2View(snapshot: Phase2Snapshot, date: string, currentXp: number, rerollsLeft: number) {
  const todayDone = snapshot.history.filter((row) => row.quest.offeredOn === date).map((row) => row.quest);
  const board = [...snapshot.board.filter((row) => row.quest.offeredOn === date).map((row) => row.quest), ...todayDone];
  return { dailyQuests: board.filter((quest) => quest.kind === 'daily'),
    weeklyQuest: board.find((quest) => quest.kind === 'weekly'), sideQuests: board.filter((quest) => quest.kind === 'side'),
    history: snapshot.history.map((row) => row.quest), checkIn: snapshot.checkIn?.checkIn.date === date ? snapshot.checkIn.checkIn : undefined,
    xpEarnedToday: snapshot.earnedToday, rerollsLeft, phase2Status: 'ready' as const,
    phase2Error: snapshot.recoveryPendingQuestIds.length ? 'Some completed quest XP is awaiting local recovery.' : undefined,
    profile: { ...usePreviewStore.getState().profile, totalXp: Math.max(currentXp, snapshot.progress.doc.totalXp) },
  };
}

if (cachedAccount) {
  void usePreviewStore.getState().refreshProfile();
  void usePreviewStore.getState().hydratePhase2();
}
