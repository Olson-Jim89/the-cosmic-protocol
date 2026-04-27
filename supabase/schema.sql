-- ═══════════════════════════════════════════════════════════
-- The Cosmic Protocol — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ────────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  callsign   text not null,
  role       text not null default 'player'
               check (role in ('player', 'gm', 'admin')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup via trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, callsign, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'callsign', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'player')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Characters ────────────────────────────────────────────
create table if not exists public.characters (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  name             text not null,
  race             text not null default '',
  caste            text not null default '',
  profession       text not null default '',
  strength         int  not null default 10,
  agility          int  not null default 10,
  vigor            int  not null default 10,
  genius           int  not null default 10,
  cunning          int  not null default 10,
  aura             int  not null default 10,
  max_hp           int  not null default 10,
  current_hp       int  not null default 10,
  current_stamina  int  not null default 0,
  backstory        text,
  sheet_data       jsonb,
  created_at       timestamptz default now()
);

-- Add missing columns to existing deployments
alter table public.characters add column if not exists agility         int  not null default 10;
alter table public.characters add column if not exists current_stamina int  not null default 0;
alter table public.characters add column if not exists sheet_data      jsonb;

-- ── Games (lobby) ─────────────────────────────────────────
create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  gm_id       uuid references auth.users(id) not null,
  status      text not null default 'open'
                check (status in ('open', 'in_progress', 'closed')),
  max_players int  not null default 4,
  notes       text,
  created_at  timestamptz default now()
);

-- active_encounter_id added after encounters table is created (see below)

create table if not exists public.game_players (
  game_id      uuid references public.games(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  joined_at    timestamptz default now(),
  primary key (game_id, user_id)
);

-- ── Campaigns (GM tool) ───────────────────────────────────
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  gm_id       uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  description text,
  setting     text,
  created_at  timestamptz default now()
);

-- ── Scenes ────────────────────────────────────────────────
create table if not exists public.scenes (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid references public.campaigns(id) on delete cascade not null,
  title        text not null,
  description  text,
  location     text,
  scene_order  int  not null default 0,
  items        jsonb not null default '[]'::jsonb,
  locations    jsonb not null default '[]'::jsonb,
  event_hooks  jsonb not null default '[]'::jsonb,
  created_at   timestamptz default now()
);

-- Add to existing deployments
alter table public.scenes add column if not exists items        jsonb not null default '[]'::jsonb;
alter table public.scenes add column if not exists locations    jsonb not null default '[]'::jsonb;
alter table public.scenes add column if not exists event_hooks  jsonb not null default '[]'::jsonb;
alter table public.scenes add column if not exists area_map_url text;

-- ── Scene Locations (area map pins) ──────────────────────
-- Each pin labelled with a Greek letter: greek_index 0=α 1=β 2=γ …
-- Must be created before npcs (npcs can FK reference a location).
create table if not exists public.scene_locations (
  id          uuid    primary key default gen_random_uuid(),
  scene_id    uuid    references public.scenes(id) on delete cascade not null,
  greek_index int     not null,
  title       text    not null,
  description text,
  map_x       float,              -- 0.0–1.0 proportion of image width
  map_y       float,              -- 0.0–1.0 proportion of image height
  items       jsonb   not null default '[]'::jsonb,
  sort_order  int     not null default 0,
  created_at  timestamptz default now()
);

alter table public.scene_locations enable row level security;

-- ── NPCs ──────────────────────────────────────────────────
create table if not exists public.npcs (
  id          uuid primary key default gen_random_uuid(),
  scene_id    uuid references public.scenes(id) on delete cascade not null,
  location_id uuid references public.scene_locations(id) on delete set null,
  name        text not null,
  race        text,
  role        text,
  notes       text,
  strength    int default 1,
  vigor       int default 1,
  genius      int default 1,
  cunning     int default 1,
  aura        int default 1,
  created_at  timestamptz default now()
);

alter table public.npcs add column if not exists location_id uuid references public.scene_locations(id) on delete set null;

-- ── Encounters ────────────────────────────────────────────
create table if not exists public.encounters (
  id               uuid primary key default gen_random_uuid(),
  scene_id         uuid references public.scenes(id) on delete cascade not null,
  title            text not null,
  description      text,
  encounter_order  int  not null default 0,
  battle_bg_floor  text,
  battle_bg_wall   text,
  map_data         jsonb not null default '{}'::jsonb,
  created_at       timestamptz default now()
);

alter table public.encounters add column if not exists battle_bg_floor text;
alter table public.encounters add column if not exists battle_bg_wall  text;
alter table public.encounters add column if not exists map_data        jsonb not null default '{}'::jsonb;

