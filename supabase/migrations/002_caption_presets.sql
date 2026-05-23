-- ─────────────────────────────────────────────────────────────
-- Migration 002 — Caption presets (user-saved caption templates)
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

create table public.caption_presets (
  id           uuid      primary key default uuid_generate_v4(),
  workspace_id uuid      references public.workspaces(id) on delete cascade not null,
  name         text      not null,
  brand_tag    text,            -- e.g. "Nike", "Brand A" — grouping label
  style        jsonb     not null default '{}'::jsonb,  -- full CaptionStyle object
  is_default   boolean   not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_caption_presets_workspace on public.caption_presets(workspace_id);

alter table public.caption_presets enable row level security;

create policy "Users can manage own caption presets" on public.caption_presets
  for all using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );
