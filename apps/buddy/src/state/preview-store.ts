/**
 * Phase 1 in-memory store. Drives the clickable UI shell with synthetic data.
 * State is lost on restart; Phase 2 moves persistence to SQLite (the local source of truth).
 */
import { create } from 'zustand';

import { QUEST_LIBRARY } from '@/data/quest-library';
import {
  PREVIEW_CHAT,
  PREVIEW_NOTES,
  PREVIEW_PROFILE,
  PREVIEW_TASKS,
  previewDailyQuests,
  previewSideQuests,
  previewWeeklyQuest,
  questFromTemplate,
  todayIso,
} from '@/data/preview';
import type { AccountProfile } from '@/domain/account';
import type {
  ChatMessage,
  CheckIn,
  Note,
  OnboardingAnswer,
  PlayerProfile,
  Quest,
  Task,
} from '@/domain/types';
import { grantXp, levelFromTotalXp } from '@/domain/xp';
import { t } from '@/i18n';
import { loadCachedProfile } from '@/lib/account-storage';

export const FREE_REROLLS_PER_DAY = 2;

export interface CompletionResult {
  granted: number;
  leveledUpTo?: number;
}

interface PreviewState {
  /** Signed-in Google account, cached on the device (ADR-005). Required before onboarding. */
  account?: AccountProfile;
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
  tasks: Task[];
  notes: Note[];
  chat: ChatMessage[];
  buddyTyping: boolean;
  allowPhysical: boolean;

  setAccount: (account: AccountProfile) => void;
  clearAccount: () => void;
  setAnswer: (questionId: string, answer: OnboardingAnswer | undefined) => void;
  finishOnboarding: () => void;
  completeQuest: (questId: string, reflection?: string) => CompletionResult;
  swapQuest: (questId: string) => void;
  saveCheckIn: (checkIn: Omit<CheckIn, 'date'>) => void;
  toggleTask: (taskId: string) => void;
  addNote: (body: string) => void;
  sendChat: (text: string) => void;
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
    tasks: PREVIEW_TASKS,
    notes: PREVIEW_NOTES,
    chat: PREVIEW_CHAT,
    buddyTyping: false,
    allowPhysical: true,
  };
}

let idCounter = 0;
function localId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export const usePreviewStore = create<PreviewState>()((set, get) => ({
  ...initialState(),
  account: loadCachedProfile(),

  setAccount: (account) => set({ account }),

  clearAccount: () => set({ ...initialState(), account: undefined }),

  setAnswer: (questionId, answer) =>
    set((s) => {
      const answers = { ...s.answers };
      if (answer === undefined) delete answers[questionId];
      else answers[questionId] = answer;
      return { answers };
    }),

  finishOnboarding: () => set({ onboarded: true }),

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
    if (s.rerollsLeft <= 0) return;
    const current = s.dailyQuests.find((q) => q.id === questId);
    if (!current || current.status === 'done') return;

    const inUse = new Set(s.dailyQuests.map((q) => q.templateId));
    const candidates = QUEST_LIBRARY.filter(
      (q) => !inUse.has(q.id) && (s.allowPhysical || !q.physical),
    );
    const sameArea = candidates.filter((q) => q.area === current.area);
    const pool = sameArea.length > 0 ? sameArea : candidates;
    if (pool.length === 0) return;

    const next = questFromTemplate(pool[Math.floor(Math.random() * pool.length)], 'daily', current.why);
    set({
      dailyQuests: s.dailyQuests.map((q) => (q.id === questId ? next : q)),
      rerollsLeft: s.rerollsLeft - 1,
    });
  },

  saveCheckIn: (checkIn) => set({ checkIn: { ...checkIn, date: todayIso() } }),

  toggleTask: (taskId) =>
    set((s) => ({ tasks: s.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)) })),

  addNote: (body) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    set((s) => ({
      notes: [{ id: localId('note'), body: trimmed, createdAt: new Date().toISOString() }, ...s.notes],
    }));
  },

  sendChat: (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().buddyTyping) return;
    const now = new Date().toISOString();
    set((s) => ({
      chat: [...s.chat, { id: localId('msg'), role: 'user', text: trimmed, createdAt: now }],
      buddyTyping: true,
    }));
    // Placeholder reply until the on-device model lands in Phase 5.
    setTimeout(() => {
      set((s) => ({
        buddyTyping: false,
        chat: [
          ...s.chat,
          {
            id: localId('msg'),
            role: 'buddy',
            text: t('buddy.previewReply'),
            contextUsed: ['Player profile', 'Today’s quests'],
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    }, 900);
  },

  setAllowPhysical: (allow) => set({ allowPhysical: allow }),

  reset: () => set(initialState()),
}));
