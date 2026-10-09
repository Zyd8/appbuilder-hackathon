# Angat: App Overview and Feature Reference

- Status: living reference
- Date: 2026-10-10
- Scope: `apps/buddy`
- Sources: [`buddy-level-up-overview.md`](buddy-level-up-overview.md) (product brief), ADR-005 to ADR-010, plans 004 and 005, and the code on `main`

This file lists what the app does today and what is still planned. Use it to look up a feature, its status, where its data lives, and where its code is. For product intent and rationale, read the brief. For decisions, read the ADRs. If this file and the code disagree, the code is right: fix this file in the same change.

---

## 1. Overview

**Angat** (Filipino: "to rise, to lift up") is a local-first self-improvement app. The user answers a short questionnaire and gets a personal **quest board**: small daily tasks across eight life areas. Completing quests earns XP, raises stats, and levels the user up. **Buddy** is the mascot and on-device AI companion inside the app. The code and folder still use the old project name, "Buddy: Level Up" (`apps/buddy`, slug `buddy-level-up`). In the UI, Angat is the brand and Buddy is the companion (see the [design system](../design/angat-design-system.md)).

**Who it is for:** students, young professionals, and freelancers who want to grow and find generic habit trackers boring.

**Core loop:**

```
Welcome → Google sign-in (once) → Onboarding questions → Player Profile
   → Daily Quest Board → Complete a quest (photo + reflection) → XP, level, stats
   → Daily check-in → (planned) AI adapts tomorrow's quests ↺
```

**Principles:** quests are personal and varied, private by default, offline-first after one sign-in, encouraging and never punishing (XP never goes down), and AI output is a suggestion rather than a diagnosis.

### Status legend

| Label | Meaning |
|---|---|
| **Built** | Works in the app, and data survives a restart where that matters. |
| **Preview** | The screen works, but it runs on synthetic data or in-memory state that is lost on restart. |
| **Unverified** | Code exists and passes tests, but it has not been run end to end on a real device. |
| **Planned** | In the brief, not built yet. |

---

## 2. Feature Summary

| # | Feature | Status | Data kept on the device | Cloud backup |
|---|---|---|---|---|
| 3.1 | Google sign-in and account | Built | Yes | `public.profiles` |
| 3.2 | Onboarding questionnaire | Built | Yes | `public.onboarding_assessments` |
| 3.3 | AI analysis and Player Profile | Preview | No | No |
| 3.4 | Quest board (daily, weekly, side) | Preview | No | No |
| 3.5 | Quest completion with photo | Preview (photo not saved) | No | No |
| 3.6 | XP, levels, ranks, Bambot forms | Built (XP only) | Yes | `public.player_progress` |
| 3.7 | Daily check-in | Preview | No | No |
| 3.8 | Today screen and Buddy nudge | Built (rule-based) | n/a | n/a |
| 3.9 | Notes, calendar, and sync | Built | Yes | `public.notes` |
| 3.10 | Voice capture for notes | Built (dev build only) | n/a | Never |
| 3.11 | Ask Buddy chat (Gemma on device) | Unverified | No (in memory) | Never |
| 3.12 | Player tab, stats, activity grid | Built (on preview stats) | Partly | Partly |
| 3.13 | Share progress cards | Built | n/a | Never |
| 3.14 | Home screen widgets | Built | Snapshot | No |
| 3.15 | Settings | Built (partly placeholder) | Partly | n/a |
| 4 | Planned features | Planned | n/a | n/a |

---

## 3. Features

### 3.1 Google Sign-In and Account — Built

Login is required before onboarding (ADR-005). There is no skip or "continue offline" option.

- **Flow:** Welcome → **Let's begin** → **Continue with Google** → onboarding. A signed-in user skips this screen.
- **How it works:** Supabase Auth with the Google provider, in an in-app browser (`expo-web-browser`), PKCE with S256. `expo-crypto` polyfills WebCrypto for Hermes.
- **Saving:** the profile (id, email, display name, avatar, provider) is saved to the device first (`buddy.account.profile`), then upserted to `public.profiles`. If the upsert fails, the device copy is kept, marked pending, and retried on the next launch.
- **Offline:** a returning user's cached session lets the app open with no network.
- **States:** idle, waiting for Google, cancelled, no internet (with retry), error (with retry), not configured (button disabled when Supabase env vars are missing).
- **Sign-out** (Settings → Account) clears the local session and profile. It does not delete the cloud row.
- **Limits:** the first launch needs internet. In Expo Go, run `npm run start:tunnel`. Native Google sign-in is planned ([`docs/todo/001-native-google-signin.md`](../todo/001-native-google-signin.md)).
- **Code:** `src/lib/auth.ts`, `src/lib/account-storage.ts`, `src/domain/account.ts`, `src/app/onboarding/index.tsx`, `src/app/auth/callback.tsx`.

