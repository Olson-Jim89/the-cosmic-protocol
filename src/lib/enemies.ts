export type EnemyFaction =
  | "Federation Renegades"
  | "Daimaken Militarium"
  | "Void Pirates"
  | "Aliens & Independents"
  | "Wild Creatures";

export type EnemyCategory = "Infantry" | "Vanguard" | "Leader";

export interface EnemyTemplate {
  name: string;
  faction: EnemyFaction;
  category: EnemyCategory;
  hp: number;
  sta: number;
  arm: number;
  mov: number;
  strength: number;
  agility: number;
  vigor: number;
  genius: number;
  cunning: number;
  aura: number;
}

/** Maps rulebook category to the encounter enemy_type field. */
export const CATEGORY_TO_TYPE: Record<EnemyCategory, string> = {
  Infantry: "standard",
  Vanguard: "elite",
  Leader:   "boss",
};

export const ENEMY_ROSTER: EnemyTemplate[] = [
  // ── Federation Renegades ───────────────────────────────────────────────
  { name: "Rogue Enforcer",         faction: "Federation Renegades", category: "Infantry", hp: 60,  sta: 50,  arm: 3, mov: 25, strength: 13, agility: 13, vigor: 13, genius: 12, cunning: 13, aura: 12 },
  { name: "Separatist Sharpshooter",faction: "Federation Renegades", category: "Vanguard", hp: 45,  sta: 40,  arm: 1, mov: 30, strength: 12, agility: 15, vigor: 12, genius: 13, cunning: 14, aura: 12 },
  { name: "Corrupt Intel Agent",    faction: "Federation Renegades", category: "Leader",   hp: 40,  sta: 35,  arm: 0, mov: 35, strength: 12, agility: 13, vigor: 12, genius: 15, cunning: 15, aura: 14 },
  { name: "Federation Deserter",    faction: "Federation Renegades", category: "Infantry", hp: 70,  sta: 60,  arm: 1, mov: 30, strength: 14, agility: 13, vigor: 14, genius: 12, cunning: 13, aura: 11 },
  { name: "Black-Site Warden",      faction: "Federation Renegades", category: "Leader",   hp: 80,  sta: 70,  arm: 6, mov: 20, strength: 14, agility: 12, vigor: 14, genius: 13, cunning: 14, aura: 14 },
  { name: "Militia Firebrand",      faction: "Federation Renegades", category: "Vanguard", hp: 55,  sta: 50,  arm: 1, mov: 30, strength: 14, agility: 14, vigor: 13, genius: 12, cunning: 13, aura: 13 },

  // ── Daimaken Militarium ────────────────────────────────────────────────
  { name: "Militarium Footsoldier", faction: "Daimaken Militarium",  category: "Infantry", hp: 65,  sta: 55,  arm: 3, mov: 25, strength: 14, agility: 12, vigor: 14, genius: 12, cunning: 12, aura: 12 },
  { name: "Frost Legion Berserker", faction: "Daimaken Militarium",  category: "Vanguard", hp: 80,  sta: 75,  arm: 4, mov: 30, strength: 16, agility: 13, vigor: 15, genius: 11, cunning: 12, aura: 12 },
  { name: "Seer of Shadowmire",     faction: "Daimaken Militarium",  category: "Leader",   hp: 50,  sta: 45,  arm: 1, mov: 25, strength: 11, agility: 13, vigor: 13, genius: 15, cunning: 14, aura: 15 },
  { name: "Daimaken War-Knight",    faction: "Daimaken Militarium",  category: "Vanguard", hp: 95,  sta: 80,  arm: 7, mov: 20, strength: 16, agility: 12, vigor: 16, genius: 12, cunning: 12, aura: 13 },
  { name: "Militarium Commander",   faction: "Daimaken Militarium",  category: "Leader",   hp: 90,  sta: 80,  arm: 6, mov: 25, strength: 15, agility: 13, vigor: 15, genius: 14, cunning: 14, aura: 15 },
  { name: "Infiltration Wraith",    faction: "Daimaken Militarium",  category: "Vanguard", hp: 50,  sta: 45,  arm: 1, mov: 35, strength: 13, agility: 16, vigor: 13, genius: 13, cunning: 15, aura: 12 },

  // ── Void Pirates ──────────────────────────────────────────────────────
  { name: "Void Raider",            faction: "Void Pirates",         category: "Infantry", hp: 55,  sta: 50,  arm: 1, mov: 30, strength: 13, agility: 14, vigor: 13, genius: 12, cunning: 13, aura: 12 },
  { name: "Void Breacher",          faction: "Void Pirates",         category: "Vanguard", hp: 65,  sta: 55,  arm: 4, mov: 25, strength: 15, agility: 13, vigor: 14, genius: 12, cunning: 13, aura: 12 },
  { name: "Void Corsair Captain",   faction: "Void Pirates",         category: "Leader",   hp: 85,  sta: 75,  arm: 3, mov: 30, strength: 14, agility: 14, vigor: 14, genius: 13, cunning: 15, aura: 15 },
  { name: "Void Scrapper",          faction: "Void Pirates",         category: "Infantry", hp: 40,  sta: 35,  arm: 0, mov: 35, strength: 12, agility: 15, vigor: 12, genius: 12, cunning: 14, aura: 12 },
  { name: "Void Gunslinger",        faction: "Void Pirates",         category: "Vanguard", hp: 60,  sta: 55,  arm: 1, mov: 35, strength: 13, agility: 16, vigor: 13, genius: 12, cunning: 14, aura: 14 },
  { name: "Void Signal Jammer",     faction: "Void Pirates",         category: "Leader",   hp: 45,  sta: 40,  arm: 1, mov: 30, strength: 12, agility: 13, vigor: 12, genius: 15, cunning: 15, aura: 13 },

  // ── Aliens & Independents ─────────────────────────────────────────────
  { name: "Sluginish Acidmaw",      faction: "Aliens & Independents", category: "Vanguard", hp: 70,  sta: 65,  arm: 2, mov: 20, strength: 14, agility: 13, vigor: 15, genius: 11, cunning: 13, aura: 12 },
  { name: "Ssarax Pack Hunter",     faction: "Aliens & Independents", category: "Vanguard", hp: 75,  sta: 70,  arm: 3, mov: 35, strength: 15, agility: 14, vigor: 15, genius: 12, cunning: 14, aura: 13 },
  { name: "Verscar Bounty Runner",  faction: "Aliens & Independents", category: "Infantry", hp: 55,  sta: 50,  arm: 3, mov: 30, strength: 13, agility: 15, vigor: 13, genius: 12, cunning: 15, aura: 12 },
  { name: "Haptapian Rogue Analyst",faction: "Aliens & Independents", category: "Leader",   hp: 40,  sta: 35,  arm: 1, mov: 25, strength: 11, agility: 13, vigor: 12, genius: 17, cunning: 16, aura: 13 },
  { name: "Foletian Colossus",      faction: "Aliens & Independents", category: "Vanguard", hp: 110, sta: 90,  arm: 4, mov: 20, strength: 17, agility: 11, vigor: 16, genius: 11, cunning: 11, aura: 13 },
  { name: "Maldon Trade Enforcer",  faction: "Aliens & Independents", category: "Leader",   hp: 60,  sta: 55,  arm: 3, mov: 30, strength: 12, agility: 13, vigor: 13, genius: 14, cunning: 15, aura: 16 },

  // ── Wild Creatures ────────────────────────────────────────────────────
  { name: "Psionic Golem",          faction: "Wild Creatures",        category: "Leader",   hp: 150, sta: 90,  arm: 4, mov: 15, strength: 17, agility: 11, vigor: 16, genius: 15, cunning: 12, aura: 14 },
  { name: "Slog",                   faction: "Wild Creatures",        category: "Vanguard", hp: 130, sta: 110, arm: 3, mov: 20, strength: 18, agility: 11, vigor: 17, genius: 11, cunning: 12, aura: 11 },
  { name: "Thornback Crawler",      faction: "Wild Creatures",        category: "Infantry", hp: 55,  sta: 45,  arm: 2, mov: 35, strength: 13, agility: 15, vigor: 13, genius: 11, cunning: 13, aura: 11 },
  { name: "Gravemaw",               faction: "Wild Creatures",        category: "Vanguard", hp: 100, sta: 80,  arm: 2, mov: 25, strength: 16, agility: 14, vigor: 15, genius: 11, cunning: 14, aura: 11 },
  { name: "Skyveil Raptor",         faction: "Wild Creatures",        category: "Infantry", hp: 65,  sta: 55,  arm: 0, mov: 40, strength: 14, agility: 17, vigor: 13, genius: 12, cunning: 14, aura: 11 },
];

export const ENEMY_NAMES = ENEMY_ROSTER.map((e) => e.name);
