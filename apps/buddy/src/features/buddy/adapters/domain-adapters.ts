import { randomUUID } from 'expo-crypto';

import { ONBOARDING_PAGES } from '@/data/onboarding-questions';
import { answerValues, buildAssessmentContext } from '@/domain/assessment';
import { pickBuddyNudge } from '@/domain/buddy-nudge';
import { NotesService } from '@/domain/notes-service';
import type { AtomicStore, CommandContext, CommandResult } from '@/domain/service-types';
import { ServiceError } from '@/domain/service-types';
import type { NotesState } from '@/domain/notes-service';
import type { StoredNote } from '@/domain/notes-sync';
import { summarizeStats } from '@/domain/stats';
import type { BuddyReadPorts, BuddyWritePorts, ReadSnapshot } from '@/features/buddy/contracts/domain-ports';
import type { MemoryRepository } from '@/features/buddy/memory/memory-repository';
import { loadAssessment } from '@/lib/assessment-storage';
import type { CheckInRepository } from '@/lib/check-in-repository';
import { loadNotes, writeNotes } from '@/lib/notes-storage';
import type { ProfileRepository } from '@/lib/profile-repository';
import type { ProgressRepository } from '@/lib/progress-repository';
import type { QuestRepository } from '@/lib/quest-repository';
import { progressUserId, type RepositoryNamespace } from '@/lib/repository-namespace';

/** Per-account JS serialization. The state and receipt land in one SQLite-backed localStorage write. */
export class LocalNotesAtomicStore implements AtomicStore<NotesState> {
  private static queues = new Map<string, Promise<unknown>>();

  constructor(private readonly userId: string) {
    if (!userId.trim()) throw new Error('Notes require an account or explicit guest namespace');
  }

  async transact<TResult>(
    context: CommandContext,
    fingerprint: string,
    run: (state: Readonly<NotesState>) => { state: NotesState; value: TResult },
  ): Promise<CommandResult<TResult>> {
    const previous = LocalNotesAtomicStore.queues.get(this.userId) ?? Promise.resolve();
    const result = previous.then(() => this.apply(context, fingerprint, run), () => this.apply(context, fingerprint, run));
    LocalNotesAtomicStore.queues.set(this.userId, result.then(() => undefined, () => undefined));
    return result;
  }

  private apply<TResult>(
    context: CommandContext,
    fingerprint: string,
    run: (state: Readonly<NotesState>) => { state: NotesState; value: TResult },
  ): CommandResult<TResult> {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(context.idempotencyKey))
      throw new ServiceError('invalid_arguments', 'Invalid command key');
    const current = loadNotes(this.userId);
    const receipts = current.agentReceipts ?? {};
    const receipt = receipts[context.idempotencyKey];
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) throw new ServiceError('idempotency_conflict', 'Command key was reused with different arguments');
      return { value: receipt.value as TResult, revision: receipt.revision, idempotentReplay: true };
    }
    const revision = String(current.agentRevision ?? 0);
    if (context.expectedRevision !== revision) throw new ServiceError('stale_revision', 'Notes changed since they were read');
    const effect = run({ notes: current.notes });
    const nextRevision = String(Number(revision) + 1);
    const oldNotes = new Map(current.notes.map((note) => [note.id, note]));
    const notes = effect.state.notes.map((note) => {
      const existing = oldNotes.get(note.id);
      return { ...note, syncedAt: existing?.updatedAt === note.updatedAt ? existing.syncedAt : null } as StoredNote;
    });
    writeNotes({ ...current, notes, agentReceipts: {
      ...receipts,
      [context.idempotencyKey]: { fingerprint, revision: nextRevision, value: effect.value },
    } });
    return { value: effect.value, revision: nextRevision, idempotentReplay: false };
  }
}

export interface DomainAdapterDependencies {
  namespace: RepositoryNamespace;
  profile: ProfileRepository;
  quests: QuestRepository;
  checkIn: CheckInRepository;
  progress: ProgressRepository;
  memory: MemoryRepository;
  model: BuddyReadPorts['model'];
  input: BuddyReadPorts['input'];
  now(): string;
}

