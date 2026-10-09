# Buddy: Level Up — Self-Improvement Quests + Personal AI Companion

**Tagline:** Your life, leveled up. A little help every day.

> **How to use this file:** Give it to an AI coding assistant as the project brief. Build in the phases in section 15, one phase per prompt. Section 14 defines a **Hackathon MVP slice**: build that first, since it is the smallest version that shows the whole idea.

---

## 1. Product Summary

Buddy: Level Up combines two ideas:

1. **A Solo Leveling-style self-improvement game.** The user is the "player". Buddy analyzes who they are, shows their stats across areas of life, and hands out personalized **quests** that build real skills and habits. Completing quests earns XP, raises stats, and levels the user up.
2. **A personal AI companion for everyday productivity.** Notes become tasks, reminders and nudges keep the day on track, and "Ask Buddy" helps the user think things through.

The two are one loop: **everyday tasks and quests live in the same list, and the companion is the thing that understands you well enough to pick quests that fit.**

All core AI runs **on the device**. Notes, check-ins, quests, and progress stay on the phone. A one-time **Google sign-in** is required before onboarding (ADR-005). The account identity (name, email, photo) and the **onboarding answers** are backed up to the user's account (ADR-006); the phone copy stays the source of truth. After that first sign-in, the app works fully offline.

### The one-sentence pitch
"Answer a few questions, and a private on-device AI builds you a personal quest board for growing in ways that go beyond the gym, and after one quick sign-in it all works with no internet."

### Who it is for
Students, young professionals, and freelancers who want to grow (skills, discipline, creativity, relationships, money habits) but find generic habit trackers boring and self-help advice too vague.

### Product principles
1. **Quests are personal and varied.** Never just "go to the gym". Quests come from the user's own answers and span many life areas.
2. **Private by default.** Personal content (quests, notes, reflections, check-ins, chat) never leaves the device unless the user shares something. The only cloud data is the sign-in identity (name, email, photo) and the onboarding answers, kept in the user's own account (ADR-005, ADR-006).
3. **Offline-first.** Every core feature works with no connection once the user has signed in once.
4. **Encouraging, never punishing.** No penalty zones, no streak-shame, no "you failed" screens. Missing days pauses progress; it never removes it.
5. **Honest AI.** The AI's analysis is a suggestion to reflect on, not a diagnosis. The user can edit or reject any insight or quest.
6. **Small and focused.** One clear core loop done well beats a long feature list.

---

## 2. Core Loop

```
Welcome → Google sign-in (one time)
      ↓
Onboarding questions
      ↓
On-device AI analysis → Player Profile (stats, strengths, growth areas)
      ↓
Daily Quest Board (3 quests, personalized)
      ↓
Do the quest → complete with a short reflection or proof
      ↓
XP + stat gains + level progress + Buddy's response
      ↓
Daily check-in and weekly review → AI adjusts future quests
      ↺
```

---

## 3. Features

### 3.0 Sign-In (Google) — built
Login is **required** before onboarding (ADR-005). There is no skip or "continue offline" option.

**Flow:** Welcome → **Let's begin** → Sign-in screen → **Continue with Google** → onboarding questions. A user who is already signed in skips the sign-in screen.

**How it works:**
- Supabase Auth with the Google provider, opened in an **in-app browser** (`signInWithOAuth` + `expo-web-browser`) using **PKCE with S256**. Hermes has no WebCrypto, so `expo-crypto` fills in `crypto.getRandomValues` and `crypto.subtle.digest`.
- After a successful login, the profile (id, email, display name, avatar URL, provider) is saved **locally first** (on-device `localStorage`, key `buddy.account.profile`), then **upserted** into Supabase `public.profiles` by id. The upsert is idempotent and safe to retry.
- If the upsert fails (for example, connection drops), the local copy is kept and marked pending. The app retries on the next launch, and Settings shows "not saved to your account yet".
- A returning user's cached session and profile let the app open fully offline.

**States, in Buddy's voice:** idle, waiting for Google, cancelled ("No worries…"), no internet ("Connect once to sign in, then I work offline", with retry), error (with retry), and not configured (button disabled when Supabase env vars are missing).

