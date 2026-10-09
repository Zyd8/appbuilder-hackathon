# ADR-007: Notes Replace Tasks

- Status: accepted
- Date: 2026-10-09
- Scope: `apps/buddy`
- Changes: the overview's "Notes, Tasks, and Reminders" (section 3.7) and the separate Tasks list in plan 004

## Context

The app had two lists for the same idea: notes (free text) and tasks (checkable, with due date, priority, and area). The Notes tab split them with a Tasks/Notes switch, and Today showed "Today's tasks". The team wants one concept, called **notes**, so the user never has to decide which list something belongs in.

## Decision

- **One type, `Note`** (`src/domain/types.ts`): `id`, `body`, `createdAt`, `done`, `priority` (`low` | `normal` | `high`), optional `due` (ISO date) and `area`. Every note can be checked off. `Task` is removed.
- **Today tab — "Today's notes":** notes due today or with no due date (`notesForToday` in `src/domain/notes.ts`). Adding a note here sets `due` to today.
- **Notes tab:** one list of all notes with a multi-line add row. No Tasks/Notes switch.
- **Order** (`sortNotes`): open notes first, high priority on top, finished notes last, otherwise newest first.
- **Shared UI:** `components/note-list.tsx` on both tabs. `components/task-row.tsx` is deleted.
- **"Organize with Buddy"** is removed from the Notes tab for now. When it returns (Phase 6) it fills in `due`, `priority`, and `area` on notes instead of creating tasks.

## Alternatives considered

- **Keep both types and only rename the UI:** less code churn, but the split stays in the data, the store, and sync later. Rejected because the team asked for one combined concept.
- **Notes with a separate optional checklist inside:** closer to a full productivity app (subtasks), but more UI and data than the MVP needs. Can be added later as a field on `Note`.

## Consequences

- One store slice (`notes`) and two actions (`addNote`, `toggleNote`) instead of four.
- Undated notes always appear on Today. If that gets noisy, a later rule can limit Today to open notes or notes created today.
- Notes are still in memory only (Phase 1). The future SQLite table is `notes`; there is no `tasks` table to migrate because tasks were never persisted.

## Verification

- Unit tests: `src/domain/__tests__/notes.test.ts` (today filter, order, body cleanup).
- Manual: on Today, add a note and check it off; it shows on the Notes tab too, and the reverse.
- `npx tsc --noEmit`, `npx expo lint`, and `npx jest` pass in `apps/buddy`.
