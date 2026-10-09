import { grantXp, levelFromTotalXp, playerRank } from './xp';
import { ServiceError, assertLocalDate, requireCommandContext, type AtomicStore, type CommandContext, type CommandResult } from './service-types';

export interface ProgressState { totalXp: number; earnedToday: number; xpDate: string; awardedEffectIds: string[] }
export interface XpEffect { totalXp: number; granted: number; level: number; rank: string }

export class ProgressService {
  constructor(private readonly store: AtomicStore<ProgressState>) {}

  async award(context: CommandContext, effectId: string, amount: number, localDate: string): Promise<CommandResult<XpEffect>> {
    requireCommandContext(context);
    assertLocalDate(localDate);
    if (!effectId.trim() || !Number.isSafeInteger(amount) || amount < 0) throw new ServiceError('invalid_arguments', 'Invalid XP effect');
    return this.store.transact(context, JSON.stringify(['xp.award', effectId, amount, localDate]), (state) => {
      if (state.awardedEffectIds.includes(effectId)) throw new ServiceError('invalid_transition', 'XP effect already applied');
      if (!Number.isSafeInteger(state.totalXp) || state.totalXp < 0 || !Number.isSafeInteger(state.earnedToday) || state.earnedToday < 0) {
        throw new ServiceError('storage_failure', 'Invalid stored XP state');
      }
      const earnedToday = state.xpDate === localDate ? state.earnedToday : 0;
      const granted = grantXp(earnedToday, amount);
      const totalXp = state.totalXp + granted;
      if (!Number.isSafeInteger(totalXp)) throw new ServiceError('storage_failure', 'XP total exceeds safe range');
      const level = levelFromTotalXp(totalXp).level;
      return {
        state: { ...state, totalXp, earnedToday: earnedToday + granted, xpDate: localDate, awardedEffectIds: [...state.awardedEffectIds, effectId] },
        value: { totalXp, granted, level, rank: playerRank(level).rank },
      };
    });
  }
}