**Settings → Account:** shows name and email, a pending-sync note when relevant, and **Sign out**. Sign-out clears the local session and cached profile and returns to the welcome screen. It does not delete the cloud row.

**Known limits:**
- The first launch needs internet.
- In Expo Go, login must run over `expo start --tunnel`, because Supabase rejects redirect URLs with an IP-address host (the LAN `exp://192.168.x.x` form).
- The browser-based flow is planned to be replaced by native Google sign-in (`docs/todo/001-native-google-signin.md`).

### 3.1 Onboarding Assessment
A friendly conversational questionnaire (about 5 minutes, skippable parts, saved progress).

**Sections (example questions; the assistant should write 20–25 total, mostly tap-to-answer, a few free-text):**
- **About you:** age range, what you do (student, working, freelancing, other), typical day shape, free time per day.
- **Goals:** "What do you want more of in your life in the next 3 months?" (pick up to 3), "What feels stuck right now?"
- **Self-rating (1–5) across life areas:** focus and discipline, creativity, learning and skills, communication and social, money habits, mental calm, health basics, organization.
- **How you work:** morning or night person, what makes you quit things, what motivates you (rewards, deadlines, people, curiosity).
- **Interests and strengths:** hobbies, things you are proud of, things you avoid.
- **Constraints:** budget (free / low / flexible), privacy comfort, limits Buddy should respect (no physical tasks, no social tasks, topics to avoid).
- **Optional free text:** "Tell Buddy one thing you wish you were better at."

Rules:
- Every question is skippable. Never ask for sensitive data (medical conditions, finances in detail, location beyond optional city, relationships specifics).
- Show a clear privacy line saying where answers go. Current copy: "Your answers are saved to your account so Buddy remembers you." Answers are saved on the device and backed up to the account (ADR-006).

**Saving answers (built, ADR-006):**
- Every tap saves to the device right away, so progress survives a restart. Answers are pushed to the account once per page, on finish, and on launch; offline pushes retry later.
- Stored as raw codes (`"15-30"`, `["focus","calm"]`, `2`, free text), never display labels, with a `questionnaireVersion`.
- On sign-in, the cloud copy is restored when it is newer and there are no unsynced local edits. A user who already finished onboarding lands on Today.
- **AI input:** `buildAssessmentContext()` turns the saved answers into an ordered, labeled list `{ id, section, question, answer, scale? }` for prompts. Use this as the input to the "Analyze profile" job (section 6).
- If answers suggest the user is in serious distress, stop the gamified flow and show a gentle message encouraging them to reach out to trusted people or local support services. Buddy is not a medical or mental-health tool.

### 3.2 AI Analysis and Player Profile
After onboarding, the on-device AI produces a **Player Profile**:
- **Stats (0–100) across 6–8 life areas.** Default set: Focus, Creativity, Knowledge, Social, Finance, Calm, Health, Organization. Starting values come from self-ratings, adjusted by the AI based on free-text answers (and shown as editable).
- **Strengths:** 2–3 things the user already does well.
- **Growth areas:** the 2–3 areas where a small change would help most, each with a one-sentence "why".
- **Suggested focus for the first 30 days.**
- **Player class/title** (playful, e.g. "The Curious Builder", "The Night-Owl Maker"), purely cosmetic, editable.

The profile screen must:
- Show the reasoning in plain language ("You rated Focus low and said phone distractions are your biggest blocker").
- Let the user adjust any stat, remove a growth area, or say "this doesn't feel right", which triggers a re-analysis.
- Label itself clearly as "Buddy's read on you, not a diagnosis".

### 3.3 Quest System
The heart of the app.

**Quest types:**
- **Daily Quests (3 per day):** small, 5–30 minutes. Mix of areas.
- **Weekly Challenge (1):** bigger, multi-step, tied to a growth area.
- **Story Arc / Campaign (optional, later):** a 2–4 week themed path ("The Portfolio Arc", "The Calm Mind Arc") with chained quests.
- **Side Quests:** optional, surprising, playful ("Learn to say 'thank you' in three languages").

**Quest attributes:** title, short story-flavored description, real-world instruction, area(s), difficulty (E–S rank), estimated time, XP value, optional "why this quest" line, completion method.

