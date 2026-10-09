-- Onboarding answers backed up to the user's account (ADR-006).
-- One row per user; `answers` mirrors the on-device document ({ questionId: { value, answeredAt } }).
-- The device copy is the source of truth; this row is written by an idempotent upsert on user_id.
create table public.onboarding_assessments (
  user_id uuid primary key references auth.users (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  questionnaire_version integer not null,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.onboarding_assessments enable row level security;

create policy "Assessments are readable by their owner"
  on public.onboarding_assessments for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Assessments are insertable by their owner"
  on public.onboarding_assessments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Assessments are updatable by their owner"
  on public.onboarding_assessments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
