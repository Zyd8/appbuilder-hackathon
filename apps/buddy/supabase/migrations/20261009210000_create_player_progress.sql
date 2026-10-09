-- Player XP backed up to the user's account (ADR-010).
-- One row per user. The device copy is the source of truth; XP is never removed,
-- so the row only ever moves up (see save_player_xp).
create table public.player_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.player_progress enable row level security;

create policy "Progress is readable by its owner"
  on public.player_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Progress is insertable by its owner"
  on public.player_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Progress is updatable by its owner"
  on public.player_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The app writes through save_player_xp, which keeps the larger total (idempotent, order-independent).

create function public.save_player_xp(new_total_xp integer)
returns integer
language sql
security invoker
set search_path = ''
as $$
  insert into public.player_progress (user_id, total_xp)
  values ((select auth.uid()), greatest(new_total_xp, 0))
  on conflict (user_id) do update
    set total_xp = greatest(public.player_progress.total_xp, excluded.total_xp),
        updated_at = now()
  returning total_xp;
$$;

revoke all on function public.save_player_xp(integer) from public, anon;
grant execute on function public.save_player_xp(integer) to authenticated;
