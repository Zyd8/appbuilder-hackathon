# Buddy: Level Up — Phased Build Plan

- Status: active (Phase 1 complete, Phase 2 next)
- Owner: hackathon team
- Product brief: `docs/app/buddy-level-up-overview.md`
- Stack decision: `docs/decisions/004-buddy-stack-expo-supabase.md`
- Login decision: `docs/decisions/005-google-login-before-onboarding.md`
- Onboarding answers decision: `docs/decisions/006-onboarding-answers-cloud-backup.md`
- Code: `apps/buddy/`

## Goal

Ship the brief's Hackathon MVP slice (section 14) as a React Native app, building it in small phases. Phase 1 is a clickable UI shell with synthetic data so the whole app can be seen first. Each later phase swaps one area of preview behavior for the real feature.

## Non-goals (for the hackathon)

Widgets, live news/weather, story cards, story arcs, and multi-user sync (brief section 14). Supabase backup of user content stays opt-in and arrives last (Phase 7).

**Change (ADR-005):** a Google account is now required before onboarding. Identity data (id, email, name, photo) goes to Supabase `public.profiles`. **ADR-006:** onboarding answers are also backed up to `public.onboarding_assessments`. Everything else stays on the device.

## Assumptions

- Expo SDK 57; Android is the primary demo device (Pixel 9A was used for `llama.rn` in ADR-003). iOS is kept compatible but not the acceptance target.
- English only at launch.
- All data in fixtures and screenshots is synthetic.

## Phases

The brief's section 15 has been re-sequenced so the UI is visible first and Supabase lands as an opt-in layer.

| Phase | Name | What becomes real | Runs in Expo Go? |
|---|---|---|---|
| **1** | **UI shell (done)** | All screens and navigation, theme, strings file, domain types, XP/level math with tests, seed onboarding questions and 24-quest starter library, Buddy mascot placeholder, optional Supabase client stub. Data is in-memory preview data. | Yes |
| 2 | Local data + onboarding/profile | SQLite schema and repositories (profile, answers, stats, insights, preferences), saved onboarding progress, deterministic scoring from answers → Player Profile, editable stats/insights, "doesn't feel right" re-analysis, distress-language safety stop. State survives restart. | Yes |
| 3 | Quest engine (no AI) | Quest library to ~60, rule-based selection (area, difficulty, energy, constraints, max one physical/day), quest validator, completion persistence, stat growth with diminishing returns, rerolls (2/day), feedback signals, rest tokens and gentle streaks, level-up moment. | Yes |
| 4 | Check-in + Today | Persisted check-ins, energy-adaptive difficulty for tomorrow's quests, evening reflection, history/trends, Today merges quests + tasks. | Yes |
| 5 | On-device AI | `AIEngine` port, `llama.rn` adapter (from `apps/expo-go-sample`), model download manager, profile analysis + quest re-wording with schema validation and library fallback, Lite mode label, Ask Buddy with local context and confirm-before-execute action cards. | No: dev build |
| 6 | Companion layer | Notes → "Organize with Buddy" task proposals, tasks with due dates/subtasks, local reminders (`expo-notifications`), nudge rules engine (max 3/day, 2h apart, quiet hours) with feedback. | Dev build |
| 7 | Opt-in Supabase backup | Sync port + Supabase adapter, user-controlled toggle, idempotent append-only events, visible sync status/conflicts/failures, export and delete-all. | Dev build |
| 8 | Growth and polish | Weekly review, achievements, story card export, accessibility and performance pass, Maestro end-to-end demo script. | Dev build |

## Phase 1 — what was built, stubbed, and limited

