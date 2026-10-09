import type { CheckIn, Energy, Mood } from './types';
import { ServiceError, assertLocalDate, requireCommandContext, type AtomicStore, type CommandContext, type CommandResult } from './service-types';

export interface CheckInState { checkIns: CheckIn[] }

export function validateCheckIn(input: CheckIn): CheckIn {
  assertLocalDate(input.date);
  if (![1, 2, 3, 4, 5].includes(input.mood as Mood) || !(['low', 'medium', 'high'] as Energy[]).includes(input.energy)) {
    throw new ServiceError('invalid_arguments', 'Invalid mood or energy');
  }
  if (input.focusText !== undefined && input.focusText.length > 500) throw new ServiceError('invalid_arguments', 'Focus text is too long');
  return { ...input, focusText: input.focusText?.trim() || undefined };
}

export class CheckInService {
  constructor(private readonly store: AtomicStore<CheckInState>) {}

  async upsert(context: CommandContext, input: CheckIn): Promise<CommandResult<{ checkIn: CheckIn; effect: 'created' | 'updated' }>> {
    requireCommandContext(context);
    const checkIn = validateCheckIn(input);
    return this.store.transact(context, JSON.stringify(['checkin.upsert', checkIn]), (state) => {
      const previous = state.checkIns.find((item) => item.date === checkIn.date);
      return {
        state: { ...state, checkIns: [...state.checkIns.filter((item) => item.date !== checkIn.date), checkIn] },
        value: { checkIn, effect: previous ? 'updated' : 'created' },
      };
    });
  }
}
