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

export interface Character {
  id: string;
  user_id: string;
  name: string;
  race: string;
  caste: string;
  profession: string;
  strength: number;
  vigor: number;
  genius: number;
  cunning: number;
  aura: number;
  max_hp: number;
  current_hp: number;
  backstory: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  name: string;
  gm_id: string;
  status: GameStatus;
  max_players: number;
  notes: string | null;
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
  location: string | null;
  scene_order: number;
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
  created_at: string;
}

export interface Enemy {
  id: string;
  encounter_id: string;
  name: string;
  enemy_type: EnemyType | null;
  count: number;
  strength: number;
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