**Built**
- Expo Router app: `onboarding` (welcome → 4 grouped pages: Your day, Your goals, Where you are now (8 ratings on one screen), Your rules → analysis reveal; 14 questions total, age question dropped as unneeded personal data), tabs `today`, `quests`, `player`, `buddy`, `notes`, modals `settings` and `check-in`.
- Working in-memory interactions: answer, skip, or go back a page in onboarding; complete a quest with an optional one-line reflection (XP granted with the 200/day cap, level-up toast); swap daily quests (2/day); check-in; toggle tasks; capture notes; send chat messages.
- Design tokens (light/dark), `t()` strings in `src/i18n/en.ts`, life-area icons and colors (always paired with text labels), radar chart (`react-native-svg`).
- Domain: types for the brief's data model, `xp.ts` (rank XP, level curve, daily cap, rank titles) with 9 unit tests.
- `src/lib/supabase.ts`: returns `null` unless env vars are set; Settings reflects that.

**Stubbed (preview only)**
- Player profile and insights are fixed synthetic data, not computed from answers (Phase 2).
- Ask Buddy replies with a fixed preview message (Phase 5).
- "This doesn't feel right" and "Organize with Buddy" are disabled with a "Coming in phase N" label.
- Nudge text is a fixed string (Phase 6).

**Known limitations**
- All state resets on app restart (no persistence yet).
- Mascot and app icons are placeholders.
- Web is not a target; only the Android bundle was verified.
- Not yet run on a physical device in this phase.

## Google login before onboarding (ADR-005) — built

- Welcome → **Let's begin** → `/onboarding/login` (required, no skip) → questions. Already signed-in users skip straight to questions.
- `src/lib/auth.ts`: Supabase OAuth in an in-app browser (PKCE, `expo-web-browser`), a reachability check for a clear offline message, and a retry of pending profile upserts on launch.
- `src/domain/account.ts`: profile mapping, redirect parsing, local-first save (unit-tested).
- `src/lib/account-storage.ts`: cached profile in on-device `localStorage`.
- Supabase migration `apps/buddy/supabase/migrations/20261009120000_create_profiles.sql` (RLS: owner-only select/insert/update), applied to `appbuilders-hackathon`.
- Settings: Account card with sign-out and a "not saved to your account yet" note.

**Limitations:** the first launch needs internet; the browser-based flow should be refactored to native sign-in (`docs/todo/001-native-google-signin.md`); sign-out does not delete the cloud row; onboarding progress is still in memory (Phase 2).

**Manual setup:** Google Cloud Web OAuth client (redirect `https://<project-ref>.supabase.co/auth/v1/callback`) → Supabase Google provider; Supabase redirect URLs `exp://**` and `buddylevelup://**`.

## Saved onboarding answers (ADR-006) — built (part of Phase 2)

- `src/domain/assessment.ts`: versioned answer document, local-first sync with mid-push edit safety, restore rules, and `buildAssessmentContext()` (labeled JSON for the AI). 13 unit tests.
- `src/lib/assessment-storage.ts` (localStorage, `buddy.onboarding.<userId>`) and `src/lib/assessment-sync.ts` (queued Supabase upsert, pull and restore).
- Store: answers save per tap, `onboarded` is derived from `completedAt` (so it survives a restart), sync runs per page, on finish, on restart onboarding and on launch. Login restores the cloud copy and sends finished users to Today.
- Migration `apps/buddy/supabase/migrations/20261009150000_create_onboarding_assessments.sql` applied (owner-only RLS).

**Still Phase 2:** deterministic scoring from these answers into the Player Profile, a resume-at-page indicator, and SQLite for the remaining data.

## Risks and open questions

- On-device model quality and speed on the demo phone (brief open question 3); mitigated by Lite mode and the curated library.
- Who writes the full 60-quest library and in what tone (brief open question 5).
- Final product name (brief open question 1).
- Drizzle vs. plain `expo-sqlite` for Phase 2: decide at the start of Phase 2 and record the choice in an ADR.

## Acceptance criteria per phase

Each phase is done when: core logic has unit tests, `npm run typecheck`, `npm run lint`, and `npm test` pass, the Android bundle exports, the feature works with the phone in airplane mode, and this plan's "built / stubbed / limitations" list is updated.

## Verification (Phase 1)

```bash
cd apps/buddy
npm install
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo start            # scan the QR code in Expo Go
```

Manual: enable airplane mode after the bundle loads → complete onboarding → complete a quest (see the XP toast) → swap a quest → check in → send a chat message → open Settings → restart onboarding.
