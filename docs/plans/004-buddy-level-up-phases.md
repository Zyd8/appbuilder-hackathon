# Buddy: Level Up — Phased Build Plan

- Status: active (Phase 1 complete, Phase 2 next)
- Owner: hackathon team
- Product brief: `docs/app/buddy-level-up-overview.md`
- Stack decision: `docs/decisions/004-buddy-stack-expo-supabase.md`
- Code: `apps/buddy/`

## Goal

Ship the brief's Hackathon MVP slice (section 14) as a React Native app, building it in small phases. Phase 1 is a clickable UI shell with synthetic data so the whole app can be seen first. Each later phase swaps one area of preview behavior for the real feature.

## Non-goals (for the hackathon)

Widgets, live news/weather, story cards, story arcs, accounts, and multi-user sync (brief section 14). Supabase backup stays opt-in and arrives last (Phase 7).

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
- Expo Router app: `onboarding` (welcome → 15 questions → analysis reveal), tabs `today`, `quests`, `player`, `buddy`, `notes`, modals `settings` and `check-in`.
- Working in-memory interactions: answer/skip/back through onboarding; complete a quest with an optional one-line reflection (XP granted with the 200/day cap, level-up toast); swap daily quests (2/day); check-in; toggle tasks; capture notes; send chat messages.
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
