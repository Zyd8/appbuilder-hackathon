# ADR-011: App-owned Buddy tools and local memory

- Status: accepted for the implemented code boundary; device runtime evidence pending
- Date: 2026-10-10
- Scope: `apps/buddy`
- Related: ADR-006, ADR-007 (Gemma runtime), ADR-007 (notes), ADR-008, ADR-010

## Context

Buddy needs to answer from real local state and save a note at the user's request. Model output is untrusted: it can choose a supported tool request, but it cannot decide whether a write is valid, confirmed, or durable. Onboarding analysis, quests, check-ins, XP, and notes must also work when no model is installed.

## Decision

- Phase-2 rules and repositories own product state. `profile-analysis.ts` derives versioned stats and ordered insights from a sanitized assessment. SQLite holds profile analysis, quests, check-ins, completions, daily XP, and revisions in explicit account or guest namespaces. ADR-010's device `ProgressDoc` remains the XP total; the SQLite ledger supports cap and crash recovery without creating another total. Existing Supabase XP backup keeps its max-merge rule.
- Phase 5 consumes typed `BuddyReadPorts` and `BuddyWritePorts`. The `AIEngine` adapter loads a verified Gemma 4 GGUF through `llama.rn`; model readiness and initialization are checked before a turn. The registry exposes 15 named reads and only `notes.create` as a write. Later writes remain disabled.
- Native function-call arguments stay raw until the app parses them, rejects duplicate or unknown keys, and enforces the 16 KiB/depth/schema limits. A turn is limited to six tool calls. The model has no general file, path, SQL, network, cloud, shell, widget, share, audio, XP, stat, or assessment mutation tool.
- For `notes.create`, the app checks the current durable notes revision or a matching durable receipt, shows the exact note preview, and waits for user confirmation. The notes domain service performs the local write and retains the idempotency receipt. The app reads the created note back by ID and checks the body, metadata, and revision before reporting success. Rejection, cancellation, write failure, and read-back failure end with an app-owned result before another model final can claim success.
- `USER.md` and `BOT.md` are fixed logical documents in an app-private account/guest namespace. They are bounded and read as lower-priority, untrusted prompt data. The memory repository validates, verifies temporary and backup copies, and recovers a verified backup after an interrupted promotion. Memory has no Supabase adapter and is omitted from widget and share projections.
- Prompt assembly reserves output room and trims complete low-priority units. The presenter separates factual tool summaries from the cleaned final answer; hidden reasoning and raw tool protocol are not user-facing fields.

## Alternatives considered

- Letting the model write storage directly: rejected because confirmation, validation, idempotency, and read-back must remain app-owned.
- Treating prompt instructions as the only policy: rejected because retrieved text and memory are untrusted and can contain instruction-like content.
- Uploading USER/BOT memory with account backup: deferred; no cloud memory contract or user-controlled path exists.

## Consequences and limits

- Phase 2 can be tested without Gemma. A missing or incompatible model is reported as unavailable; the deterministic app remains usable.
- A confirmed write can fail after the underlying storage step. The result then says read-back failed, not that the note was saved. The durable command receipt makes a matching retry safe after restart.
- Current automated tests use fake/scripted engines and local storage adapters. They prove the app-owned protocol and privacy projections, not on-device Gemma quality, native function calling, offline Pixel 9A behavior, Android release readiness, or iOS operation. A physical-device check is still required.

## Verification

- Focused tests: `src/features/buddy/__tests__/buddy-vertical-slice.integration.test.ts`, `tool-contract-matrix.test.ts`, `response-normalization-corpus.test.ts`, `presentation-privacy.test.ts`, and the tool, repository, memory, and widget tests.
- Automated gates: `npm test -- --runInBand`, `npm run typecheck`, `npm run lint`, and `git diff --check` from `apps/buddy`.
- Physical evidence procedure: `docs/testing/buddy-pixel-9a-offline-checklist.md`. No device result is recorded by this ADR.
