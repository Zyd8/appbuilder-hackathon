import type { OnboardingQuestion } from '@/domain/types';

/**
 * MVP assessment (overview section 14: 12–15 questions, tap-based plus one free-text).
 * Never ask for sensitive data: no medical, detailed finances, location, or relationship specifics.
 */
export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'about.age',
    section: 'About you',
    kind: 'single',
    prompt: 'Which age range fits you?',
    options: [
      { value: '16-19', label: '16–19' },
      { value: '20-24', label: '20–24' },
      { value: '25-34', label: '25–34' },
      { value: '35+', label: '35+' },
    ],
  },
  {
    id: 'about.role',
    section: 'About you',
    kind: 'single',
    prompt: 'What do you spend most of your days doing?',
    options: [
      { value: 'student', label: 'Studying' },
      { value: 'working', label: 'Working' },
      { value: 'freelancing', label: 'Freelancing' },
      { value: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'about.freeTime',
    section: 'About you',
    kind: 'single',
    prompt: 'How much free time do you usually have in a day?',
    options: [
      { value: 'lt15', label: 'Under 15 minutes' },
      { value: '15-30', label: '15–30 minutes' },
      { value: '30-60', label: '30–60 minutes' },
      { value: 'gt60', label: 'More than an hour' },
    ],
  },
  {
    id: 'goals.more',
    section: 'Goals',
    kind: 'multi',
    max: 3,
    prompt: 'What do you want more of in the next 3 months?',
    options: [
      { value: 'focus', label: 'Getting things done' },
      { value: 'creativity', label: 'Making things' },
      { value: 'knowledge', label: 'Learning new skills' },
      { value: 'social', label: 'Better connections' },
      { value: 'finance', label: 'Money confidence' },
      { value: 'calm', label: 'Feeling calmer' },
      { value: 'health', label: 'More energy' },
      { value: 'organization', label: 'A tidier life' },
    ],
  },
  { id: 'rate.focus', section: 'Self-rating', kind: 'scale', area: 'focus', prompt: 'Focus and discipline' },
  { id: 'rate.creativity', section: 'Self-rating', kind: 'scale', area: 'creativity', prompt: 'Creativity' },
  { id: 'rate.knowledge', section: 'Self-rating', kind: 'scale', area: 'knowledge', prompt: 'Learning and skills' },
  { id: 'rate.social', section: 'Self-rating', kind: 'scale', area: 'social', prompt: 'Communication and social' },
  { id: 'rate.finance', section: 'Self-rating', kind: 'scale', area: 'finance', prompt: 'Money habits' },
  { id: 'rate.calm', section: 'Self-rating', kind: 'scale', area: 'calm', prompt: 'Mental calm' },
  { id: 'rate.health', section: 'Self-rating', kind: 'scale', area: 'health', prompt: 'Health basics' },
  { id: 'rate.organization', section: 'Self-rating', kind: 'scale', area: 'organization', prompt: 'Organization' },
  {
    id: 'work.chronotype',
    section: 'How you work',
    kind: 'single',
    prompt: 'Are you more of a morning or a night person?',
    options: [
      { value: 'morning', label: 'Morning' },
      { value: 'night', label: 'Night' },
      { value: 'depends', label: 'It depends' },
    ],
  },
  {
    id: 'work.quitReason',
    section: 'How you work',
    kind: 'single',
    prompt: 'What usually makes you quit things?',
    options: [
      { value: 'boredom', label: 'I get bored' },
      { value: 'time', label: 'I run out of time' },
      { value: 'distraction', label: 'My phone pulls me away' },
      { value: 'perfection', label: 'It isn’t perfect' },
    ],
  },
  {
    id: 'constraints.limits',
    section: 'Limits',
    kind: 'multi',
    max: 3,
    prompt: 'Anything Buddy should avoid in your quests?',
    options: [
      { value: 'no_physical', label: 'Physical tasks' },
      { value: 'no_social', label: 'Reaching out to people' },
      { value: 'no_spending', label: 'Anything that costs money' },
    ],
  },
  {
    id: 'free.wish',
    section: 'One more thing',
    kind: 'text',
    prompt: 'Tell Buddy one thing you wish you were better at.',
    placeholder: 'e.g. finishing side projects',
  },
];
