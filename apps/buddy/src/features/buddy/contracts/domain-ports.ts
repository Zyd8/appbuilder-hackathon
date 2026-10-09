import type { CheckIn, Insight, Note, ProfileAnalysis, Quest, StatBlock } from '../../../domain/types';
import type { Durability, NotesCreateArguments } from './tool-protocol';

export interface ReadSnapshot<T> {
  value: T;
  revision: string;
  observedAt: string;
  provenance: string;
  durability: Durability;
  schemaVersion: number;
}

export interface OnboardingReadPort { context(): Promise<ReadSnapshot<unknown>> }
export interface ProfileReadPort { current(): Promise<ReadSnapshot<ProfileAnalysis | null>> }
export interface QuestReadPort {
  board(): Promise<ReadSnapshot<Quest[]>>;
  history(): Promise<ReadSnapshot<Quest[]>>;
  detail(id: string): Promise<ReadSnapshot<Quest | null>>;
}
export interface CheckInReadPort { current(): Promise<ReadSnapshot<CheckIn | null>> }
export interface ProgressReadPort {
  xpLevelRank(): Promise<ReadSnapshot<{ totalXp: number; level: number; rank: string }>>;
  statsSummary(): Promise<ReadSnapshot<StatBlock | null>>;
  statsBreakdown(): Promise<ReadSnapshot<unknown>>;
  orderedInsights(): Promise<ReadSnapshot<Insight[]>>;
  currentNudge(): Promise<ReadSnapshot<unknown>>;
}
export interface NotesReadPort {
  list(): Promise<ReadSnapshot<Note[]>>;
  byId(id: string): Promise<ReadSnapshot<Note | null>>;
}
export interface MemoryReadPort { documents(): Promise<ReadSnapshot<readonly { name: 'USER.md' | 'BOT.md'; text: string }[]>> }
export interface ModelStatusPort { status(): Promise<ReadSnapshot<unknown>> }
export interface InputCapabilitiesPort { capabilities(): Promise<ReadSnapshot<{ text: boolean; image: boolean; audio: false }>> }

export interface BuddyReadPorts {
  onboarding: OnboardingReadPort;
  profile: ProfileReadPort;
  quests: QuestReadPort;
  checkIn: CheckInReadPort;
  progress: ProgressReadPort;
  notes: NotesReadPort;
  memory: MemoryReadPort;
  model: ModelStatusPort;
  input: InputCapabilitiesPort;
}

export interface CreatedNote {
  id: string;
  revision: string;
  idempotentReplay: boolean;
}
export interface NotesCommandPort { create(args: NotesCreateArguments): Promise<CreatedNote> }
export interface BuddyWritePorts { notes: NotesCommandPort }

export interface BuddyClock { now(): string }
export interface BuddyIdSource { next(): string }
export interface BuddyAuditPort {
  record(event: { callId: string; tool: string; outcome: string; observedAt: string }): void;
}
