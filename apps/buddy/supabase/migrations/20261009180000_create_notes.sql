-- Notes backed up to the user's account (ADR-008).
-- One row per note; the device copy is the source of truth and pushes with an idempotent upsert on id.
-- Deletes are soft (`deleted_at`) so other devices learn about them; there is no delete policy.
create table public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  done boolean not null default false,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  scheduled_on date,
  area text check (
    area in ('focus', 'creativity', 'knowledge', 'social', 'finance', 'calm', 'health', 'organization')
  ),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index notes_user_id_updated_at_idx on public.notes (user_id, updated_at);

alter table public.notes enable row level security;

create policy "Notes are readable by their owner"
  on public.notes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Notes are insertable by their owner"
  on public.notes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Notes are updatable by their owner"
  on public.notes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Last writer wins by `updated_at`: an older or out-of-order push is skipped instead of
-- overwriting a newer edit from another device. A note never changes owner.
create function public.notes_keep_newest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  new.user_id := old.user_id;
  return new;
end;
$$;

create trigger notes_keep_newest
  before update on public.notes
  for each row
  execute function public.notes_keep_newest();