### 3.2 Onboarding Questionnaire — Built

A conversational questionnaire of **19 questions** across these sections: about you, goals, self-ratings (1–5) per life area, how you work, interests, constraints, and one optional free-text answer.

- Every question is skippable. No sensitive data is asked for.
- Every tap saves to the device right away (`buddy.onboarding.<userId>`), so progress survives a restart.
- Answers are pushed to `public.onboarding_assessments` once per page, on finish, and on launch. Offline pushes retry later (ADR-006).
- Answers are stored as raw codes with a `questionnaireVersion`, never as display labels.
- On sign-in on a new phone, the cloud copy is restored when it is newer and there are no unsynced local edits. A user who already finished lands on Today.
- `buildAssessmentContext()` turns the answers into a labeled list for future AI prompts.
- Settings → **Reset onboarding** clears the answers and restarts the flow.
- **Code:** `src/data/onboarding-questions.ts`, `src/domain/assessment.ts`, `src/lib/assessment-storage.ts`, `src/lib/assessment-sync.ts`, `src/app/onboarding/questions.tsx`.

### 3.3 AI Analysis and Player Profile — Preview

After onboarding, an "analyzing" screen ticks through three steps and reveals the Player Profile: a stats radar, insights (strengths and growth areas), and a player title.

- **Today:** the profile shown is the **synthetic preview profile** (`PREVIEW_PROFILE`). It is not computed from the answers yet.
- **Planned:** deterministic scoring from self-ratings (Phase 2), then on-device AI analysis with editable stats, visible reasoning, a "this doesn't feel right" re-analysis, and the label "Buddy's read on you, not a diagnosis" (Phase 5).
- **Code:** `src/app/onboarding/analysis.tsx`, `src/data/preview.ts`.

### 3.4 Quest Board — Preview

The heart of the app. The **Quests** tab has four segments: **Daily**, **Weekly**, **Side**, and **History**.

- **Daily:** 3 quests per day, 5–30 minutes each, drawn from the curated quest library.
- **Weekly:** 1 bigger challenge. **Side:** optional, playful quests.
- **Quest fields:** title, description, instruction, life area, rank (E–S), estimated minutes, XP, a "why this quest" line.
- **Swap (reroll):** 2 free swaps per day. A swap prefers a quest from the same area and respects the "allow physical quests" setting.
- **Reorder:** hold and drag daily quests on the Today screen.
- **Quest library:** 24 hand-written templates so far (`src/data/quest-library.ts`). The brief targets about 60 for the MVP and 150+ later.
- **Today:** the board, swaps, and history are in memory and reset on restart.
- **Planned:** personalized selection by profile, energy, and feedback; "too easy / too hard / not relevant" feedback; banned quest types; AI rewording with a validator; story arcs.
- **Code:** `src/app/(tabs)/quests.tsx`, `src/app/quest/[id].tsx`, `src/components/quest-row.tsx`, `src/components/quest-details.tsx`, `src/state/preview-store.ts`.

### 3.5 Quest Completion with Photo — Preview

Tap **Complete** → add a **photo from the library** (required) → optional one-line reflection → **Finish quest**.

- **Finish quest** stays disabled until a photo is added (`canSubmitQuest`).
- The photo is held only in the open sheet. It is **not saved, uploaded, or checked by AI**, and the sheet says so.
- On finish: XP is granted (within the daily cap), a toast confirms it, and a level-up message shows when a level is crossed.
- **Open questions:** where the photo is stored, whether on-device AI checks it, and whether some quests are exempt. Any cloud upload needs an ADR first (brief, section 17).
- **Code:** `src/domain/quest-completion.ts`, `src/lib/quest-photo.ts`, `src/components/use-complete-quest.ts`.

### 3.6 XP, Levels, Ranks, and Bambot — Built (XP only)

