-- Manual note order (ADR-011). A fractional sort key: lower sorts first.
-- Null means "never moved"; the app then orders by creation time, newest first.
alter table public.notes
  add column position double precision;