-- ── Enemies (per encounter) ───────────────────────────────
create table if not exists public.enemies (
  id           uuid primary key default gen_random_uuid(),
  encounter_id uuid references public.encounters(id) on delete cascade not null,
  name         text not null,
  enemy_type   text check (enemy_type in ('minion', 'standard', 'elite', 'boss')),
  count        int  not null default 1,
  hp           int  default 0,
  sta          int  default 0,
  arm          int  default 0,
  mov          int  default 25,
  current_hp   int  default null,
  current_sta  int  default null,
  strength     int  default 1,
  agility      int  default 1,
  vigor        int  default 1,
  genius       int  default 1,
  cunning      int  default 1,
  aura         int  default 1,
  notes        text
);

-- ── Terrain Tiles (battlefield per encounter) ─────────────
create table if not exists public.terrain_tiles (
  id           uuid primary key default gen_random_uuid(),
  encounter_id uuid references public.encounters(id) on delete cascade not null,
  tile_type    text not null default 'empty'
                 check (tile_type in ('empty','cover','wall','difficult','hazard','water')),
  grid_x       int  not null,
  grid_y       int  not null,
  label        text,
  unique (encounter_id, grid_x, grid_y)
);

-- active_encounter_id on games (encounters must already exist above)
alter table public.games add column if not exists active_encounter_id uuid references public.encounters(id) on delete set null;
alter table public.game_players add column if not exists callsign text;

-- ═══════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════

alter table public.profiles          enable row level security;
alter table public.characters         enable row level security;
alter table public.games              enable row level security;
alter table public.game_players       enable row level security;
alter table public.campaigns          enable row level security;
alter table public.scenes             enable row level security;
alter table public.npcs               enable row level security;
alter table public.encounters         enable row level security;
alter table public.enemies            enable row level security;
alter table public.terrain_tiles      enable row level security;
alter table public.scene_locations    enable row level security;
alter table public.scene_paths        enable row level security;
alter table public.initiative_entries enable row level security;

-- Profiles: anyone can read, owner can write
do $$ begin create policy "profiles_select" on public.profiles for select using (true);                       exception when duplicate_object then null; end $$;
do $$ begin create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);      exception when duplicate_object then null; end $$;
do $$ begin create policy "profiles_update" on public.profiles for update using (auth.uid() = id);            exception when duplicate_object then null; end $$;

-- Characters: owner only
do $$ begin create policy "chars_select" on public.characters for select using (auth.uid() = user_id);       exception when duplicate_object then null; end $$;
do $$ begin create policy "chars_insert" on public.characters for insert with check (auth.uid() = user_id);  exception when duplicate_object then null; end $$;
do $$ begin create policy "chars_update" on public.characters for update using (auth.uid() = user_id);       exception when duplicate_object then null; end $$;
do $$ begin create policy "chars_delete" on public.characters for delete using (auth.uid() = user_id);       exception when duplicate_object then null; end $$;

-- Games: any auth user can read; gm_id owns write
do $$ begin create policy "games_select" on public.games for select using (auth.uid() is not null);          exception when duplicate_object then null; end $$;
do $$ begin create policy "games_insert" on public.games for insert with check (auth.uid() = gm_id);         exception when duplicate_object then null; end $$;
do $$ begin create policy "games_update" on public.games for update using (auth.uid() = gm_id);              exception when duplicate_object then null; end $$;
do $$ begin create policy "games_delete" on public.games for delete using (auth.uid() = gm_id);              exception when duplicate_object then null; end $$;

-- Game players: any auth user can read/insert own row
do $$ begin create policy "gp_select" on public.game_players for select using (auth.uid() is not null);      exception when duplicate_object then null; end $$;
do $$ begin create policy "gp_insert" on public.game_players for insert with check (auth.uid() = user_id);   exception when duplicate_object then null; end $$;
do $$ begin create policy "gp_delete" on public.game_players for delete using (auth.uid() = user_id);        exception when duplicate_object then null; end $$;

