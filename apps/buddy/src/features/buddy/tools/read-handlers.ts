import type { BuddyReadPorts, ReadSnapshot } from '../contracts/domain-ports';
import type { ToolResult } from '../contracts/tool-protocol';
import type { ValidatedReadCall } from './tool-types';
import { readResult, toolFailure } from './tool-result';

export async function executeRead(call: ValidatedReadCall, ports: BuddyReadPorts, now: () => string): Promise<ToolResult<unknown>> {
  try {
    let snapshot: ReadSnapshot<unknown>;
    switch (call.name) {
      case 'onboarding.context.read': snapshot = await ports.onboarding.context(); break;
      case 'profile.read': snapshot = await ports.profile.current(); break;
      case 'stats.summary.read': snapshot = await ports.progress.statsSummary(); break;
      case 'stats.breakdown.read': snapshot = await ports.progress.statsBreakdown(); break;
      case 'insights.ordered.read': snapshot = await ports.progress.orderedInsights(); break;
      case 'checkin.current.read': snapshot = await ports.checkIn.current(); break;
      case 'quests.board.read': snapshot = await ports.quests.board(); break;
      case 'quests.history.read': snapshot = await ports.quests.history(); break;
      case 'quests.detail.read': snapshot = await ports.quests.detail(call.arguments.id!); break;
      case 'nudge.current.read': snapshot = await ports.progress.currentNudge(); break;
      case 'progress.xp_level_rank.read': snapshot = await ports.progress.xpLevelRank(); break;
      case 'notes.read': snapshot = call.arguments.id
        ? await ports.notes.byId(call.arguments.id) : await ports.notes.list(); break;
      case 'memory.documents.read': snapshot = await ports.memory.documents(); break;
      case 'model.status': snapshot = await ports.model.status(); break;
      case 'input.capabilities.read': snapshot = await ports.input.capabilities(); break;
    }
    return readResult(call.id, call.name, snapshot);
  } catch {
    return toolFailure(call.id, call.name, 'unavailable', now(), 'Local read is unavailable');
  }
}
