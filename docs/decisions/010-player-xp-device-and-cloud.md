# ADR-010: Player XP Saved on the Device and Backed Up to the Account

- Status: accepted
- Date: 2026-10-09
- Scope: `apps/buddy`
- Follows: ADR-006, ADR-008 (same local-first pattern)

## Context

XP and level lived only in memory and reset on every restart, so the level-based Bambot form (1 to 3) could not be tested or kept.

## Decision

- **Stored:** only `totalXp`. The level is derived by `levelFromTotalXp`, so changing the XP curve never needs a data migration.
- **On the device (source of truth):** `localStorage` key `buddy.progress.<userId>` (`ProgressDoc` in `src/domain/progress.ts`).
- **In the cloud (backup):** `public.player_progress`, one row per user, owner-only RLS. Migration: `supabase/migrations/20261009210000_create_player_progress.sql`.
- **Merge rule:** XP is never removed, so copies merge by keeping the larger total. This is idempotent and order-independent, and XP earned offline on another phone is never lost.
- **Writes:** the app calls the `save_player_xp` function, which upserts with `greatest(old, new)`, so a stale or duplicate push cannot lower the total.
- **Sync:** on app launch, when the app returns to the foreground, on sign-in, and after a quest grants XP. A failed push stays pending and retries next time.

## Alternatives considered

- **Storing the level too:** redundant, and it goes stale if the curve changes.
- **Last-write-wins on `updated_at`:** can lower XP when a stale device pushes late.

## Consequences

- Quest completion and check-ins are still in memory, so after a restart the XP is kept but the quest list is not. `xpEarnedToday` also resets, so the daily XP cap can be exceeded across restarts until Phase 2 persists it.
- The preview profile starts at 120 XP, and the saved total is `max(120, saved)`.
- Lowering XP (for example while testing) needs the device copy cleared as well as the cloud row, because the larger total always wins.
- XP is now stored in the user's Supabase account, an addition to ADR-006 and ADR-008.

## Verification

- Unit tests: `src/domain/__tests__/progress.test.ts` (never lowers, merge keeps the larger total, idempotent merge, clamping).
- Manual: apply the migration, sign in, complete a quest, and check `player_progress.total_xp` in Supabase. Edit it above level 5 or 10 and relaunch to see `bambot2` or `bambot3`.
