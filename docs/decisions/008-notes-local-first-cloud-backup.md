# ADR-008: Notes Saved on the Device, Backed Up to the Account, With a Scheduled Date

- Status: accepted
- Date: 2026-10-09
- Scope: `apps/buddy`
- Changes:
  - ADR-006 ("Notes ... stay on the device")
  - ADR-007 (the `due` field)
  - The brief's privacy principle 2 and §10

## Context

Notes were synthetic preview data that lived in memory. They were lost on restart and never reached Supabase. The team wants three things:

- Notes saved for real, on the phone and in the user's account.
- An optional date the user picks from a calendar.
- A calendar view of the notes.

The app must keep working offline (root `AGENTS.md`).

## Decision

### Data

- **`Note`** (`src/domain/types.ts`) has these fields:
  - `id`: a UUID from `expo-crypto`'s `randomUUID`.
  - `body`, `createdAt`, `updatedAt`, `done`, `priority`, `area?`.
  - **`date?`**: the scheduled local date.
  - `deletedAt?`.
- **The scheduled date replaces the due date.** There is no `due` field any more.
  - Today shows notes scheduled for today plus undated notes.
  - The calendar shows only dated notes.
- **On the device (source of truth):** localStorage (`expo-sqlite/localStorage`), key `buddy.notes.<userId>`. It holds `{ schemaVersion, userId, notes: StoredNote[] }`.
  - Each `StoredNote` carries `syncedAt`, which is the `updatedAt` value that last reached the cloud.
  - A note is pending while `syncedAt !== updatedAt`.
  - Every change is written here first.
- **In the cloud (backup):** `public.notes`, one row per note, keyed by `id`. Migration: `apps/buddy/supabase/migrations/20261009180000_create_notes.sql`.
  - RLS lets the owner select, insert and update their own rows. There is no delete policy.
  - The `notes_keep_newest` trigger skips any update whose `updated_at` is older than the stored one, and stops `user_id` from changing.

### Sync (`src/domain/notes-sync.ts`, adapter `src/lib/notes-sync.ts`)

**When it runs:**

- On launch.
- When the app returns to the foreground.
- After sign-in.
- About 1.5 s after the last edit (debounced).
- From the Retry button.

Cycles are queued, so only one runs at a time.

**One cycle:**

1. Pull all of the user's rows.
2. Merge them into the device copy.
3. Upsert pending notes by `id`, in batches of 100.
4. Mark as synced only the versions that were pushed, so edits made during the push stay pending.
5. Remove deletions that are now synced from the device.

**Merge rules (newest `updatedAt` wins, per note):**

- A pending local edit that loses to a newer cloud edit is never silently dropped. If its text differs, it is kept as a new note (a conflict copy), and a toast tells the user.
- A synced local note missing from the cloud is uploaded again.

**Deletes** are soft (`deletedAt`), so other devices learn about them.

**Status in the UI:**

- The Notes tab shows "Backing up your notes…" while a sync runs.
- When changes are still waiting after a failed attempt, it shows a "saved on this phone" notice with a Retry button.
- It never says "synced" before the sync is confirmed.

**Without a session or Supabase settings,** notes are saved on the device only.

### UI

- **Notes tab:** a List / Calendar toggle (`Segmented`).
  - List view shows every note, and its add row has a calendar button.
  - Calendar view shows a month grid with dots on days that have notes, plus the selected day's notes. Adding a note there schedules it for that day.
- **Note rows:** tapping the checkbox toggles done. Tapping the text opens the `note/[id]` sheet, where the user can edit the text and date or delete the note.

## Alternatives considered

- **Cloud first, with local storage as a periodic cache.** Rejected: adding a note offline would fail, which goes against `AGENTS.md`.
- **One JSON document per user, like ADR-006.** Rejected: two devices editing different notes would overwrite each other. Rows per note merge cleanly.
- **Append-only sync events.** More robust, but too much for the MVP. Rows with last-writer-wins, plus a server-side guard, cover retries, duplicate delivery and out-of-order delivery.
- **Keeping both `due` and a scheduled date.** Rejected by the team as confusing.
- **A calendar library** (for example `react-native-calendars`). Not needed. A small month grid built on the Angat tokens is enough, and it adds no dependency.

## Consequences

- **The privacy promise changes.** Note text is now stored in the user's Supabase account. The in-app copy on the login screen and in Settings says so. Quests, reflections, check-ins and chat still stay on the device.
- **Clock skew** between devices affects which edit wins. A done or date change can lose to a newer edit made elsewhere; this is the intended last-writer-wins behavior. Text edits are protected by the conflict copy.
- **There is a small race window:** a push skipped by the trigger is only noticed on the next pull.
- **Every sync pulls all of the user's rows.** That is fine for the MVP; add a server cursor if note counts grow large.
- **Sign-out** clears notes from memory and keeps the device copy. Restart onboarding does not touch notes. Deleting the account and its cloud data is still open (brief §17).
- **The calendar week starts on Sunday.**

## Verification

- Unit tests:
  - `src/domain/__tests__/notes-sync.test.ts`: every merge branch, conflict copies, offline and failed pushes, edits made during a push, idempotent double sync, tombstones, restore on a fresh install, and row validation.
  - `notes.test.ts`: filters and note changes.
  - `dates.test.ts`: the local date (the old `todayIso()` used the UTC date) and the month grid.
- In `apps/buddy`: `npx tsc --noEmit`, `npx expo lint` and `npx jest` all pass.
- Manual checks are listed in `docs/plans/005-notes-sync-and-calendar.md`.