| Rule | Value |
|---|---|
| XP per rank | E 10, D 20, C 35, B 55, A 80, S 120 |
| Daily XP cap | 200 |
| XP to next level | `round(50 × level^1.5)` |
| Rank titles | E-Rank Beginner (1), D-Rank Explorer (5), C-Rank Adventurer (10), B-Rank Pathfinder (20), A-Rank Trailblazer (35), S-Rank Legend (50) |
| Bambot mascot form | Stage 1 below level 5, stage 2 from level 5, stage 3 from level 10 |

- **No loss mechanics:** XP never decreases.
- **Saving (ADR-010):** only `totalXp` is stored (`buddy.progress.<userId>`). The level is derived. It is backed up to `public.player_progress` through `save_player_xp`, which keeps the larger total, so a stale push can never lower it.
- **Sync:** on launch, on returning to the foreground, on sign-in, and after a quest grants XP.
- **Known gap:** `xpEarnedToday` is in memory, so the daily cap can be exceeded across restarts. The preview profile starts at 120 XP.
- **Planned:** per-area stat growth from quests, rest-day tokens and gentle streaks, the level-up animation, and cosmetic unlocks.
- **Code:** `src/domain/xp.ts`, `src/domain/progress.ts`, `src/lib/progress-storage.ts`, `src/lib/progress-sync.ts`, `src/components/buddy-mascot.tsx`.

### 3.7 Daily Check-In — Preview

A 30-second sheet: mood (1–5), energy (low / medium / high), and "what matters most today?".

- **Today:** saved in memory. Low energy changes the Buddy nudge (section 3.8). It does not change quest difficulty yet.
- **Planned:** energy-adaptive quest difficulty (Phase 4), evening reflection, and history with weekly trends.
- **Code:** `src/app/check-in.tsx`, `src/components/check-in-prompt.tsx`.

### 3.8 Today Screen and Buddy Nudge — Built (rule-based)

Today is the home tab. It shows one plan instead of two apps:

- A greeting with the user's first name and the **on-device badge**.
- A **Buddy banner** whose message is chosen by `pickBuddyNudge()`: all quests done, low energy, a quest that matches one of the user's goals, a goal reminder, or a general message. It is deterministic, offline, and needs no model.
- The check-in prompt.
- The 3 daily quests (drag to reorder).
- **Today's notes:** notes scheduled for today, plus undated notes.

**Planned:** a nudge rules engine with notifications (max 3 per day, 2 hours apart, quiet hours), "Why am I seeing this?", and "less like this" feedback.

**Code:** `src/app/(tabs)/today.tsx`, `src/domain/buddy-nudge.ts`, `src/components/today-banner.tsx`.

### 3.9 Notes, Calendar, and Sync — Built

Notes replace tasks (ADR-007): one list, and any note can be checked off.

- **Notes tab:** a **List / Calendar** toggle. The calendar shows a month grid with dots on days that have notes. Undated notes never appear in the calendar.
- **Create and edit:** add a note with an optional scheduled date. Tap a note to edit its text or date, or to delete it.
- **Saving (ADR-008):** every change is saved on the device first (`buddy.notes.<userId>`), then backed up to `public.notes` on launch, on returning to the app, and shortly after edits.
- **Sync status:** pending changes show "saved on this phone" with **Retry**. The UI never says "synced" until the cloud confirms it.
- **Conflicts:** merged per note, newest wins. A losing text edit is kept as a separate note, and a toast reports it.
- **Deletes are soft** (tombstones), so every device learns about them.
- **Planned:** priority and life-area tags with small XP, "Organize with Buddy", local reminders, and search.
- **Code:** `src/app/(tabs)/notes.tsx`, `src/app/note/new.tsx`, `src/app/note/[id].tsx`, `src/domain/notes.ts`, `src/domain/notes-sync.ts`, `src/lib/notes-sync.ts`.

### 3.10 Voice Capture for Notes — Built (development build only)

Tap the mic to start and stop, or hold to talk (ADR-009).

- Speech becomes text **on the device**. There is no cloud fallback, and audio is never saved.
- The text lands in the note box for editing.
- Needs a development build (not Expo Go), Android 13+ or iOS 17+.
- **Code:** `src/lib/speech-recognizer.ts`, `src/lib/use-voice-input.ts`, `src/domain/voice-input.ts`, `src/components/mic-button.tsx`.

### 3.11 Ask Buddy Chat — Unverified

The **Buddy** tab (the round button in the tab bar) is a chat with an on-device Gemma model (ADR-007 for the Gemma runtime, plan 005 for attachments).

