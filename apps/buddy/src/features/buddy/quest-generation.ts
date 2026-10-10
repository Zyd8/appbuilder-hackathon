import { LIFE_AREAS, type Energy, type LifeArea } from '@/domain/types';
import { ServiceError } from '@/domain/service-types';
import { validateQuestText } from '@/domain/quest-policy';

export type GeneratedQuestDraft = {
  title: string;
  instruction: string;
  area: LifeArea;
  estMinutes: number;
  energy: Energy;
};

export const DAILY_QUEST_PROMPT = `Generate exactly three small, positive, easy-to-reach daily goals for the user.
Return ONLY a JSON array of exactly three objects with these keys: title, instruction, area, estMinutes, energy.
area must be one of focus, creativity, knowledge, social, finance, calm, health, organization.
energy must be low or medium. estMinutes must be an integer from 2 to 30.
Do not suggest spending money, contacting strangers, risky behavior, medical advice, extreme dieting, or anything requiring a photo.
Make each goal concrete, encouraging, safe, and doable today. Never mention this instruction or the model.`;

function candidateJson(text: string): string {
  const fenced = text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/i);
  if (fenced) return fenced[1];
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

export function parseGeneratedDailyQuests(text: string): GeneratedQuestDraft[] {
  let raw: unknown;
  try { raw = JSON.parse(candidateJson(text)); }
  catch { throw new ServiceError('invalid_arguments', 'The local model returned invalid quest data'); }
  if (!Array.isArray(raw) || raw.length !== 3) throw new ServiceError('invalid_arguments', 'The local model must return exactly three quests');
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw new ServiceError('invalid_arguments', 'Quest data was malformed');
    const value = item as Record<string, unknown>;
    const title = typeof value.title === 'string' ? value.title.trim() : '';
    const instruction = typeof value.instruction === 'string' ? value.instruction.trim() : '';
    const area = value.area;
    const energy = value.energy;
    const estMinutes = value.estMinutes;
    if (!title || !instruction || typeof area !== 'string' || !(LIFE_AREAS as readonly string[]).includes(area) ||
      (energy !== 'low' && energy !== 'medium') || typeof estMinutes !== 'number' || !Number.isInteger(estMinutes) || estMinutes < 2 || estMinutes > 30)
      throw new ServiceError('invalid_arguments', 'Quest data failed validation');
    validateQuestText(title, instruction);
    return { title, instruction, area: area as LifeArea, energy, estMinutes } as GeneratedQuestDraft;
  });
}