**The quests must be creative, varied, and personal.** Examples across areas, all to be tailored to the user:
- Creativity: "Describe your morning in six words, then turn it into a doodle."
- Focus: "One 25-minute session on your hardest task, phone in another room."
- Knowledge: "Explain one thing you learned this week to an imaginary 10-year-old, in 5 sentences."
- Social: "Send one thank-you message to someone who helped you this year."
- Finance: "Write down the three biggest things you spent on this week."
- Calm: "Write the three things currently in your head, then circle the one you can act on today."
- Organization: "Clear one drawer or one desktop folder."
- Health (non-gym): "Drink water before coffee today; note how you feel."

Guardrails:
- At most **one** physical quest per day, and none if the user disabled them.
- No quest may involve risk, extreme restriction (diets, fasting, sleep deprivation), spending money the user hasn't opted into, or contacting strangers.
- No quest should depend on a specific diagnosis or give medical or legal advice.
- Difficulty adapts to the user's energy from the check-in: low energy gives easier quests, not zero quests.

**Completion:** simple tap, plus an optional 1–2 line reflection. No photo proof required (privacy). Some quests include a built-in timer or checklist. Honor system by default; XP is capped per day so it is not worth gaming.

**Reroll and control:** the user can swap a quest (limited rerolls per day), mark "too easy / too hard / not relevant", or ban a quest type. This feedback is stored locally and shapes future quests.

### 3.4 XP, Levels, and Stats
- XP per quest scales with difficulty. A daily XP cap keeps pacing healthy.
- Overall **Level** and per-area **stat growth** (stats rise slowly as quests in that area are completed and reflected on).
- Rank titles tied to level brackets (for example E-Rank Beginner up to S-Rank).
- **Level-up moment:** short, delightful animation, Buddy's message, and an unlocked cosmetic (title, theme, or mascot outfit).
- **Streaks are gentle:** a streak shows consecutive active days, but missing a day uses a free "rest day" token instead of resetting. Never show shame messaging.
- Visual style: a clean "system window" aesthetic for the player status screen, inspired by game status screens but warmer and friendlier than dark and ominous. All names and visuals must be original; do not copy characters, logos, or text from any existing franchise.

### 3.5 Daily Check-In
- 30 seconds: mood (5-point), energy (low/medium/high), "what matters most today?".
- Buddy picks or adjusts today's three quests and suggests a realistic day plan.
- Evening reflection (optional): what went well, what to carry over.
- History view with simple weekly trends, stored locally.

### 3.6 Weekly Review and Adaptive Coaching
Once a week (user-triggered or a gentle prompt), the on-device AI summarizes:
- Quests completed, stats that grew, quests skipped or rerolled.
- Patterns ("You complete creative quests most on weekends").
- 1–2 suggested adjustments for next week, which the user accepts or declines.
- Optional re-run of a short mini-assessment every 4 weeks to update the profile.

### 3.7 Notes and Reminders (Companion Layer)
- **Notes replace tasks (ADR-007):** one list, and any note can be checked off. Notes can have a due date, priority, and life area.
- Quick-capture notes with "Organize with Buddy": the AI proposes a due date, priority, and area for a note, shown as a preview the user confirms.
- **Notes due today and quests share the Today screen**, so the user sees one plan, not two apps. A note can optionally be tagged with a life area to earn small XP.
- Local reminders (work offline), snooze, quiet hours, notification categories.
- **Voice capture (built, ADR-008):** tap the mic to start and stop, or hold to talk. Speech becomes text on the device (no cloud fallback, audio never saved) and lands in the note box for editing. Needs a development build; Android 13+ / iOS 17+.

### 3.8 Nudges
- Short, optional suggestions on the Today screen, in widgets, and (rarely) as notifications.
- **Rules engine first, LLM for phrasing only.** Examples: an unfinished quest at the user's usual time, a note due today with no reminder, a low-energy day, a streak at risk.
- **Hard cap: 3 nudge notifications per day**, a minimum of 2 hours apart, none in quiet hours, user can set to 0.
- "Not useful" / "Less like this" feedback, plus "Why am I seeing this?".

