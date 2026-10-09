# Notes: Local-First Saving, Supabase Backup, Scheduled Dates, Calendar View

- Status: active (implemented, manual device checks pending)
- Owner: hackathon team
- Decision: `docs/decisions/008-notes-local-first-cloud-backup.md`
- Code: `apps/buddy/`

## Goal

Make notes real:

- Saved on the phone right away.
- Backed up to Supabase in the background.
- Optionally scheduled for a day picked from a calendar.
- Editable and deletable.
- Viewable as a list or a calendar.

## Non-goals

- Reminders or notifications for a scheduled note (Phase 6).
- A UI for priority and area. The fields stay and are synced.
- A sync on/off toggle. Backup is on for signed-in users, as with ADR-006.
- A locale-aware first day of the week.

## User workflow

1. **Notes tab → List.** Type a note. Optionally tap the calendar button and pick a day; it shows as a chip and can be cleared. Then send.
2. **Notes tab → Calendar.** Days with notes show a dot. Tap a day to see its notes, and add a note scheduled for that day.
3. **Edit or delete.** Tap a note's text to open the sheet. Edit the text, change or clear the date, then save. Or delete it after a confirmation.
4. **Check off.** Tap the round checkbox.
5. **Today.** Today's notes are those scheduled for today plus undated ones. Adding a note on Today schedules it for today.

## Local and offline behavior

- Every change is written to `buddy.notes.<userId>` before anything else. The app works the same with no network.
- Pending changes survive restarts.

## Cloud behavior and sync rules

See ADR-008. In short:

- A sync pulls all rows, merges them, upserts pending notes, then marks only the pushed versions as synced.
- The newest `updatedAt` wins, enforced on the server by the `notes_keep_newest` trigger.
- A losing text edit is kept as a conflict copy, so it is never silently lost.
- Deletes are soft.

## Assumptions

- Notes per user stay small (hundreds), so a full pull on each sync is fine.
- Device clocks are roughly right.

## Risks

- Clock skew changes which edit wins.
- A push skipped by the trigger is only noticed on the next pull.
- The edit sheet holds the text input and the calendar (when open) in a `fitToContents` form sheet. Check it on a small phone with the keyboard open.

## Acceptance criteria

1. With networking off, add, check, edit, schedule and delete notes, then force-close and reopen. Everything is as you left it, and the pending notice shows.
2. Back online, the changes appear in `public.notes`. Deletes set `deleted_at`.
3. After a fresh install and sign-in, all notes that were not deleted come back.
4. A repeated or stale push never duplicates a row or overwrites a newer one.
5. The UI never says "synced" before it is confirmed. Failed changes show a notice with Retry.
6. Undated notes never appear in the calendar. Dated notes appear on their day, and that day shows a dot.
7. Calendar view schedules new notes for the selected day. Today schedules them for today's local date.
8. In UTC+8 between 00:00 and 08:00, "today" is the local day, not yesterday.
9. The calendar uses only Angat tokens, has touch targets of at least 44 pt and accessibility labels, and handles Reduce Motion.

## Verification

Automated, in `apps/buddy`:

```bash
npx tsc --noEmit
npx expo lint
npx jest   # also run with TZ=Asia/Manila
```

Database (Supabase MCP or SQL editor):

- `public.notes` exists with RLS on.
- The security advisors show no notes-related findings.

Still to run (needs a phone, Expo Go with `npm run start:tunnel`):

- Turn on airplane mode and check criterion 1.
- Turn airplane mode off and foreground the app (criterion 2). Check with:

  ```sql
  select id, body, scheduled_on, deleted_at from public.notes order by updated_at desc;
  ```

- Reinstall or use a second device (criterion 3).
- Edit the same note on two devices while offline, then bring both online. The conflict copy and toast appear.
- Calendar: dots, the day filter, adding with the selected date, month navigation, and the "Today" button.
- Turn on Reduce Motion and check that the month change is a plain fade.
- Not yet run: a stale-write test of the trigger (an older `updated_at` upsert is skipped). Run it with synthetic data in a transaction, then roll back.