- **Runtime:** `llama.rn` with Gemma 4 GGUF files. **Gemma Default** (E2B, about 3.2 GB) is selected by default. **Gemma Pro** (E4B, about 4.2 GB) is opt-in. A model selector is on screen.
- **Context:** the prompt includes the player's name and title, today's quests, and up to 5 open notes. No cloud calls.
- **Attachments:** up to 3 per message. Images (10 MB) go to the model through its vision projector. `.txt`, `.md`, `.json`, and `.csv` files (10 MB, 100k characters) are read locally as text. Audio and other files can be attached but are labelled "not readable by the model" and are never sent.
- **Errors:** a failed generation shows an error banner and a failed message.
- **Not done:**
  - There is no in-app model download. Model files must already be in the app's internal `files/models` folder.
  - No token streaming: the whole reply arrives at once.
  - Chat history is in memory and is lost on restart.
  - Audio input does not work.
  - Nothing has been built or run on iOS.
  - On-device generation has not been verified end to end on a physical device.
- **Planned:** action cards (create a note, add a quest) that run only after the user confirms, and a disclaimer for medical, legal, or financial questions.
- **Code:** `src/app/(tabs)/buddy.tsx`, `src/features/buddy/` (`types.ts`, `chat-service.ts`, `prompt-builder.ts`, `attachment-service.ts`).

### 3.12 Player Tab, Stats, and Activity — Built (on preview stats)

- **Player banner:** name, title, level, XP bar, and rank.
- **Stats overview:** a radar of the 8 life areas. Tap it for the **stats breakdown** sheet: average, ranked list, strongest and weakest areas, labelled "strong / steady / building" (never "weak").
- **Activity grid:** a GitHub-style grid of quests completed per day.
- **Insights:** strengths and growth areas.
- **Share progress** button (section 3.13) and the settings gear.
- **Note:** the stats and insights come from the preview profile. The level and XP are real (section 3.6).
- **Code:** `src/app/(tabs)/player.tsx`, `src/app/stats.tsx`, `src/domain/stats.ts`, `src/domain/activity.ts`, `src/components/stat-radar.tsx`, `src/components/activity-grid.tsx`.

**Life areas:** Focus, Creativity, Knowledge, Social, Finance, Calm, Health, Organization (`src/data/life-areas.ts`).

### 3.13 Share Progress Cards — Built

Make a 9:16 image for Instagram Stories or any app.

- **Range:** current status, or "day one till now" (Day *n* of the journey, quests done, active days, XP, top area).
- **Chart:** progress bars, stats radar, or "your record".
- **Show or hide:** numbers, chart, name.
- **Style:** transparent overlay (for pasting over a story photo), Angat gradient, or the user's own photo behind the card (the photo stays on the phone).
- **Layout:** top, middle, or bottom placement. Drag to move the card text, pinch to resize, and choose light or dark text.
- **Export:** the system share sheet, or **Save to photos**. Sharing never uses the account. Private notes, answers, and reflections are never included.
- **Code:** `src/app/share-progress.tsx`, `src/domain/progress-share.ts`, `src/components/share-card.tsx`, `src/components/share-charts.tsx`, `src/lib/share-image.ts`.

### 3.14 Home Screen Widgets — Built

Three widgets on Android (`react-native-android-widget`) and iOS (`expo-widgets`):

| Widget | Shows | Tap opens |
|---|---|---|
| **Buddy** (player) | Name, title, level, XP progress | Player tab |
| **Daily Quest** | The next open quest and "n of 3 done" | That quest |
| **Today's Notes** | Up to 5 of today's notes and the open count | Today's notes, or a new note |

- Both platforms draw one shared, pre-formatted snapshot (`buddy.widget.snapshot.v2`) that the app writes. Widgets never call the network.
- **Code:** `src/widgets/`.

### 3.15 Settings — Built (partly placeholder)

Opened from the gear on Today or Player.

| Section | What it does today |
|---|---|
| Account | Name and email, a pending-sync note when needed, **Sign out** |
| Quest rules | **Allow physical quests** toggle (at most one per day). In memory. |
| AI model | Info card only ("Lite mode"). Labelled as coming in Phase 5. Model selection is on the Buddy tab. |
| Cloud backup | Shows whether Supabase is configured |
| Privacy | Short privacy statement |
| Reset | **Reset onboarding** |