### 3.9 Ask Buddy (Companion Chat)
- Chat with the on-device AI about notes, quests, planning, or a stuck feeling.
- Uses locally retrieved context (profile, recent notes, active quests) and shows what it used.
- Can propose actions as tappable cards: create a note, set a reminder, add a custom quest, adjust a goal. Nothing executes without confirmation.
- Short, practical, encouraging responses. Does not give medical, legal, or financial advice and says so when asked.

### 3.10 Share Progress as Story Cards
- Generate 9:16 cards for level-ups, weekly review, a stat milestone, or a reflection the user chooses.
- Preview shows exactly what will be shared; private notes, answers, and quest reflections are excluded unless the user adds them.
- Export as an image through the system share sheet. No in-app social network; sharing never uses the account.

### 3.11 Local Insights (Optional, Post-MVP)
Weather, traffic, news, and emergency-preparedness summaries when online, summarized by the on-device AI with sources and timestamps, cached for offline viewing. Kept out of the hackathon MVP to stay focused.

---

## 4. Screens and Navigation

Bottom tabs:
1. **Today:** greeting, check-in prompt, Daily Quest Board (3 quests), today's notes, next nudge.
2. **Quests:** daily, weekly, side quests, history, (later) story arcs.
3. **Player:** status screen with level, XP, stats radar chart, strengths, growth areas, title, achievements.
4. **Ask Buddy:** chat.
5. **Notes:** capture, check off, search.

Before the tabs: **Welcome → Sign in with Google → Onboarding questions → Analysis reveal → Today**. The entry route sends anyone who is not signed in, or not yet onboarded, to the welcome screen.

Settings (via Player or a gear icon): **account (name, email, sign out)**, preferences, quest rules (blocked types, difficulty, physical quests on/off), notifications, privacy, AI model, data export and delete.

---

## 5. Tech Stack (recommended defaults, swappable)

| Layer | Default | Notes |
|---|---|---|
| App | **React Native (Expo with dev client) + TypeScript** | One codebase for Android and iOS. Widgets and the on-device model need native modules, so use a dev client rather than Expo Go. |
| Navigation | Expo Router | Sign-in lives on the landing page (`/onboarding`); `auth/callback` handles the OAuth redirect. |
| State | Zustand | |
| Database | **SQLite (expo-sqlite) + Drizzle ORM** | All data local. |
| On-device LLM | Small (about 1–2B parameter) 4-bit model behind an `AIEngine` interface (MediaPipe LLM Inference on Android, llama.cpp / MLX bindings on iOS) | Prefer platform AI (Apple Foundation Models, Gemini Nano) where available. |
| Auth (built) | **Supabase Auth, Google provider** via `expo-web-browser` + `expo-linking`, PKCE (S256) with an `expo-crypto` polyfill | Browser flow works in Expo Go; native sign-in planned. See ADR-005. |
| Cloud data (built) | **Supabase Postgres**: `public.profiles`, `public.onboarding_assessments` | Owner-only RLS. Identity plus onboarding answers; other user content stays local. |
| Notifications | expo-notifications (local scheduling) | |
| Animations | Reanimated + Lottie | Level-ups, XP bars. |
| Charts | react-native-svg (radar chart for stats) | |
| Testing | Jest, React Native Testing Library, Maestro | |

Everything AI-related sits behind interfaces (`AIEngine`, `QuestGenerator`, `NotificationScheduler`) so it can be mocked and swapped.

---

## 6. On-Device AI Design

The AI does four jobs. Each has a versioned prompt, a JSON schema, validation, and a non-AI fallback.

| Job | Input | Output (JSON schema) | Fallback if AI unavailable or invalid |
|---|---|---|---|
| **Analyze profile** | Onboarding answers | stats, strengths, growth areas, 30-day focus, title | Deterministic scoring from self-ratings + template text |
| **Generate quests** | Profile, recent quest history, feedback, energy, constraints | list of quests with area, difficulty, time, instruction, why | Pick from a **curated quest library** (see below), filtered and ranked by rules |
| **Weekly review** | Week's completions and reflections | summary, patterns, suggestions | Template-based stats summary |
| **Organize note** | Note text | due date, priority, and area for the note | Rule-based date/checklist parser |

