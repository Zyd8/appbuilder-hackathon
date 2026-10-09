/**
 * Synthetic preview data for Phase 1 (UI shell). Nothing here is real user data.
 * Phase 2 replaces this with SQLite-backed onboarding results; Phase 3 with the quest engine.
 */
import type { ChatMessage, Note, PlayerProfile, Quest, QuestKind, QuestTemplate } from '@/domain/types';
import { RANK_XP } from '@/domain/xp';

import { QUEST_LIBRARY } from './quest-library';

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

export function questFromTemplate(template: QuestTemplate, kind: QuestKind, why?: string): Quest {
  return {
    id: `${template.id}-${todayIso()}-${kind}`,
    templateId: template.id,
    source: 'library',
    kind,
    area: template.area,
    title: template.title,
    flavor: template.flavor,
    instruction: template.instruction,
    rank: template.rank,
    xp: RANK_XP[template.rank],
    estMinutes: template.estMinutes,
    why,
    status: 'offered',
    offeredOn: todayIso(),
  };
}

function template(id: string): QuestTemplate {
  const found = QUEST_LIBRARY.find((q) => q.id === id);
  if (!found) throw new Error(`Unknown quest template: ${id}`);
  return found;
}

export const PREVIEW_PROFILE: PlayerProfile = {
  displayName: 'Player',
  title: 'The Curious Builder',
  totalXp: 120,
  streakDays: 3,
  restTokens: 1,
  stats: {
    focus: 34,
    creativity: 68,
    knowledge: 61,
    social: 47,
    finance: 39,
    calm: 42,
    health: 55,
    organization: 37,
  },
  insights: [
    {
      id: 'ins-1',
      type: 'strength',
      text: 'You love making things',
      reason: 'You rated Creativity highly and picked “Making things” as a goal.',
    },
    {
      id: 'ins-2',
      type: 'strength',
      text: 'You’re a natural learner',
      reason: 'Learning and skills scored well, and you’re curious about new topics.',
    },
    {
      id: 'ins-3',
      type: 'growth_area',
      text: 'Focus',
      reason: 'You rated Focus low and said your phone pulls you away most often.',
    },
    {
      id: 'ins-4',
      type: 'growth_area',
      text: 'Organization',
      reason: 'A tidier life was one of your goals, and small systems would free up your creative time.',
    },
    {
      id: 'ins-5',
      type: 'focus',
      text: 'Finish one small creative project with short, phone-free focus sessions.',
      reason: 'It builds on your strength (making) while growing your weakest area (focus).',
    },
  ],
};

export function previewDailyQuests(): Quest[] {
  return [
    questFromTemplate(
      template('focus-phone-away'),
      'daily',
      'Focus is your top growth area, and your phone is your biggest blocker.',
    ),
    questFromTemplate(template('creativity-six-words'), 'daily', 'A quick win in your strongest area to warm up.'),
    questFromTemplate(template('organization-tomorrow-three'), 'daily', 'Small systems free up time for making.'),
  ];
}

export function previewWeeklyQuest(): Quest {
  return {
    ...questFromTemplate(template('creativity-remix'), 'weekly'),
    id: `weekly-${todayIso()}`,
    title: 'The Finished Thing',
    flavor: 'This week, one small project crosses the finish line.',
    instruction: 'Pick one tiny creative project and finish it in three short, phone-free sessions this week.',
    rank: 'B',
    xp: RANK_XP.B,
    estMinutes: 90,
    why: 'Combines your strength (creativity) with your growth area (focus).',
  };
}

export function previewSideQuests(): Quest[] {
  return [
    questFromTemplate(template('social-three-languages'), 'side'),
    questFromTemplate(template('calm-window-minutes'), 'side'),
  ];
}

const created = () => new Date().toISOString();

export const PREVIEW_NOTES: Note[] = [
  { id: 'note-1', body: 'Send project draft to Sam', createdAt: created(), due: todayIso(), priority: 'high', done: false },
  { id: 'note-2', body: 'Pick up groceries', createdAt: created(), due: todayIso(), priority: 'normal', done: false },
  { id: 'note-3', body: 'Read chapter 3 for class', createdAt: created(), priority: 'normal', area: 'knowledge', done: false },
  {
    id: 'note-4',
    body: 'Ideas for the poster: bold colors, maybe a hand-drawn title. Ask Mia for feedback by Friday.',
    createdAt: created(),
    due: tomorrowIso(),
    priority: 'normal',
    area: 'creativity',
    done: false,
  },
];

export const PREVIEW_CHAT: ChatMessage[] = [];