/** Typed reads re-open the latest device state for each tool call. */
export function createBuddyReadPorts(deps: DomainAdapterDependencies): BuddyReadPorts {
  const userId = deps.namespace.startsWith('guest:') ? deps.namespace : progressUserId(deps.namespace);
  const snap = <T>(value: T, revision: string, provenance: string, schemaVersion = 1): ReadSnapshot<T> => ({
    value, revision, provenance, schemaVersion, observedAt: deps.now(), durability: 'durable',
  });
  const assessment = () => loadAssessment(userId);
  const notes = () => loadNotes(userId);
  const profile = () => deps.profile.read();
  return {
    onboarding: { context: async () => {
      const doc = assessment();
      return snap(buildAssessmentContext(doc, ONBOARDING_PAGES), doc?.updatedAt ?? 'none', 'on-device assessment');
    } },
    profile: { current: async () => {
      const value = await profile();
      return snap(value, value?.revision ?? 'none', 'deterministic assessment analysis');
    } },
    quests: {
      board: async () => {
        const rows = await deps.quests.list();
        return snap(rows.filter((row) => row.quest.status !== 'done').map((row) => row.quest),
          rows.map((row) => `${row.quest.id}:${row.revision}`).join('|'), 'on-device quest repository');
      },
      history: async () => {
        const rows = await deps.quests.list();
        return snap(rows.filter((row) => row.quest.status === 'done').map((row) => row.quest),
          rows.map((row) => `${row.quest.id}:${row.revision}`).join('|'), 'on-device quest repository');
      },
      detail: async (id) => {
        const row = await deps.quests.get(id);
        return snap(row?.quest ?? null, row ? String(row.revision) : 'none', 'on-device quest repository');
      },
    },
    checkIn: { current: async () => {
      const row = await deps.checkIn.latest();
      return snap(row?.checkIn ?? null, row ? String(row.revision) : 'none', 'on-device check-in repository');
    } },
    progress: {
      xpLevelRank: async () => {
        const row = await deps.progress.hydrate(deps.now());
        return snap({ totalXp: row.doc.totalXp, level: row.level, rank: row.rank }, row.doc.updatedAt, 'ADR-010 device XP');
      },
      statsSummary: async () => {
        const value = await profile();
        return snap(value?.stats ?? null, value?.revision ?? 'none', 'deterministic assessment analysis');
      },
      statsBreakdown: async () => {
        const value = await profile();
        return snap(value ? summarizeStats(value.stats) : null, value?.revision ?? 'none', 'deterministic stat summary');
      },
      orderedInsights: async () => {
        const value = await profile();
        return snap(value?.insights ?? [], value?.revision ?? 'none', 'ordered assessment insights');
      },
      currentNudge: async () => {
        const rows = await deps.quests.list();
        const checkIn = await deps.checkIn.latest();
        const doc = assessment();
        const today = deps.now().slice(0, 10);
        const day = Math.floor(Date.parse(`${today}T00:00:00.000Z`) / 86_400_000);
        return snap(pickBuddyNudge({ answers: answerValues(doc), quests: rows.map((row) => row.quest),
          checkIn: checkIn?.checkIn ?? undefined, day }), `${doc?.updatedAt ?? 'none'}:${rows.length}:${checkIn?.revision ?? 0}`,
        'deterministic nudge');
      },
    },
    notes: {
      list: async () => {
        const doc = notes();
        return snap(doc.notes.filter((note) => !note.deletedAt), String(doc.agentRevision ?? 0), 'on-device notes');
      },
      byId: async (id) => {
        const doc = notes();
        return snap(doc.notes.find((note) => note.id === id && !note.deletedAt) ?? null,
          String(doc.agentRevision ?? 0), 'on-device notes');
      },
    },
    memory: { documents: async () => {
      const docs = await deps.memory.readAll();
      return snap(docs.map(({ name, text }) => ({ name, text })), docs.map((doc) => doc.revision).join('|'), 'app-private local memory');
    } },
    model: deps.model,
    input: deps.input,
  };
}

export function createBuddyWritePorts(namespace: RepositoryNamespace): BuddyWritePorts {
  const userId = namespace.startsWith('guest:') ? namespace : progressUserId(namespace);
  const service = new NotesService(new LocalNotesAtomicStore(userId), { next: randomUUID }, { now: () => new Date().toISOString() });
  return { notes: { create: async (args) => {
    const { expectedRevision, idempotencyKey, ...input } = args;
    const result = await service.create({ expectedRevision, idempotencyKey }, input);
    return { id: result.value.id, revision: result.revision, idempotentReplay: result.idempotentReplay };
  } } };
}
