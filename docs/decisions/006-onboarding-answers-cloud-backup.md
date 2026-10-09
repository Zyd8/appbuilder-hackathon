# ADR-006: Onboarding Answers Saved on the Device and Backed Up to the Account

- Status: accepted
- Date: 2026-10-09
- Scope: `apps/buddy`
- Changes: ADR-005 ("only identity data goes to the cloud") and the brief's "Your answers stay on this device"

## Context

Onboarding answers lived only in memory and were lost on restart. They need to survive restarts, be fed to the on-device AI later (profile analysis, quest personalization), and follow the user to a new phone. The team chose to back them up to Supabase as well as keeping them on the device.

## Decision

- **Format:** one JSON document per user (`AssessmentDoc` in `src/domain/assessment.ts`):
  - `answers: { [questionId]: { value, answeredAt } }`, where `value` is the raw option code (`"15-30"`), a code list, a 1–5 number, or free text. Labels are never stored, so changes to wording or prompts don't invalidate saved data.
  - Also stores `schemaVersion`, `questionnaireVersion`, `completedAt`, `updatedAt` and `syncedAt` (the `updatedAt` that last reached the cloud).
- **On the device (source of truth):** `localStorage` (`expo-sqlite/localStorage`), key `buddy.onboarding.<userId>`. Every tap saves immediately.
- **In the cloud (backup):** `public.onboarding_assessments`, one row per user (`user_id` primary key, `answers jsonb`, `questionnaire_version`, `completed_at`, `updated_at`). RLS lets each user select, insert and update only their own row. Migration: `apps/buddy/supabase/migrations/20261009150000_create_onboarding_assessments.sql`.
- **Sync:**
  - When it runs: on each page's Next/Skip, on finish, on restart onboarding, and on app launch. It does not run on every tap.
  - How: an idempotent upsert on `user_id`, queued so an older version from this device can't land after a newer one. Only the pushed version is marked synced, so edits made during a push stay pending. A failed push stays pending and retries next time.
- **Restore (sign-in, for example on a new phone):** `pickRestore` keeps unsynced local edits, and otherwise takes whichever copy has the newer `updatedAt`. A completed assessment sends the user straight to Today.
- **AI input:** `buildAssessmentContext(doc, ONBOARDING_PAGES)` builds a labeled, ordered JSON list (`{ id, section, question, answer, scale? }`) and drops answers to questions that no longer exist. It is built on demand and never stored.

## Alternatives considered

- **One row per question in Supabase:** easier to query per question, but syncing deletions and resets gets more complex. Postgres `jsonb` is still queryable (`answers->'rate.focus'->>'value'`).
- **SQLite tables on the device:** planned for Phase 2 data (quests, check-ins). For one small document per user, localStorage is simpler and matches the account cache.
- **Device only:** rejected by the team, because answers should survive a reinstall or a new phone.

## Consequences

- The privacy promise changes: onboarding answers, **including the free-text answer (`free.wish`)**, are stored in the user's Supabase account. Notes, quests, reflections, check-ins and chat still stay on the device. (Notes are now backed up too, per ADR-008.) The UI copy (welcome, login, settings) was updated.
- If two devices edit while offline, the last push wins. This is acceptable for a one-time questionnaire, and unsynced local edits are never silently discarded on restore.
- Sign-out keeps the local document. Restart onboarding clears it on the device and in the cloud. Deleting the account and its cloud data is still open (brief §17).
- When the questionnaire changes meaning, bump `QUESTIONNAIRE_VERSION`. Stale question ids are ignored by `buildAssessmentContext`.

## Verification

- Unit tests: `src/domain/__tests__/assessment.test.ts` (set/clear, sync success, failure and mid-push edits, idempotent upsert, row round-trip with invalid cloud data, restore rules, AI context mapping).
- Manual (Expo Go, `npm run start:tunnel`):
  - Answer, force-close, reopen: answers are still there.
  - Finish onboarding: a row appears in `public.onboarding_assessments`.
  - Airplane mode while answering: the push happens on the next launch.
  - Sign in on a second device: answers are restored.