**Important design decisions:**
- **Hybrid quest generation.** Ship a hand-written **curated library of 150+ quest templates** (tagged by area, difficulty, time, energy, tools needed) as the backbone. The LLM personalizes and re-words them and invents new ones within the schema. This keeps quest quality high even on weak devices and guarantees offline use before the model is downloaded.
- **Validation layer.** Every AI-generated quest passes a validator: allowed areas only, time limit, difficulty range, banned-content list (risk, extreme diets, spending, strangers), length limits. Invalid quests are discarded and replaced from the library.
- **Model delivery.** Do not bundle the model in the app binary. Offer a Wi-Fi download with a clear size warning, progress, resume, and delete. The whole app must work with library-and-rules fallbacks until the model is ready.
- **Device tiers.** Detect RAM and chip. Low-end devices use a smaller model or rule-based mode with a visible "Lite mode" label.
- **Runtime hygiene.** Inference on a background thread, cancellable, throttled in low-power or high-thermal states, never run in the background unprompted.
- **Evaluation.** Keep about 30 sample onboarding profiles and check that generated quests are varied, appropriate, and within rules. Re-run on any prompt or model change.
- **Offline everything.** No cloud AI calls. If a cloud fallback is ever added, it must be opt-in and per-request.

---

## 7. Data Model (SQLite)

All IDs UUID; all tables have `created_at`, `updated_at`; soft-delete where relevant (sync-ready later).

- `profile` (id, display_name, title, level, total_xp, rest_tokens, created_at)
- `assessment_answers`: **built differently (ADR-006).** One JSON document per user in localStorage (`buddy.onboarding.<userId>`) shaped as `{ schemaVersion, questionnaireVersion, userId, answers: { [questionId]: { value, answeredAt } }, completedAt, updatedAt, syncedAt }`. It may move into SQLite with the rest of Phase 2.
- `stats` (area, value, updated_at) and `stat_history` (area, value, recorded_at)
- `insights` (id, type: strength | growth_area | focus, text, reason, user_edited)
- `quest_templates` (id, area, title, body, difficulty, est_minutes, energy, tags_json, requires_json)
- `quests` (id, template_id?, source: library | ai | user, title, instruction, area, difficulty, xp, est_minutes, why, status: offered | active | done | skipped | rerolled, offered_on, completed_at?, reflection?)
- `quest_feedback` (id, quest_id, signal: too_easy | too_hard | not_relevant | loved)
- `checkins` (id, date, mood, energy, focus_text, reflection?)
- `weekly_reviews` (id, week_start, summary_json)
- `notes` (checkable, with optional due date, priority, and area; ADR-007), `lists`
- `preferences` (key, value_json): quiet hours, nudge cap, blocked quest types, physical quests on/off, difficulty bias
- `nudges` (id, type, payload_json, shown_at, acted_at?, feedback?)
- `chat_threads`, `chat_messages`
- `achievements` (id, key, unlocked_at)

Optional: database encryption at rest with a key in secure storage, behind a toggle.

**Account (built, ADR-005):**
- On device: the signed-in profile is cached in `localStorage` (`expo-sqlite/localStorage`, key `buddy.account.profile`) with `id, email, displayName, avatarUrl, provider, syncedAt?`. A missing `syncedAt` means the cloud upsert is still pending. The Supabase session is stored in the same on-device storage.
- In the cloud (Supabase): `public.profiles` (id → `auth.users.id`, email, display_name, avatar_url, provider, created_at, updated_at). RLS allows select, insert and update only where `auth.uid() = id`; there is no delete policy. Migration: `apps/buddy/supabase/migrations/20261009120000_create_profiles.sql`.

**Onboarding answers in the cloud (built, ADR-006):** `public.onboarding_assessments` (user_id → `auth.users.id`, `answers jsonb` mirroring the device document, questionnaire_version, completed_at, updated_at, created_at). One row per user, idempotent upsert on `user_id`, owner-only RLS. Migration: `apps/buddy/supabase/migrations/20261009150000_create_onboarding_assessments.sql`.

---