-- ── Game Messages (lobby chat) ────────────────────────────
create table if not exists public.game_messages (
  id         bigserial primary key,
  game_id    uuid references public.games(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  callsign   text not null,
  body       text not null,
  created_at timestamptz default now()
);

alter table public.game_messages enable row level security;

-- Only members of the game can read/insert messages
do $$ begin
  create policy "gm_msg_select" on public.game_messages for select
    using (exists (select 1 from public.game_players gp where gp.game_id = game_id and gp.user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "gm_msg_insert" on public.game_messages for insert
    with check (auth.uid() = user_id and exists (select 1 from public.game_players gp where gp.game_id = game_id and gp.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin alter publication supabase_realtime add table public.game_messages; exception when others then null; end $$;

-- Campaigns: gm_id owns
do $$ begin create policy "camp_select" on public.campaigns for select using (auth.uid() = gm_id);           exception when duplicate_object then null; end $$;
do $$ begin create policy "camp_insert" on public.campaigns for insert with check (auth.uid() = gm_id);       exception when duplicate_object then null; end $$;
do $$ begin create policy "camp_update" on public.campaigns for update using (auth.uid() = gm_id);            exception when duplicate_object then null; end $$;
do $$ begin create policy "camp_delete" on public.campaigns for delete using (auth.uid() = gm_id);            exception when duplicate_object then null; end $$;

-- Scenes: gm who owns the campaign
do $$ begin
  create policy "scene_select" on public.scenes for select
    using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.gm_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "scene_insert" on public.scenes for insert
    with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.gm_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "scene_update" on public.scenes for update
    using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.gm_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "scene_delete" on public.scenes for delete
    using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.gm_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- NPCs: via scene → campaign → gm
do $$ begin
  create policy "npc_all" on public.npcs for all
    using (exists (
      select 1 from public.scenes s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = scene_id and c.gm_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- Encounters: via scene → campaign → gm
do $$ begin
  create policy "enc_all" on public.encounters for all
    using (exists (
      select 1 from public.scenes s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = scene_id and c.gm_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- Enemies: via encounter → scene → campaign → gm
do $$ begin
  create policy "enemy_all" on public.enemies for all
    using (exists (
      select 1 from public.encounters e
      join public.scenes s on s.id = e.scene_id
      join public.campaigns c on c.id = s.campaign_id
      where e.id = encounter_id and c.gm_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- Terrain tiles: same chain
do $$ begin
  create policy "terrain_all" on public.terrain_tiles for all
    using (exists (
      select 1 from public.encounters e
      join public.scenes s on s.id = e.scene_id
      join public.campaigns c on c.id = s.campaign_id
      where e.id = encounter_id and c.gm_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ===============================================================
-- Character Sheet Extended Columns (run once to migrate)
-- ===============================================================

-- Add agility stat (was missing from original schema)
alter table public.characters
  add column if not exists agility int not null default 10;

-- Add current stamina tracking
alter table public.characters
  add column if not exists current_stamina int not null default 0;

-- Full sheet data blob (feats, attacks, armor, psionics, bag, background, credits, conditions)
alter table public.characters
  add column if not exists sheet_data jsonb not null default '{}'::jsonb;

-- Fix existing column defaults to match sheet base value of 10
alter table public.characters alter column strength     set default 10;
alter table public.characters alter column vigor        set default 10;
alter table public.characters alter column genius       set default 10;
alter table public.characters alter column cunning      set default 10;
alter table public.characters alter column aura         set default 10;
alter table public.characters alter column max_hp       set default 10;
alter table public.characters alter column current_hp   set default 10;

-- ── Scene Paths ───────────────────────────────────────────
-- Each path belongs to a location within a scene and optionally links to a destination scene.
create table if not exists public.scene_paths (
  id                   uuid primary key default gen_random_uuid(),
  scene_id             uuid references public.scenes(id) on delete cascade not null,
  location             text not null,
  label                text not null,
  destination_scene_id uuid references public.scenes(id) on delete set null,
  created_at           timestamptz default now()
);

alter table public.scene_paths enable row level security;

do $$ begin
  create policy "path_all" on public.scene_paths for all
    using (exists (
      select 1 from public.scenes s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = scene_id and c.gm_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── Initiative Tracker ───────────────────────────────────
create table if not exists public.initiative_entries (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid references public.games(id) on delete cascade not null,
  label      text not null,
  initiative int  not null default 0,
  is_active  boolean not null default false,
  sort_order int  not null default 0,
  created_at timestamptz default now()
);

alter table public.initiative_entries enable row level security;

-- Anyone authenticated can read; only the GM of the game can write
do $$ begin create policy "init_select" on public.initiative_entries for select using (auth.uid() is not null); exception when duplicate_object then null; end $$;
do $$ begin
  create policy "init_insert" on public.initiative_entries for insert
    with check (exists (select 1 from public.games g where g.id = game_id and g.gm_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "init_update" on public.initiative_entries for update
    using (exists (select 1 from public.games g where g.id = game_id and g.gm_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "init_delete" on public.initiative_entries for delete
    using (exists (select 1 from public.games g where g.id = game_id and g.gm_id = auth.uid()));
exception when duplicate_object then null; end $$;

do $$ begin alter publication supabase_realtime add table public.initiative_entries; exception when others then null; end $$;
