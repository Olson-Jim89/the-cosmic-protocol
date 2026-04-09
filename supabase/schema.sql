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
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  race         text not null,
  caste        text not null,
  profession   text not null,
  strength     int  not null default 1,
  vigor        int  not null default 1,
  genius       int  not null default 1,
  cunning      int  not null default 1,
  aura         int  not null default 1,
  max_hp       int  not null default 10,
  current_hp   int  not null default 10,
  backstory    text,
  created_at   timestamptz default now()
);

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
  created_at   timestamptz default now()
);

-- ── NPCs ──────────────────────────────────────────────────
create table if not exists public.npcs (
  id         uuid primary key default gen_random_uuid(),
  scene_id   uuid references public.scenes(id)    on delete cascade not null,
  name       text not null,
  race       text,
  role       text,
  notes      text,
  strength   int default 1,
  vigor      int default 1,
  genius     int default 1,
  cunning    int default 1,
  aura       int default 1,
  created_at timestamptz default now()
);

-- ── Encounters ────────────────────────────────────────────
create table if not exists public.encounters (
  id               uuid primary key default gen_random_uuid(),
  scene_id         uuid references public.scenes(id) on delete cascade not null,
  title            text not null,
  description      text,
  encounter_order  int  not null default 0,
  created_at       timestamptz default now()
);

-- ── Enemies (per encounter) ───────────────────────────────
create table if not exists public.enemies (
  id           uuid primary key default gen_random_uuid(),
  encounter_id uuid references public.encounters(id) on delete cascade not null,
  name         text not null,
  enemy_type   text check (enemy_type in ('minion', 'standard', 'elite', 'boss')),
  count        int  not null default 1,
  strength     int  default 1,
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

-- ═══════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════

alter table public.profiles       enable row level security;
alter table public.characters      enable row level security;
alter table public.games           enable row level security;
alter table public.game_players    enable row level security;
alter table public.campaigns       enable row level security;
alter table public.scenes          enable row level security;
alter table public.npcs            enable row level security;
alter table public.encounters      enable row level security;
alter table public.enemies         enable row level security;
alter table public.terrain_tiles   enable row level security;

-- Profiles: anyone can read, owner can write
create policy "profiles_select"  on public.profiles for select using (true);
create policy "profiles_insert"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update"  on public.profiles for update using (auth.uid() = id);

-- Characters: owner only
create policy "chars_select" on public.characters for select using (auth.uid() = user_id);
create policy "chars_insert" on public.characters for insert with check (auth.uid() = user_id);
create policy "chars_update" on public.characters for update using (auth.uid() = user_id);
create policy "chars_delete" on public.characters for delete using (auth.uid() = user_id);

-- Games: any auth user can read; gm_id owns write
create policy "games_select" on public.games for select using (auth.uid() is not null);
create policy "games_insert" on public.games for insert with check (auth.uid() = gm_id);
create policy "games_update" on public.games for update using (auth.uid() = gm_id);
create policy "games_delete" on public.games for delete using (auth.uid() = gm_id);

-- Game players: any auth user can read/insert own row
create policy "gp_select" on public.game_players for select using (auth.uid() is not null);
create policy "gp_insert" on public.game_players for insert with check (auth.uid() = user_id);
create policy "gp_delete" on public.game_players for delete using (auth.uid() = user_id);

-- Campaigns: gm_id owns
create policy "camp_select" on public.campaigns for select using (auth.uid() = gm_id);
create policy "camp_insert" on public.campaigns for insert with check (auth.uid() = gm_id);
create policy "camp_update" on public.campaigns for update using (auth.uid() = gm_id);
create policy "camp_delete" on public.campaigns for delete using (auth.uid() = gm_id);

-- Scenes: gm who owns the campaign
create policy "scene_select" on public.scenes for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.gm_id = auth.uid()));
create policy "scene_insert" on public.scenes for insert
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.gm_id = auth.uid()));
create policy "scene_update" on public.scenes for update
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.gm_id = auth.uid()));
create policy "scene_delete" on public.scenes for delete
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.gm_id = auth.uid()));

-- NPCs: via scene → campaign → gm
create policy "npc_all" on public.npcs for all
  using (exists (
    select 1 from public.scenes s
    join public.campaigns c on c.id = s.campaign_id
    where s.id = scene_id and c.gm_id = auth.uid()
  ));

-- Encounters: via scene → campaign → gm
create policy "enc_all" on public.encounters for all
  using (exists (
    select 1 from public.scenes s
    join public.campaigns c on c.id = s.campaign_id
    where s.id = scene_id and c.gm_id = auth.uid()
  ));

-- Enemies: via encounter → scene → campaign → gm
create policy "enemy_all" on public.enemies for all
  using (exists (
    select 1 from public.encounters e
    join public.scenes s on s.id = e.scene_id
    join public.campaigns c on c.id = s.campaign_id
    where e.id = encounter_id and c.gm_id = auth.uid()
  ));

-- Terrain tiles: same chain
create policy "terrain_all" on public.terrain_tiles for all
  using (exists (
    select 1 from public.encounters e
    join public.scenes s on s.id = e.scene_id
    join public.campaigns c on c.id = s.campaign_id
    where e.id = encounter_id and c.gm_id = auth.uid()
  ));