## 8. Life Areas (Stats) — Default Set

| Area | Examples of growth |
|---|---|
| Focus | deep work, reducing distraction, finishing things |
| Creativity | making, writing, design, idea generation |
| Knowledge | learning new skills, reading, explaining ideas |
| Social | communication, gratitude, reaching out, listening |
| Finance | awareness of spending, saving habits, planning |
| Calm | stress awareness, reflection, rest, boundaries |
| Health | sleep, water, movement as one option among many |
| Organization | planning, decluttering, systems |

Areas are user-editable: users can hide an area or add a custom one later.

---

## 9. Gamification Rules (for balance and wellbeing)

- XP per quest: E=10, D=20, C=35, B=55, A=80, S=120 (tune later). Daily XP cap about 200.
- Level thresholds grow gradually so early levels come fast and later levels take weeks.
- Stats rise a small amount per completed quest in that area, with diminishing returns per day.
- **No loss mechanics:** XP and stats never decrease.
- Rest-day tokens (1 earned per 7 active days, max 3 held) protect streaks.
- Celebrate effort and honesty ("Done is better than perfect") rather than perfection.
- Quest rerolls: 2 free per day.

---

## 10. Privacy and Security

- A Google account is required before onboarding (ADR-005). The cloud stores identity data (name, email, photo) and the onboarding answers, including the free-text answer (ADR-006). Quests, notes, reflections, check-ins, and chat are not stored in the cloud.
- Analytics, if added, are opt-in, event-level only, and never include answers, notes, or reflections.
- Just-in-time permission prompts (notifications first; location only if live insights are added).
- Google client secret lives only in the Supabase dashboard. The app bundles only the Supabase URL and **publishable** key.
- Settings → Privacy: view stored data, export everything as JSON, delete all data, delete the AI model, toggle encryption.
- Store privacy labels must remain accurate (name, email, photo, and onboarding answers are collected and linked to the account per ADR-005/006; other user content is not).

---

## 11. Wellbeing and Safety Boundaries

- Buddy is a self-improvement and productivity tool, not therapy, medical advice, or crisis support.
- Detect language in free text or chat suggesting self-harm or crisis. Respond with a calm, caring message, pause quests for that session, and encourage contact with trusted people or local emergency and support services.
- Do not generate quests that encourage risky behavior, harmful dieting, extreme sleep changes, or confrontation.
- Do not present AI analysis as a diagnosis. Include "Buddy's read, not a diagnosis" wording on the profile.
- Age: the app is intended for adults and older teens; if a minor-appropriate version is considered later, it needs its own review.

---

## 12. Visual and Voice Design

- **Voice:** warm, playful, short. "Quest accepted. You've got this." Avoid guilt and pressure.
- **Look:** friendly "status window" visuals, rounded cards, soft glow accents, light and dark themes, a small Buddy mascot with expressions (happy, thinking, celebrating, sleepy).
- **Motion:** XP bar fills, level-up burst, quest-complete sparkle; honor reduced-motion settings.
- **Accessibility:** WCAG AA contrast, screen-reader labels, dynamic font sizing, no information by color alone.
- **Originality:** all names, art, and wording must be original. Use general RPG elements (levels, ranks, stats, quests) but nothing taken from any existing franchise.

---

## 13. Non-Functional Requirements

- Cold start under 2 seconds on a mid-range phone (model loads lazily).
- First launch needs a network connection for sign-in. Every launch after that must work offline.
- Every core screen works offline and without the model (Lite mode).
- Localization-ready from day one (string files; locale-aware dates). English first; test whether the model handles the user's other languages well before promising them.
- Targets: Android 10+ and iOS 17+ (adjust to the chosen model runtime).

---

## 14. Hackathon MVP Slice (build this first)

A narrow slice that shows the whole idea end to end, fully offline:

