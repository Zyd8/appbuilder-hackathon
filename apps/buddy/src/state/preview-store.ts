/**
 * Phase 1 store. Drives the clickable UI shell with synthetic data.
 * The account (ADR-005) and onboarding answers (ADR-006) persist on the device; everything else
 * is still in memory and is lost on restart until Phase 2 adds SQLite.
 */
import { create } from 'zustand';

import { QUEST_LIBRARY } from '@/data/quest-library';
import {
  PREVIEW_CHAT,
  PREVIEW_NOTES,
  PREVIEW_PROFILE,
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
import { cleanNoteBody } from '@/domain/notes';
import { grantXp, levelFromTotalXp } from '@/domain/xp';
import { pickBuddyAttachments } from '@/features/buddy/attachment-service';
import { generateBuddyReply } from '@/features/buddy/chat-service';
import { buildBuddyPrompt } from '@/features/buddy/prompt-builder';
import {
  DEFAULT_BUDDY_MODEL,
  buddyModel,
  type BuddyModelId,
  type ChatAttachment,
} from '@/features/buddy/types';
import { loadCachedProfile } from '@/lib/account-storage';
import { loadAssessment, writeAssessment } from '@/lib/assessment-storage';
import { restoreAssessment, syncPendingAssessment } from '@/lib/assessment-sync';

export const FREE_REROLLS_PER_DAY = 2;

export interface CompletionResult {
  granted: number;
  leveledUpTo?: number;
}

interface PreviewState {
  /** Signed-in Google account, cached on the device (ADR-005). Required before onboarding. */
  account?: AccountProfile;
  /** Saved onboarding answers for `account` (ADR-006). `answers` and `onboarded` are derived from it. */
  assessment?: AssessmentDoc;
  onboarded: boolean;
  answers: Record<string, OnboardingAnswer>;
  profile: PlayerProfile;
  xpEarnedToday: number;
  rerollsLeft: number;
  dailyQuests: Quest[];
  weeklyQuest: Quest;
  sideQuests: Quest[];
  history: Quest[];
  checkIn?: CheckIn;
  notes: Note[];
  chat: ChatMessage[];
  buddyTyping: boolean;
  /** Model the user picked; Gemma Default unless they switch. */
  selectedModelId: BuddyModelId;
  /** Attachments staged for the next message. */
  pendingAttachments: ChatAttachment[];
  /** Last model error, shown under the transcript. */
  chatError?: string;
  allowPhysical: boolean;

  setAccount: (account: AccountProfile) => void;
  clearAccount: () => void;
  /** Load this account's answers, merging in the cloud copy when reachable (e.g. a new phone). */
  restoreAssessment: () => Promise<void>;
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
  /** Add a note (newest first). `dueToday` puts it on the Today tab. Blank input is ignored. */
  addNote: (body: string, options?: { dueToday?: boolean }) => void;
  sendChat: (text: string) => void;
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
    profile: PREVIEW_PROFILE,
    xpEarnedToday: 0,
    rerollsLeft: FREE_REROLLS_PER_DAY,
    dailyQuests: previewDailyQuests(),
    weeklyQuest: previewWeeklyQuest(),
    sideQuests: previewSideQuests(),
    history: [],
    checkIn: undefined,
    notes: PREVIEW_NOTES,
    chat: PREVIEW_CHAT,
    buddyTyping: false,
    selectedModelId: DEFAULT_BUDDY_MODEL,
    pendingAttachments: [],
    chatError: undefined,
    allowPhysical: true,
  };
}

function assessmentState(doc: AssessmentDoc | undefined) {
  return { assessment: doc, answers: answerValues(doc), onboarded: Boolean(doc?.completedAt) };
}

const nowIso = () => new Date().toISOString();

const cachedAccount = loadCachedProfile();

let idCounter = 0;
function localId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/** Compact local context handed to the on-device model. No network, no hidden fields. */
function localBuddyContext(state: { profile: PlayerProfile; dailyQuests: Quest[]; notes: Note[] }): string[] {
  const openNotes = state.notes
    .filter((note) => !note.done)
    .slice(0, 5)
    .map((note) => note.body);
  return [
    `Player: ${state.profile.displayName} (${state.profile.title})`,
    `Today's quests: ${state.dailyQuests.map((quest) => quest.title).join(', ') || 'none'}`,
    `Open notes: ${openNotes.join(' | ') || 'none'}`,
  ];
}

export const usePreviewStore = create<PreviewState>()((set, get) => ({
  ...initialState(),
  account: cachedAccount,
  ...assessmentState(cachedAccount ? loadAssessment(cachedAccount.id) : undefined),

  setAccount: (account) =>
    set((s) =>
      s.account?.id === account.id ? { account } : { account, ...assessmentState(loadAssessment(account.id)) },
    ),

  clearAccount: () => set({ ...initialState(), account: undefined, assessment: undefined }),

  restoreAssessment: async () => {
    const userId = get().account?.id;
    if (!userId) return;
    const doc = await restoreAssessment(userId);
    if (get().account?.id === userId) set(assessmentState(doc));
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
    set(assessmentState(doc));
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

  toggleNote: (noteId) =>
    set((s) => ({ notes: s.notes.map((note) => (note.id === noteId ? { ...note, done: !note.done } : note)) })),

  addNote: (body, options) => {
    const clean = cleanNoteBody(body);
    if (!clean) return;
    const note: Note = {
      id: localId('note'),
      body: clean,
      createdAt: new Date().toISOString(),
      priority: 'normal',
      done: false,
      due: options?.dueToday ? todayIso() : undefined,
    };
    set((s) => ({ notes: [note, ...s.notes] }));
  },

  sendChat: (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().buddyTyping) return;

    const state = get();
    const model = buddyModel(state.selectedModelId);
    const staged = state.pendingAttachments;
    const userMessage: ChatMessage = {
      id: localId('msg'),
      role: 'user',
      text: trimmed,
      attachments: staged.length ? staged : undefined,
      createdAt: new Date().toISOString(),
    };
    const history = [...state.chat, userMessage];
    set({ chat: history, buddyTyping: true, pendingAttachments: [], chatError: undefined });

    const prompt = buildBuddyPrompt(
      history.map((message) => ({ role: message.role, text: message.text, attachments: message.attachments })),
      localBuddyContext(get()),
    );

    void generateBuddyReply({ modelId: model.id, modelPath: model.path, prompt, attachments: staged })
      .then((reply) => {
        set((current) => ({
          buddyTyping: false,
          chat: [
            ...current.chat,
            {
              id: localId('msg'),
              role: 'buddy',
              text: reply,
              modelId: model.id,
              generationState: 'complete',
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : 'Buddy could not run the on-device model.';
        set((current) => ({
          buddyTyping: false,
          chatError: message,
          chat: [
            ...current.chat,
            {
              id: localId('msg'),
              role: 'buddy',
              text: message,
              modelId: model.id,
              generationState: 'failed',
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      });
  },

  setModel: (modelId) => set({ selectedModelId: modelId, chatError: undefined }),

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
    const { assessment } = get();
    if (!assessment) return set(initialState());
    const doc = resetAssessment(assessment, nowIso());
    writeAssessment(doc);
    set({ ...initialState(), ...assessmentState(doc) });
    get().syncAssessment();
  },
}));
