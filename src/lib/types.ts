export type UserRole = 'player' | 'gm' | 'admin';
export type GameStatus = 'open' | 'in_progress' | 'closed';
export type TileType = 'empty' | 'cover' | 'wall' | 'difficult' | 'hazard' | 'water';
export type EnemyType = 'minion' | 'standard' | 'elite' | 'boss';

export interface Profile {
  id: string;
  callsign: string;
  role: UserRole;
  created_at: string;
}

export interface CharacterSheetData {
  action_pts:         boolean[];
  conditions:         { wounded: boolean; stunned: boolean; prone: boolean; poisoned: boolean; untethered: boolean; psy_loud: boolean; };
  caste_passive_used: boolean;
  feats:              { attr: string; name: string; level: string; }[];
  attacks:            { weapon: string; desc: string; range: string; dmg: string; attr: string; lv: string; }[];
  psionics:           { name: string; pips: boolean[]; attr: string; lv: string; }[];
  armor:              string[];
  background:         string;
  credits:            string;
  bag:                string[];
}

export interface Character {
  id: string;
  user_id: string;
  name: string;
  race: string;
  caste: string;
  profession: string;
  strength: number;
  agility: number;
  vigor: number;
  genius: number;
  cunning: number;
  aura: number;
  max_hp: number;
  current_hp: number;
  current_stamina: number;
  backstory: string | null;
  sheet_data: CharacterSheetData;
  created_at: string;
}

export interface Game {
  id: string;
  name: string;
  gm_id: string;
  status: GameStatus;
  max_players: number;
  notes: string | null;
  active_encounter_id?: string | null;
  created_at: string;
  gm_callsign?: string;
  player_count?: number;
}

export interface GamePlayer {
  game_id: string;
  user_id: string;
  character_id: string | null;
  joined_at: string;
}

export interface Campaign {
  id: string;
  gm_id: string;
  title: string;
  description: string | null;
  setting: string | null;
  created_at: string;
}

export interface Scene {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  area_map_url: string | null;
  location: string | null;
  scene_order: number;
  items: string[];
  locations: string[];
  event_hooks: string[];
  created_at: string;
}

export interface Npc {
  id: string;
  scene_id: string;
  name: string;
  race: string | null;
  role: string | null;
  notes: string | null;
  strength: number;
  vigor: number;
  genius: number;
  cunning: number;
  aura: number;
  created_at: string;
}

export interface Encounter {
  id: string;
  scene_id: string;
  title: string;
  description: string | null;
  encounter_order: number;
  battle_bg_floor: string | null;
  battle_bg_wall: string | null;
  map_data: BattleMapData;
  created_at: string;
}

export interface BattleMapRoom {
  id: string;
  points: [number, number][];
  label?: string;
}

export interface BattleMapWall {
  id: string;
  points: [[number, number], [number, number]];
  thickness: number;
  color: string;
}

export interface BattleMapDoor {
  id: string;
  wallId: string;
  t: number;       // 0.0–1.0 position along the wall
  width: number;
}

export interface BattleMapData {
  grid?: number;
  rooms?: BattleMapRoom[];
  walls?: BattleMapWall[];
  doors?: BattleMapDoor[];
}

export interface ScenePath {
  id: string;
  scene_id: string;
  location: string;
  label: string;
  destination_scene_id: string | null;
  created_at: string;
  // joined from scenes table:
  destination_title?: string | null;
}

export interface Enemy {
  id: string;
  encounter_id: string;
  name: string;
  enemy_type: EnemyType | null;
  count: number;
  hp: number;
  sta: number;
  arm: number;
  mov: number;
  current_hp: number | null;
  current_sta: number | null;
  strength: number;
  agility: number;
  vigor: number;
  genius: number;
  cunning: number;
  aura: number;
  notes: string | null;
}

export interface TerrainTile {
  id: string;
  encounter_id: string;
  tile_type: TileType;
  grid_x: number;
  grid_y: number;
  label: string | null;
}

export interface SceneLocation {
  id: string;
  scene_id: string;
  greek_index: number;      // 0=α 1=β 2=γ …
  title: string;
  description: string | null;
  map_x: number | null;     // 0.0–1.0 proportion of image width
  map_y: number | null;     // 0.0–1.0 proportion of image height
  items: string[];
  sort_order: number;
  created_at: string;
}

export interface InitiativeEntry {
  id: string;
  game_id: string;
  label: string;
  initiative: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}