0. **Google sign-in (built):** required before onboarding; profile saved locally and to Supabase `profiles`. Onboarding answers are saved on the device per tap and backed up to `onboarding_assessments` (built, ADR-006).
1. **Onboarding:** 12–15 questions (tap-based plus one free-text).
2. **On-device analysis:** Player Profile with 6 stats, 2 strengths, 2 growth areas, a title, and the reasoning shown.
3. **Daily Quest Board:** 3 personalized quests from the curated library (about 60 quests for the MVP) with AI personalization of wording and a "why this quest" line.
4. **Complete a quest:** tap, optional one-line reflection, XP gain, stat growth animation, level-up moment.
5. **Check-in that adapts tomorrow's quests** (energy changes difficulty).
6. **Offline proof:** a visible "Running 100% on your device. No internet used" indicator, and a demo where airplane mode stays on.
7. **Ask Buddy (minimal):** chat that answers using the player's profile and active quests.

Explicitly cut from the MVP: widgets, live news and weather, story cards, weekly review, story arcs, and cloud sync of user content. Accounts are no longer cut: Google sign-in is in (ADR-005).

**Demo script (about 3 minutes):** sign in with Google while online (in Expo Go, run `npm run start:tunnel`) → turn on airplane mode → onboarding → watch the AI analysis appear → open today's quests → complete one → level up → ask Buddy "what should I focus on this week?" and get a personalized answer.

---

## 15. Build Plan (one phase per prompt)

**Phase 1 — Foundation:** Expo + TypeScript, tab navigation, theme and design tokens, SQLite + Drizzle schema, preferences, Buddy mascot placeholders.

**Phase 2 — Onboarding and Profile:** assessment questionnaire flow with saved progress, deterministic scoring, Player Profile screen with radar chart, editable stats and insights.

**Phase 3 — Quest Engine (no AI yet):** curated quest library (seed data), rule-based selection by area, difficulty, energy, and constraints, Daily Quest Board, completion flow, XP, levels, stat growth, rerolls, feedback, rest tokens.

**Phase 4 — Check-In and Today:** check-in flow, adaptive difficulty, Today screen merging quests with tasks, evening reflection.

**Phase 5 — On-Device AI:** `AIEngine` interface, model download manager, profile analysis, quest personalization and generation with schema validation and library fallback, Lite mode, Ask Buddy with local context and action cards.

**Phase 6 — Companion Layer:** notes with "organize into tasks", tasks and reminders (local), nudge rules engine with caps and feedback, widgets.

**Phase 7 — Growth and Sharing:** weekly review, story card export, achievements, privacy controls (export, delete, encryption), accessibility and performance pass.

**Phase 8 — Optional Live Insights:** weather, traffic, news, and emergency summaries via a thin proxy, cached for offline.

**Definition of done per phase:** runs on Android and iOS (or the chosen platform), has tests on core logic (scoring, XP math, quest validation, nudge caps), works offline as specified, and matches the section 3 behavior.

---

## 16. Instructions for the AI Coding Assistant

- Follow the phase order. Ask before changing the stack.
- Keep AI, data, and UI layers separate; everything AI sits behind an interface with a non-AI fallback.
- Never execute an AI-proposed action without user confirmation.
- Validate all AI output against a schema and the content rules before showing it.
- Every screen needs empty, loading, and error states written in Buddy's voice.
- Put all user-facing text in a localization file.
- Write seed data (questions, quest library, achievements) as separate typed JSON/TS files that are easy to edit.
- At the end of each phase, list what was built, what was stubbed, and known limitations.

---

## 17. Open Questions

1. **Name:** keep "Buddy: Level Up", or pick a distinct name for the combined app?
2. **Platform for the hackathon demo:** Android only (faster, more flexible on-device runtimes) or both?
3. **Which on-device model and runtime** will the team use, and on which test phone? Test speed and quality on that device early.
4. **Languages:** English only, or also Filipino or other languages at launch? Test small-model quality in each before promising it.
5. **Quest library authoring:** who writes the first 60–150 quests, and what tone and areas should they cover?
6. **Monetization (post-hackathon):** free, one-time purchase, or premium cosmetics and arcs?
7. **Native Google sign-in:** when do we switch from the browser flow to `@react-native-google-signin` + `signInWithIdToken`? This needs a dev build and Android/iOS client IDs (`docs/todo/001-native-google-signin.md`).
8. **Account deletion:** sign-out keeps the `profiles` row. How does a user delete their account and cloud data (Phase 7 export/delete)?
