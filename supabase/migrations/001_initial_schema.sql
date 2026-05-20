-- ─────────────────────────────────────────────────────────────
-- Boltcut — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Users profile (extends Supabase auth.users) ──────────────
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'creator', 'pro', 'team', 'agency')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Workspaces ───────────────────────────────────────────────
create table public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'creator', 'pro', 'team', 'agency')),
  credits_remaining integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create workspace on user creation
create or replace function public.handle_new_workspace()
returns trigger as $$
begin
  insert into public.workspaces (owner_id, name)
  values (new.id, coalesce(new.full_name || '''s workspace', 'My Workspace'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_created_workspace
  after insert on public.users
  for each row execute procedure public.handle_new_workspace();

-- ─── Projects ─────────────────────────────────────────────────
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null default 'Untitled Video',
  script text,
  duration_seconds numeric,
  aspect_ratio text not null default '9:16' check (aspect_ratio in ('16:9', '9:16', '1:1', '4:5')),
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'exported')),
  timeline_data jsonb,
  thumbnail_url text,
  final_video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Assets ───────────────────────────────────────────────────
create table public.assets (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  type text not null check (type in ('video', 'image', 'audio')),
  source text not null check (source in ('uploaded', 'pexels', 'pixabay', 'ai_generated', 'elevenlabs')),
  url text not null,
  duration_seconds numeric,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Brand Kits ───────────────────────────────────────────────
create table public.brand_kits (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null unique,
  logo_url text,
  primary_color text not null default '#F0A500',
  secondary_color text not null default '#FF4D4D',
  accent_color text not null default '#FFFFFF',
  font_heading text not null default 'Inter',
  font_body text not null default 'Inter',
  default_voice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Templates ────────────────────────────────────────────────
create table public.templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  description text,
  thumbnail_url text,
  duration_seconds numeric,
  aspect_ratio text not null default '9:16',
  timeline_data jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── AI Generations (usage tracking + billing) ────────────────
create table public.ai_generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  type text not null check (type in ('script', 'voiceover', 'video_clip', 'caption', 'broll')),
  provider text not null check (provider in ('claude', 'elevenlabs', 'runway', 'whisper', 'pexels', 'hailuo')),
  cost_usd numeric not null default 0,
  credits_used integer not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Comments (collaboration) ─────────────────────────────────
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  timestamp_seconds numeric,
  content text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────
-- Users can only see their own data

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.projects enable row level security;
alter table public.assets enable row level security;
alter table public.brand_kits enable row level security;
alter table public.templates enable row level security;
alter table public.ai_generations enable row level security;
alter table public.comments enable row level security;

-- Users policies
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Workspaces policies
create policy "Users can view own workspaces" on public.workspaces
  for select using (owner_id = auth.uid());

create policy "Users can update own workspaces" on public.workspaces
  for update using (owner_id = auth.uid());

-- Projects policies
create policy "Users can view projects in their workspaces" on public.projects
  for select using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

create policy "Users can insert projects in their workspaces" on public.projects
  for insert with check (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

create policy "Users can update projects in their workspaces" on public.projects
  for update using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

create policy "Users can delete projects in their workspaces" on public.projects
  for delete using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

-- Assets policies
create policy "Users can manage own assets" on public.assets
  for all using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

-- Brand kit policies
create policy "Users can manage own brand kit" on public.brand_kits
  for all using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

-- Templates — public templates viewable by all, private by owner
create policy "Public templates visible to all authenticated users" on public.templates
  for select using (is_public = true or created_by = auth.uid());

-- AI generations — own records only
create policy "Users can view own AI generations" on public.ai_generations
  for select using (user_id = auth.uid());

-- Comments — project members
create policy "Users can view comments on own projects" on public.comments
  for select using (
    project_id in (
      select p.id from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where w.owner_id = auth.uid()
    )
  );

create policy "Users can insert own comments" on public.comments
  for insert with check (user_id = auth.uid());

-- ─── Indexes for performance ──────────────────────────────────
create index idx_projects_workspace_id on public.projects(workspace_id);
create index idx_projects_status on public.projects(status);
create index idx_projects_updated_at on public.projects(updated_at desc);
create index idx_assets_workspace_id on public.assets(workspace_id);
create index idx_ai_generations_user_id on public.ai_generations(user_id);
create index idx_ai_generations_project_id on public.ai_generations(project_id);
create index idx_comments_project_id on public.comments(project_id);
