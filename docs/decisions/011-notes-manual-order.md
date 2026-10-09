# ADR-011: Manual Note Order with a Fractional Position

- Status: accepted
- Date: 2026-10-10
- Scope: `apps/buddy`
- Follows: ADR-008 (notes saved on the device, backed up to the account)

## Context

Players want to drag notes into their own order and keep it. Notes were shown newest first, and a sync re-sorts the device copy by `createdAt`, so the order of the stored array cannot hold a manual arrangement.

## Decision

- **Field:** each note has an optional `position` (a number; lower sorts first). A note that was never moved has no position and sorts as `-createdAt` in milliseconds, so existing notes keep their newest-first order with no backfill.
- **Moving:** dropping a note gives only that note a new position, halfway between its new neighbours (or 1000 past the end it moved to). Its `updatedAt` is bumped, so it syncs like any other edit. No other note is rewritten, so a reorder never overwrites a concurrent edit to another note on another device.
- **Running out of room:** when two neighbours are too close for a value between them (after dozens of moves into the same gap), the notes in that list are renumbered 1000 apart. This is the only case that changes more than one note.
- **New notes:** take a position above every visible note, so they always land on top.
- **Grouping still wins:** open notes stay above finished ones and high priority above normal. The manual order applies within each group, so a note dragged across a group slides back to its group.
- **Cloud:** `public.notes.position double precision`, nullable. Migration: `supabase/migrations/20261009232827_add_notes_position.sql`. The merge rule is unchanged: the newer `updatedAt` wins per note.
- **One order everywhere:** the position is global, so a move made on Today or in a calendar day keeps the same relative order in the full list.

## Alternatives considered

- **Order stored on the device only (a list of ids):** simpler and needs no migration, but a second phone would not see the arrangement.
- **Renumber the whole list on every drop:** each drop would rewrite every note, so it could overwrite edits made on another device and would upload the whole list.
- **A separate order document:** would need its own merge rule; per-note positions reuse the existing one.

## Consequences

- The app must not ship before the migration is applied: an upsert with an unknown `position` column fails, so note backups stay pending until it exists. No device data is lost. The migration was applied to the project's Supabase database on 2026-10-10.
- Moving a note on one phone while editing the same note's text on another is a normal same-note conflict (ADR-008 rules).
- Renumbering can, rarely, place notes that were hidden in a filtered list (e.g., another day's notes) in a different spot relative to the renumbered ones.

## Verification

- Unit tests: `src/domain/__tests__/notes.test.ts` (`sortNotes` by position, `moveNote` to the middle, top and bottom, only the moved note changes, 80 moves into the same gap, new notes on top) and `notes-sync.test.ts` (position round-trip, invalid positions dropped).
- Manual: apply the migration, drag a note, relaunch the app (order kept offline), then sign in on a second device and check the same order after sync.
