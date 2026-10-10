import { QUEST_LIBRARY } from '@/data/quest-library';
import { validateCheckIn } from '@/domain/check-in-service';
import { QuestService, type QuestProofPort, type QuestState } from '@/domain/quest-service';
import { validateQuestCandidate, validateReroll, type QuestBoundary } from '@/domain/quest-policy';
import { ServiceError, assertLocalDate, assertTimestamp, type AtomicStore, type CommandContext, type CommandResult } from '@/domain/service-types';
import type { CheckIn, Quest } from '@/domain/types';
import { RANK_XP } from '@/domain/xp';
import { CheckInRepository, type RevisionedCheckIn } from '@/lib/check-in-repository';
import { ProgressRepository, type CompletionRecord, type ProgressSnapshot } from '@/lib/progress-repository';
import { QuestRepository, type RevisionedQuest } from '@/lib/quest-repository';

type StoredQuest = Quest & { completionLocalDate?: string; proofId?: string };

export interface Phase2Snapshot {
  board: RevisionedQuest[];
  history: RevisionedQuest[];
  checkIn: RevisionedCheckIn | null;
  progress: ProgressSnapshot;
  earnedToday: number;
  /** A completed quest could not yet be reconciled into the durable XP ledger. */
  recoveryPendingQuestIds: string[];
}

export interface CompleteQuestInput {
  questId: string;
  expectedRevision: number;
  /** Issued by an app-owned proof registry after the photo was retained and verified. Never a URI. */
  proofId: string;
  idempotencyKey: string;
  reflection?: string;
  now: string;
  localDate: string;
}

export interface CompletedQuestResult {
  quest: RevisionedQuest;
  completion: CompletionRecord;
  progress: ProgressSnapshot;
  idempotentReplay: boolean;
}

