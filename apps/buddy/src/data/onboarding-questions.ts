import type { OnboardingPage } from '@/domain/types';

/**
 * MVP assessment (overview section 14), grouped into 4 short pages so it takes ~2 minutes.
 * Never ask for sensitive data: no medical, detailed finances, location, or relationship specifics.
 */
export const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    id: 'day',
    title: 'Your day',
    subtitle: 'So Buddy picks quests that fit your schedule.',
    buddyLine: 'First, a quick look at your days.',
    questions: [
      {
        id: 'about.role',
        kind: 'single',
        prompt: 'Most days, you’re…',
        options: [
          { value: 'student', label: 'Studying' },
          { value: 'working', label: 'Working' },
          { value: 'freelancing', label: 'Freelancing' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        id: 'about.freeTime',
        kind: 'single',
        prompt: 'Free time per day',
        options: [
          { value: 'lt15', label: '< 15 min' },
          { value: '15-30', label: '15–30 min' },
          { value: '30-60', label: '30–60 min' },
          { value: 'gt60', label: '1 hr +' },
        ],
      },
      {
        id: 'work.chronotype',
        kind: 'single',
        prompt: 'You’re sharpest in the…',
        options: [
          { value: 'morning', label: 'Morning' },
          { value: 'night', label: 'Night' },
          { value: 'depends', label: 'It depends' },
        ],
      },
    ],
  },
  {
    id: 'goals',
    title: 'Your goals',
    subtitle: 'Your quests will lean toward these.',
    buddyLine: 'What would make the next 3 months feel like a win?',
    questions: [
      {
        id: 'goals.more',
        kind: 'multi',
        max: 3,
        prompt: 'I want more…',
        options: [
          { value: 'focus', label: 'Getting things done' },
          { value: 'creativity', label: 'Making things' },
          { value: 'knowledge', label: 'Learning skills' },
          { value: 'social', label: 'Connection' },
          { value: 'finance', label: 'Money confidence' },
          { value: 'calm', label: 'Calm' },
          { value: 'health', label: 'Energy' },
          { value: 'organization', label: 'A tidier life' },
        ],
      },
      {
        id: 'work.quitReason',
        kind: 'single',
        prompt: 'What usually makes you quit?',
        options: [
          { value: 'boredom', label: 'I get bored' },
          { value: 'time', label: 'No time' },
          { value: 'distraction', label: 'My phone' },
          { value: 'perfection', label: 'Not perfect' },
        ],
      },
    ],
  },
  {
    id: 'ratings',
    title: 'Where you are now',
    subtitle: 'Rate each area from 1 (needs work) to 5 (going great). Gut feeling is fine.',
    buddyLine: 'No wrong answers. This just sets your starting stats.',
    questions: [
      { id: 'rate.focus', kind: 'scale', area: 'focus', prompt: 'Focus' },
      { id: 'rate.creativity', kind: 'scale', area: 'creativity', prompt: 'Creativity' },
      { id: 'rate.knowledge', kind: 'scale', area: 'knowledge', prompt: 'Learning' },
      { id: 'rate.social', kind: 'scale', area: 'social', prompt: 'Social' },
      { id: 'rate.finance', kind: 'scale', area: 'finance', prompt: 'Money habits' },
      { id: 'rate.calm', kind: 'scale', area: 'calm', prompt: 'Calm' },
      { id: 'rate.health', kind: 'scale', area: 'health', prompt: 'Health basics' },
      { id: 'rate.organization', kind: 'scale', area: 'organization', prompt: 'Organization' },
    ],
  },
  {
    id: 'rules',
    title: 'Your rules',
    subtitle: 'Buddy will respect these in every quest.',
    buddyLine: 'Last page! Anything I should keep in mind?',
    questions: [
      {
        id: 'constraints.limits',
        kind: 'multi',
        max: 3,
        prompt: 'Skip quests that involve…',
        options: [
          { value: 'no_physical', label: 'Physical activity' },
          { value: 'no_social', label: 'Reaching out to people' },
          { value: 'no_spending', label: 'Spending money' },
        ],
      },
      {
        id: 'free.wish',
        kind: 'text',
        prompt: 'One thing you wish you were better at (optional)',
        placeholder: 'e.g. finishing side projects',
      },
    ],
  },
];
