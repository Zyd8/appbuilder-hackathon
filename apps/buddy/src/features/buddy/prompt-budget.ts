/** Conservative text budget. The runtime still enforces its own token limit. */
export interface PromptUnit { text: string; priority: 'required' | 'memory' | 'context' | 'history' | 'attachment' }
export interface PromptBudget { contextTokens: number; reserveOutputTokens: number; maxCharsPerToken?: number }

export function fitPromptUnits(units: readonly PromptUnit[], budget: PromptBudget): { text: string; omitted: number } {
  const charsPerToken = budget.maxCharsPerToken ?? 3;
  if (!Number.isFinite(budget.contextTokens) || !Number.isFinite(budget.reserveOutputTokens) || budget.contextTokens <= budget.reserveOutputTokens || charsPerToken < 1) {
    throw new RangeError('Invalid prompt budget');
  }
  const limit = Math.floor((budget.contextTokens - budget.reserveOutputTokens) * charsPerToken);
  const selected = units.map(() => true);
  const size = () => units.reduce((total, unit, index) => total + (selected[index] ? unit.text.length + 2 : 0), 0);
  if (units.filter((unit) => unit.priority === 'required').reduce((sum, unit) => sum + unit.text.length + 2, 0) > limit) {
    throw new RangeError('Required prompt content exceeds the context budget');
  }
  // Remove complete oldest history units first, then low-priority context/attachments,
  // then memory. Required policy, schemas, boundaries and current request remain intact.
  for (const priority of ['history', 'context', 'attachment', 'memory'] as const) {
    for (let index = 0; index < units.length && size() > limit; index++) {
      if (units[index].priority === priority) selected[index] = false;
    }
  }
  return { text: units.filter((_, index) => selected[index]).map((unit) => unit.text).join('\n\n'), omitted: selected.filter((keep) => !keep).length };
}