**Planned:** quiet hours, notification settings, blocked quest types, difficulty bias, data export (JSON), delete all data and the account, delete the AI model, and encryption at rest.

---

## 4. Planned, Not Built

From the brief, not started yet:

- **Weekly review and adaptive coaching:** a summary, patterns, and suggested adjustments. Mini-assessment every 4 weeks.
- **Local reminders and notifications** (`expo-notifications`), snooze, quiet hours.
- **Achievements** and cosmetic unlocks.
- **Story arcs:** 2–4 week themed quest chains.
- **SQLite persistence** for quests, check-ins, history, and chat (Phase 2). Today these live in memory.
- **Model download manager**, device tiers, and a visible "Lite mode" label.
- **Wellbeing safety:** crisis-language detection that pauses quests and points to support.
- **Local insights** (weather, news), post-MVP and optional.

---

## 5. Where Data Lives

| Data | On the device (source of truth) | Cloud (Supabase, owner-only RLS) | Decision |
|---|---|---|---|
| Account profile | `buddy.account.profile` | `public.profiles` | ADR-005 |
| Onboarding answers | `buddy.onboarding.<userId>` | `public.onboarding_assessments` | ADR-006 |
| Notes | `buddy.notes.<userId>` | `public.notes` (soft deletes) | ADR-007, ADR-008 |
| Total XP | `buddy.progress.<userId>` | `public.player_progress` | ADR-010 |
| Widget snapshot | `buddy.widget.snapshot.v2` | None | — |
| Quests, check-ins, history, chat, settings | Memory only (lost on restart) | None | Phase 2 |
| Quest photos, attachments, voice audio | Not stored, or app-private only | Never | ADR-007, ADR-009 |
| Gemma model files | App internal `files/models` | Never | ADR-007 |

All device keys use `expo-sqlite/localStorage`. Migrations are in `apps/buddy/supabase/migrations/`.

**Offline:** everything except the first sign-in works with no connection. Cloud backups are retried on launch, on returning to the foreground, and after changes. Pending state is shown to the user. Personal content (quests, reflections, check-ins, chat, photos) never leaves the device.

---

## 6. Screens and Navigation

```
/ (entry) ─ not signed in or not onboarded → /onboarding (welcome + sign-in)
          ─ otherwise                      → /(tabs)/today

/onboarding → /onboarding/questions → /onboarding/analysis → /(tabs)/today

Tabs: Today · Quests · Notes · Player · Buddy (round button)

Sheets and pages: /check-in · /quest/[id] · /note/new · /note/[id]
                  /stats · /share-progress · /settings · /auth/callback
```

---

## 7. Tech Stack (as built)

| Layer | Choice |
|---|---|
| App | Expo SDK 57, React Native 0.86, TypeScript, development build (Expo Go for non-native features) |
| Navigation | Expo Router |
| State | Zustand (`src/state/preview-store.ts`) |
| Device storage | `expo-sqlite/localStorage` (JSON documents per user) |
| Cloud | Supabase Auth (Google) and Postgres |
| On-device AI | `llama.rn` with Gemma 4 GGUF (chat only) |
| Speech | `expo-speech-recognition` (on-device only) |
| Widgets | `react-native-android-widget`, `expo-widgets` |
| Graphics | `react-native-svg`, Reanimated, `react-native-view-shot` |
| Tests | Jest (`jest-expo`). Domain tests are in `src/domain/__tests__/`. |

UI follows the [Angat design system](../design/angat-design-system.md). Tokens are in `src/theme/tokens.ts`. All user-facing text is in `src/i18n/en.ts`.

---

## 8. Related Documents

- Product brief: [`buddy-level-up-overview.md`](buddy-level-up-overview.md)
- Build phases: [`../plans/004-buddy-level-up-phases.md`](../plans/004-buddy-level-up-phases.md)
- Notes sync and calendar: [`../plans/005-notes-sync-and-calendar.md`](../plans/005-notes-sync-and-calendar.md)
- Gemma chat and attachments: [`../plans/005-buddy-gemma-attachments.md`](../plans/005-buddy-gemma-attachments.md)
- Decisions: [`../decisions/`](../decisions/) (ADR-004 stack, 005 sign-in, 006 answers, 007 notes and Gemma, 008 notes backup, 009 voice, 010 XP)
- Design system: [`../design/angat-design-system.md`](../design/angat-design-system.md)