/** UI-facing durable Phase-2 commands. A proof registry must be injected to enable completion. */
export class Phase2Actions {
  private static completionQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly quests: QuestRepository, private readonly checkIns: CheckInRepository,
    private readonly progress: ProgressRepository, private readonly proof: QuestProofPort) {}

  async hydrate(now: string, localDate: string): Promise<Phase2Snapshot> {
    assertTimestamp(now); assertLocalDate(localDate);
    const rows = await this.quests.list();
    const recoveryPendingQuestIds: string[] = [];
    for (const row of rows) {
      if (row.quest.status !== 'done') continue;
      const stored = row.quest as StoredQuest;
      if (!stored.completionLocalDate || !stored.completedAt ||
          !/^[A-Za-z0-9_-]{16,128}$/.test(stored.proofId ?? '')) {
        recoveryPendingQuestIds.push(stored.id);
        continue;
      }
      try {
        if (!await this.progress.completion(stored.id)) {
          if (!await this.proof.verify(stored.id, stored.proofId!)) {
            recoveryPendingQuestIds.push(stored.id);
            continue;
          }
          await this.progress.recordCompletion(stored.id, stored.completionLocalDate, stored.xp, now);
        }
      } catch { recoveryPendingQuestIds.push(stored.id); }
    }
    return {
      board: rows.filter((row) => row.quest.status === 'offered' || row.quest.status === 'active'),
      history: rows.filter((row) => row.quest.status === 'done'),
      checkIn: await this.checkIns.latest(), progress: await this.progress.hydrate(now),
      earnedToday: await this.progress.earnedOn(localDate), recoveryPendingQuestIds,
    };
  }

  async upsertGeneratedDailyQuest(quest: Quest, boundary: QuestBoundary): Promise<RevisionedQuest> {
    if (quest.source !== 'ai' || quest.kind !== 'daily' || quest.status !== 'offered' || quest.offeredOn !== boundary.date ||
      quest.rank !== 'E' || quest.xp !== RANK_XP.E || quest.completedAt || quest.reflection)
      throw new ServiceError('invalid_arguments', 'Generated quest is outside the safe daily contract');
    const template = { id: quest.id, area: quest.area, title: quest.title, flavor: quest.flavor, instruction: quest.instruction,
      rank: quest.rank, estMinutes: quest.estMinutes, energy: 'medium' as const };
    validateQuestCandidate(template, boundary);
    const rows = await this.quests.list();
    if (rows.some((row) => row.quest.offeredOn === quest.offeredOn && row.quest.kind === 'daily' && row.quest.status !== 'skipped' && row.quest.status !== 'rerolled'))
      throw new ServiceError('invalid_transition', 'Daily quests already exist for this date');
    const saved = await this.quests.put(quest, 0);
    if (!saved) throw new ServiceError('stale_revision', 'Generated quest changed before it was saved');
    return saved;
  }

  async upsertCuratedQuest(quest: Quest, expectedRevision: number, boundary: QuestBoundary): Promise<RevisionedQuest> {
    const template = QUEST_LIBRARY.find((item) => item.id === quest.templateId);
    if (!template || expectedRevision !== 0 || quest.source !== 'library' || !/^[A-Za-z0-9_.-]{1,128}$/.test(quest.id) ||
        !['daily', 'weekly', 'side'].includes(quest.kind) || quest.status !== 'offered' ||
        quest.offeredOn !== boundary.date || quest.area !== template.area || quest.title !== template.title ||
        quest.flavor !== template.flavor || quest.instruction !== template.instruction ||
        quest.rank !== template.rank || quest.xp !== RANK_XP[template.rank] ||
        quest.estMinutes !== template.estMinutes || quest.completedAt || quest.reflection ||
        Object.keys(quest).some((key) => !['id', 'templateId', 'source', 'kind', 'area', 'title', 'flavor',
          'instruction', 'rank', 'xp', 'estMinutes', 'why', 'status', 'offeredOn'].includes(key)))
      throw new ServiceError('invalid_arguments', 'Only an unaltered curated quest can be offered');
    validateQuestCandidate(template, boundary);
    const rows = await this.quests.list();
    if (rows.some((row) => row.quest.templateId === template.id && row.quest.offeredOn === quest.offeredOn &&
      row.quest.kind === quest.kind && row.quest.status !== 'skipped' && row.quest.status !== 'rerolled'))
      throw new ServiceError('invalid_transition', 'Curated quest is already offered for this date');
    const saved = await this.quests.put(quest, expectedRevision);
    if (!saved) throw new ServiceError('stale_revision', 'Quest changed before it was saved');
    return saved;
  }

  async saveCheckIn(checkIn: CheckIn, expectedRevision: number): Promise<RevisionedCheckIn> {
    const clean = validateCheckIn(checkIn);
    const saved = await this.checkIns.put(clean, expectedRevision);
    if (!saved) throw new ServiceError('stale_revision', 'Check-in changed before it was saved');
    return saved;
  }

  /** Explicit offered → active transition before proof-backed completion. */
  async activateQuest(questId: string, expectedRevision: number): Promise<RevisionedQuest> {
    const current = await this.quests.get(questId);
    if (!current || current.revision !== expectedRevision) throw new ServiceError('stale_revision', 'Quest changed before activation');
    if (current.quest.status !== 'offered') throw new ServiceError('invalid_transition', 'Only an offered quest can become active');
    const saved = await this.quests.put({ ...current.quest, status: 'active' }, expectedRevision);
    if (!saved) throw new ServiceError('stale_revision', 'Quest changed during activation');
    return saved;
  }

  /** At most two daily rerolls, counted from durable rows for the local date. */
  async rerollQuest(questId: string, expectedRevision: number, replacement: Quest,
    boundary: QuestBoundary): Promise<RevisionedQuest> {
    const current = await this.quests.get(questId);
    if (!current || current.revision !== expectedRevision)
      throw new ServiceError('stale_revision', 'Quest changed before reroll');
    const rows = await this.quests.list();
    const rerollsUsed = rows.filter((row) => row.quest.status === 'rerolled' &&
      row.quest.offeredOn === boundary.date && row.quest.kind === 'daily').length;
    if (current.quest.kind !== 'daily' || current.quest.offeredOn !== boundary.date ||
        replacement.kind !== 'daily' || replacement.id === questId)
      throw new ServiceError('invalid_transition', 'Only a current daily quest can be rerolled');
    validateReroll(current.quest, rerollsUsed, 2);
    const template = QUEST_LIBRARY.find((item) => item.id === replacement.templateId);
    if (!template || replacement.source !== 'library' || replacement.status !== 'offered' ||
        replacement.offeredOn !== boundary.date || !/^[A-Za-z0-9_.-]{1,128}$/.test(replacement.id) ||
        replacement.area !== template.area || replacement.title !== template.title ||
        replacement.flavor !== template.flavor || replacement.instruction !== template.instruction ||
        replacement.rank !== template.rank || replacement.xp !== RANK_XP[template.rank] ||
        replacement.estMinutes !== template.estMinutes || replacement.completedAt || replacement.reflection ||
        Object.keys(replacement).some((key) => !['id', 'templateId', 'source', 'kind', 'area', 'title',
          'flavor', 'instruction', 'rank', 'xp', 'estMinutes', 'why', 'status', 'offeredOn'].includes(key)))
      throw new ServiceError('invalid_arguments', 'Reroll requires an unaltered curated quest');
    const usedTemplates = rows.filter((row) => row.quest.offeredOn === boundary.date)
      .map((row) => row.quest.templateId).filter((id): id is string => !!id);
    if (usedTemplates.includes(template.id))
      throw new ServiceError('invalid_transition', 'Template was already used today');
    validateQuestCandidate(template, { ...boundary, excludedTemplateIds: usedTemplates });
    try {
      const saved = await this.quests.reroll({ ...current.quest, status: 'rerolled' }, expectedRevision, replacement);
      if (!saved) throw new ServiceError('stale_revision', 'Quest changed during reroll');
      return saved;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError('storage_failure', 'Reroll could not be saved');
    }
  }

  async completeQuest(input: CompleteQuestInput): Promise<CompletedQuestResult> {
    const run = Phase2Actions.completionQueue.then(() => this.completeQuestSerial(input));
    Phase2Actions.completionQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private async completeQuestSerial(input: CompleteQuestInput): Promise<CompletedQuestResult> {
    if (Object.keys(input).some((key) => !['questId', 'expectedRevision', 'proofId', 'idempotencyKey',
      'reflection', 'now', 'localDate'].includes(key)) ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(input.proofId) ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(input.idempotencyKey))
      throw new ServiceError('invalid_arguments', 'Completion requires opaque app-owned IDs');
    assertTimestamp(input.now); assertLocalDate(input.localDate);
    const hydrated = await this.hydrate(input.now, input.localDate);
    if (hydrated.recoveryPendingQuestIds.length)
      throw new ServiceError('storage_failure', 'Older quest completions still need XP recovery');
    const existing = await this.quests.get(input.questId);
    if (!existing) throw new ServiceError('not_found', 'Quest was not found');
    const current = existing.quest as StoredQuest;
    if (current.status === 'done') {
      if (current.proofId !== input.proofId) throw new ServiceError('idempotency_conflict', 'Proof differs from completed quest');
      if (!current.completionLocalDate) throw new ServiceError('storage_failure', 'Completion date is missing');
      const completion = await this.progress.completion(input.questId) ??
        await this.progress.recordCompletion(input.questId, current.completionLocalDate!, current.xp, input.now);
      return { quest: existing, completion, progress: await this.progress.hydrate(input.now), idempotentReplay: true };
    }
    if (existing.revision !== input.expectedRevision) throw new ServiceError('stale_revision', 'Quest changed before completion');
    if (current.status !== 'active') throw new ServiceError('invalid_transition', 'Only an active quest can be completed');
    const rows = await this.quests.list();
    const progress = await this.progress.hydrate(input.now);
    const earnedToday = await this.progress.earnedOn(input.localDate);
    const state: QuestState = { quests: rows.map((row) => row.quest),
      totalXp: progress.doc.totalXp, earnedToday, xpDate: input.localDate,
      rerollsUsed: 0, maxRerolls: 0, completedIds: rows.filter((row) => row.quest.status === 'done').map((row) => row.quest.id) };
    // The domain service enforces proof, transition, physical limits and XP bounds here.
    // Persistence below uses repository CAS and a per-quest durable award ledger.
    const evaluator: AtomicStore<QuestState> = { transact: async <T>(context: CommandContext, _fingerprint: string,
      run: (snapshot: Readonly<QuestState>) => { state: QuestState; value: T }): Promise<CommandResult<T>> => {
      if (context.expectedRevision !== String(existing.revision)) throw new ServiceError('stale_revision', 'Quest changed');
      return { value: run(state).value, revision: String(existing.revision + 1), idempotentReplay: false };
    } };
    const evaluated = await new QuestService(evaluator, this.proof).complete(
      { expectedRevision: String(existing.revision), idempotencyKey: input.idempotencyKey },
      { questId: input.questId, proof: { proofId: input.proofId }, reflection: input.reflection,
        now: input.now, localDate: input.localDate });
    const stored: StoredQuest = { ...evaluated.value.quest, completionLocalDate: input.localDate, proofId: input.proofId };
    const saved = await this.quests.put(stored, existing.revision);
    if (!saved) throw new ServiceError('stale_revision', 'Quest changed during completion');
    try {
      const completion = await this.progress.recordCompletion(input.questId, input.localDate, current.xp, input.now);
      return { quest: saved, completion, progress: await this.progress.hydrate(input.now), idempotentReplay: false };
    } catch {
      // The done quest carries its local date and proof ID. hydrate() retries the award.
      throw new ServiceError('storage_failure', 'Completion was saved but XP requires recovery');
    }
  }
}
