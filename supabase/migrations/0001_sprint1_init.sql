-- ============================================================================
-- AL Command — Sprint 1 Database Migration
-- 0001_sprint1_init.sql
--
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- Or via CLI:  supabase db push
--
-- Schema rules:
--   • All timestamps are timestamptz (UTC, with timezone)
--   • All primary keys are client-generated UUID v4
--   • Soft deletes via deleted_at (null = alive)
--   • RLS is enabled and owner-scoped on every table
--   • No embedding/vector column on memory_items yet (added in a later sprint)
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid() fallback
create extension if not exists "uuid-ossp";  -- uuid_generate_v4()

-- ============================================================================
-- TABLE: public.users
-- Mirrors auth.users. Created automatically on signup via trigger.
-- ============================================================================
create table if not exists public.users (
  id           uuid        primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

comment on table public.users is
  'Public user profile. Populated automatically by handle_new_user() trigger.';

-- ============================================================================
-- TABLE: public.projects
-- ============================================================================
create table if not exists public.projects (
  id         uuid        primary key,
  owner_id   uuid        not null references public.users(id) on delete cascade,
  name       text        not null,
  status     text        not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint projects_name_length  check (char_length(name) between 1 and 120),
  constraint projects_status_valid check (status in ('active', 'archived'))
);

create index if not exists projects_owner_status_idx
  on public.projects (owner_id, status)
  where deleted_at is null;

comment on table public.projects is
  'Workspace projects. Soft-deleted via deleted_at.';

-- ============================================================================
-- TABLE: public.tasks
-- ============================================================================
create table if not exists public.tasks (
  id         uuid        primary key,
  owner_id   uuid        not null references public.users(id) on delete cascade,
  project_id uuid        references public.projects(id) on delete set null,
  title      text        not null,
  status     text        not null default 'todo',
  source     text        not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint tasks_title_length  check (char_length(title) between 1 and 280),
  constraint tasks_status_valid  check (status in ('todo', 'done')),
  constraint tasks_source_valid  check (source in ('manual', 'text', 'voice'))
);

create index if not exists tasks_owner_status_idx
  on public.tasks (owner_id, status)
  where deleted_at is null;

create index if not exists tasks_project_idx
  on public.tasks (project_id)
  where deleted_at is null;

comment on table public.tasks is
  'Tasks captured by the owner. project_id NULL = Inbox.';

-- ============================================================================
-- TABLE: public.memory_items
-- Notes only in Sprint 1. Embedding column added in a later sprint.
-- ============================================================================
create table if not exists public.memory_items (
  id         uuid        primary key,
  owner_id   uuid        not null references public.users(id) on delete cascade,
  project_id uuid        references public.projects(id) on delete set null,
  kind       text        not null default 'note',
  content    text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint memory_items_content_length check (char_length(content) between 1 and 5000),
  constraint memory_items_kind_valid     check (kind in ('note'))
);

create index if not exists memory_items_owner_idx
  on public.memory_items (owner_id, created_at desc)
  where deleted_at is null;

create index if not exists memory_items_project_idx
  on public.memory_items (project_id)
  where deleted_at is null;

comment on table public.memory_items is
  'Notes and future AI memory. kind=note in Sprint 1.';

-- ============================================================================
-- TABLE: public.activity_logs
-- Append-only audit trail. Never update or delete rows.
-- ============================================================================
create table if not exists public.activity_logs (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references public.users(id) on delete cascade,
  action     text        not null,   -- e.g. 'project.create', 'task.toggle'
  entity     text,                   -- 'project' | 'task' | 'note'
  entity_id  uuid,                   -- id of the affected row
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_owner_time_idx
  on public.activity_logs (owner_id, created_at desc);

comment on table public.activity_logs is
  'Append-only audit log. Rows are never modified or deleted.';

-- ============================================================================
-- TRIGGER: auto-provision public.users on signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop before recreating to make migration idempotent on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TRIGGER: auto-update updated_at on every UPDATE
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch
  before update on public.tasks
  for each row execute function public.touch_updated_at();

drop trigger if exists memory_items_touch on public.memory_items;
create trigger memory_items_touch
  before update on public.memory_items
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- Policy: owner may read/write their own rows only. Default deny.
-- ============================================================================

alter table public.users         enable row level security;
alter table public.projects      enable row level security;
alter table public.tasks         enable row level security;
alter table public.memory_items  enable row level security;
alter table public.activity_logs enable row level security;

-- users: can only see and update their own profile row
drop policy if exists users_self_policy on public.users;
create policy users_self_policy on public.users
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- projects
drop policy if exists projects_owner_policy on public.projects;
create policy projects_owner_policy on public.projects
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- tasks
drop policy if exists tasks_owner_policy on public.tasks;
create policy tasks_owner_policy on public.tasks
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- memory_items
drop policy if exists memory_items_owner_policy on public.memory_items;
create policy memory_items_owner_policy on public.memory_items
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- activity_logs: owner can read; inserts are the only writes (no update/delete policy)
drop policy if exists activity_logs_owner_read_policy on public.activity_logs;
create policy activity_logs_owner_read_policy on public.activity_logs
  for select
  using (owner_id = auth.uid());

drop policy if exists activity_logs_owner_insert_policy on public.activity_logs;
create policy activity_logs_owner_insert_policy on public.activity_logs
  for insert
  with check (owner_id = auth.uid());

-- ============================================================================
-- VERIFICATION QUERIES (run these after applying to confirm correctness)
-- ============================================================================
-- select table_name, rls_enabled from pg_tables where schemaname = 'public';
-- select * from information_schema.table_constraints
--   where constraint_type = 'CHECK' and table_schema = 'public';
