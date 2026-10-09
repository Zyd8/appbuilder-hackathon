# Architecture Decisions

Record decisions that affect the project’s architecture, privacy, sync behavior, model runtime, or deployment.

## Current Buddy decisions

- [ADR-007: Gemma native runtime](007-buddy-gemma-native-runtime.md) records the `llama.rn` and GGUF choice. Its physical Android and iOS claims remain unverified until device evidence is attached.
- [ADR-010: Device-first player XP](010-player-xp-device-and-cloud.md) owns the XP total and max-XP cloud merge.
- [ADR-011: App-owned agent tools and local memory](011-buddy-agent-runtime-and-local-memory.md) records the bounded tool protocol, confirmation boundary, and local USER/BOT documents.

Two historical files carry the number 007: the runtime ADR and [notes ADR](007-notes-replace-tasks.md). Keep both filenames for existing links; new records use the next free number.

## ADR Naming

Use `ADR-001-<slug>.md`, `ADR-002-<slug>.md`, and so on.

## ADR Template

```markdown
# ADR-NNN: Decision title

- Status: proposed | accepted | superseded | rejected
- Date:
- Owners:

## Context

What problem or constraint led to this decision?

## Decision

What are we choosing?

## Alternatives considered

What else did we evaluate, and why not?

## Consequences

What becomes easier, harder, or newly constrained?

## Verification

How will we prove this decision is implemented correctly?
```
