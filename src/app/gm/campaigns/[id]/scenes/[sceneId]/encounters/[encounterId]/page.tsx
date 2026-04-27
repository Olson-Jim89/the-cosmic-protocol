"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Encounter, Enemy, TerrainTile, TileType, BattleMapData } from "@/lib/types";
import { ENEMY_ROSTER, ENEMY_NAMES, CATEGORY_TO_TYPE } from "@/lib/enemies";
import BattleMap from "@/components/BattleMap";

const GRID_COLS = 12;
const GRID_ROWS = 8;

const TILE_CYCLE: TileType[] = ["empty", "cover", "wall", "difficult", "hazard", "water"];

const TILE_META: Record<TileType, { label: string; color: string; short: string }> = {
  empty:     { label: "Empty",     color: "#0f1a2e",        short: "·"  },
  cover:     { label: "Cover",     color: "#1a3d1a",        short: "▩"  },
  wall:      { label: "Wall",      color: "#2c2c2c",        short: "█"  },
  difficult: { label: "Difficult", color: "#3d2800",        short: "~"  },
  hazard:    { label: "Hazard",    color: "#4a100a",        short: "☣"  },
  water:     { label: "Water",     color: "#0a1e3d",        short: "≈"  },
};

const ENEMY_TYPES = ["minion", "standard", "elite", "boss"];

function mkKey(x: number, y: number) { return `${x},${y}`; }

type GridMap = Map<string, TileType>;

export default function EncounterPage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string; encounterId: string }>;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [ids, setIds] = useState<{ id: string; sceneId: string; encounterId: string } | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [grid, setGrid] = useState<GridMap>(new Map());
  const [dataLoading, setDataLoading] = useState(true);

  const [showEnemyForm, setShowEnemyForm] = useState(false);
  const [enemyType, setEnemyType] = useState("standard");
  const [statValues, setStatValues] = useState({ hp: 50, sta: 40, arm: 1, mov: 25, strength: 10, agility: 10, vigor: 10, genius: 10, cunning: 10, aura: 10 });
  const [saving, setSaving] = useState(false);
  const [savingGrid, setSavingGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridSaved, setGridSaved] = useState(false);
  const [activeTile, setActiveTile] = useState<TileType>("cover");

  // Battle map state
  const [mapData, setMapData] = useState<BattleMapData>({});
  const [floorUrl, setFloorUrl] = useState<string | null>(null);
  const [wallUrl, setWallUrl] = useState<string | null>(null);
  const [mapUploading, setMapUploading] = useState<"floor" | "wall" | null>(null);
  const [mapSaving, setMapSaving] = useState(false);
  const [mapSaved, setMapSaved] = useState(false);
  const mapDataRef = useRef<BattleMapData>({});

  useEffect(() => {
    params.then((p) => setIds(p));
  }, [params]);

  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!ids || !user) return;
    Promise.all([fetchEncounter(), fetchEnemies(), fetchTerrain()]).finally(() =>
      setDataLoading(false)
    );
  }, [ids, user]);

  async function fetchEncounter() {
    if (!ids) return;
    const { data } = await supabase.from("encounters").select("*").eq("id", ids.encounterId).single();
    if (data) {
      setEncounter(data);
      setFloorUrl(data.battle_bg_floor ?? null);
      setWallUrl(data.battle_bg_wall ?? null);
      const md: BattleMapData = data.map_data ?? {};
      setMapData(md);
      mapDataRef.current = md;
    }
  }

  async function fetchEnemies() {
    if (!ids) return;
    const { data } = await supabase.from("enemies").select("*").eq("encounter_id", ids.encounterId);
    setEnemies(data ?? []);
  }

  async function fetchTerrain() {
    if (!ids) return;
    const { data } = await supabase.from("terrain_tiles").select("*").eq("encounter_id", ids.encounterId);
    const map: GridMap = new Map();
    (data ?? []).forEach((t: TerrainTile) => {
      map.set(mkKey(t.grid_x, t.grid_y), t.tile_type);
    });
    setGrid(map);
  }

  function handleTileClick(x: number, y: number) {
    const key = mkKey(x, y);
    const current = grid.get(key) ?? "empty";
    const next = activeTile === current ? "empty" : activeTile;
    setGrid((prev) => {
      const m = new Map(prev);
      if (next === "empty") m.delete(key);
      else m.set(key, next);
      return m;
    });
    setGridSaved(false);
  }

  async function saveBattlefield() {
    if (!ids) return;
    setSavingGrid(true);
    // Delete all existing tiles for this encounter
    await supabase.from("terrain_tiles").delete().eq("encounter_id", ids.encounterId);
    // Insert non-empty tiles
    const tiles = Array.from(grid.entries())
      .filter(([, t]) => t !== "empty")
      .map(([key, tile_type]) => {
        const [x, y] = key.split(",").map(Number);
        return { encounter_id: ids.encounterId, tile_type, grid_x: x, grid_y: y };
      });
    if (tiles.length > 0) {
      await supabase.from("terrain_tiles").insert(tiles);
    }
    setSavingGrid(false);
    setGridSaved(true);
    setTimeout(() => setGridSaved(false), 2000);
  }

  function clearGrid() {
    if (!confirm("Clear all terrain?")) return;
    setGrid(new Map());
    setGridSaved(false);
  }

  function handleEnemyNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const match = ENEMY_ROSTER.find((en) => en.name === e.target.value);
    if (match) {
      setEnemyType(CATEGORY_TO_TYPE[match.category]);
      setStatValues({ hp: match.hp, sta: match.sta, arm: match.arm, mov: match.mov, strength: match.strength, agility: match.agility, vigor: match.vigor, genius: match.genius, cunning: match.cunning, aura: match.aura });
    }
  }

  function resetEnemyForm() {
    setShowEnemyForm(false);
    setEnemyType("standard");
    setStatValues({ hp: 50, sta: 40, arm: 1, mov: 25, strength: 10, agility: 10, vigor: 10, genius: 10, cunning: 10, aura: 10 });
  }

  async function addEnemy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ids) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { error: err } = await supabase.from("enemies").insert({
      encounter_id: ids.encounterId,
      name: String(fd.get("name")),
      enemy_type: enemyType || null,
      count: Number(fd.get("count") ?? 1),
      hp: statValues.hp,
      sta: statValues.sta,
      arm: statValues.arm,
      mov: statValues.mov,
      strength: statValues.strength,
      agility: statValues.agility,
      vigor: statValues.vigor,
      genius: statValues.genius,
      cunning: statValues.cunning,
      aura: statValues.aura,
      notes: String(fd.get("notes") ?? "") || null,
    });
    if (err) setError(err.message);
    else {
      resetEnemyForm();
      (e.target as HTMLFormElement).reset();
      await fetchEnemies();
    }
    setSaving(false);
  }

  async function deleteEnemy(id: string) {
    await supabase.from("enemies").delete().eq("id", id);
    setEnemies((prev) => prev.filter((en) => en.id !== id));
  }

  async function adjustHp(en: Enemy, delta: number) {
    const current = en.current_hp ?? en.hp;
    const next = Math.max(0, Math.min(en.hp, current + delta));
    setEnemies((prev) => prev.map((e) => e.id === en.id ? { ...e, current_hp: next } : e));
    await supabase.from("enemies").update({ current_hp: next }).eq("id", en.id);
  }

  async function adjustSta(en: Enemy, delta: number) {
    const current = en.current_sta ?? en.sta;
    const next = Math.max(0, Math.min(en.sta, current + delta));
    setEnemies((prev) => prev.map((e) => e.id === en.id ? { ...e, current_sta: next } : e));
    await supabase.from("enemies").update({ current_sta: next }).eq("id", en.id);
  }

  async function resetHp(en: Enemy) {
    setEnemies((prev) => prev.map((e) => e.id === en.id ? { ...e, current_hp: en.hp, current_sta: en.sta } : e));
    await supabase.from("enemies").update({ current_hp: en.hp, current_sta: en.sta }).eq("id", en.id);
  }

  // ── Battle map helpers ──────────────────────────────────
  async function uploadMapImage(file: File, layer: "floor" | "wall") {
    if (!ids) return;
    setMapUploading(layer);
    setError(null);
    const path = `${ids.encounterId}/${layer}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("battle-maps").upload(path, file, { upsert: true });
    if (upErr) { setError(upErr.message); setMapUploading(null); return; }
    const { data: urlData } = supabase.storage.from("battle-maps").getPublicUrl(path);
    const col = layer === "floor" ? "battle_bg_floor" : "battle_bg_wall";
    await supabase.from("encounters").update({ [col]: urlData.publicUrl }).eq("id", ids.encounterId);
    if (layer === "floor") setFloorUrl(urlData.publicUrl);
    else setWallUrl(urlData.publicUrl);
    setMapUploading(null);
  }

  function handleMapChange(data: BattleMapData) {
    setMapData(data);
    mapDataRef.current = data;
    setMapSaved(false);
  }

  async function saveMapData() {
    if (!ids) return;
    setMapSaving(true);
    await supabase.from("encounters").update({ map_data: mapDataRef.current }).eq("id", ids.encounterId);
    setMapSaving(false);
    setMapSaved(true);
    setTimeout(() => setMapSaved(false), 2000);
  }

  if (loading || !user) return null;

  const typeBadgeColor: Record<string, string> = {
    minion: "rgba(100,100,100,0.5)",
    standard: "rgba(71,190,255,0.2)",
    elite: "rgba(255,214,92,0.2)",
    boss: "rgba(255,86,109,0.25)",
  };

  return (
    <>
      <section className="page-intro">
        <div style={{ marginBottom: 10 }}>
          <Link href={`/gm/campaigns/${ids?.id}/scenes/${ids?.sceneId}`} style={{ fontSize: "0.75rem", color: "var(--blue)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            ← Scene
          </Link>
        </div>
        {dataLoading ? <h1>Loading…</h1> : encounter ? (
          <>
            <h1>{encounter.title}</h1>
            {encounter.description && <p className="lede">{encounter.description}</p>}
          </>
        ) : <h1>Encounter Not Found</h1>}
      </section>

      {error && (
        <div className="status" style={{ background: "rgba(255,60,60,0.1)", borderColor: "rgba(255,80,80,0.3)", color: "#ff9999" }}>{error}</div>
      )}

      {/* ── ENEMIES ─────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div className="page-split-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Enemies</h2>
          <button className="button primary" onClick={() => setShowEnemyForm((v) => !v)}>
            {showEnemyForm ? "Cancel" : "+ Add Enemy"}
          </button>
        </div>

        {showEnemyForm && (
          <article className="card" style={{ marginBottom: 14 }}>
            <h3>New Enemy</h3>
            <form onSubmit={addEnemy} className="grid" style={{ gap: 12, marginTop: 12 }}>
              <div className="grid grid-2">
                <label>
                  Name
                  <input
                    name="name"
                    type="text"
                    list="enemy-catalog"
                    placeholder="Type or pick from roster…"
                    onChange={handleEnemyNameChange}
                    required
                  />
                  <datalist id="enemy-catalog">
                    {ENEMY_NAMES.map((n) => <option key={n} value={n} />)}
                  </datalist>
                </label>
                <label>
                  Type
                  <select value={enemyType} onChange={(e) => setEnemyType(e.target.value)}>
                    {ENEMY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ maxWidth: 120 }}>
                Count
                <input name="count" type="number" min={1} max={50} defaultValue={1} required />
              </label>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 8, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Vitals — auto-filled from roster</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
                  {(["hp","sta","arm","mov"] as const).map((n) => (
                    <label key={n} style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>{n.toUpperCase()}{n === "mov" ? " (ft)" : ""}</span>
                      <input type="number" min={0} max={n === "mov" ? 100 : 999} value={statValues[n]} onChange={(e) => setStatValues((prev) => ({ ...prev, [n]: Number(e.target.value) }))} required style={{ textAlign: "center", padding: "6px 4px" }} />
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 8, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Attributes</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                  {(["strength","agility","vigor","genius","cunning","aura"] as const).map((n) => (
                    <label key={n} style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>{n === "strength" ? "STR" : n === "agility" ? "AGI" : n === "vigor" ? "VIG" : n === "genius" ? "GEN" : n === "cunning" ? "CUN" : "AUR"}</span>
                      <input type="number" min={1} max={30} value={statValues[n]} onChange={(e) => setStatValues((prev) => ({ ...prev, [n]: Number(e.target.value) }))} required style={{ textAlign: "center", padding: "6px 4px" }} />
                    </label>
                  ))}
                </div>
              </div>
              <label>
                Notes
                <textarea name="notes" rows={2} placeholder="Tactics, abilities, special rules…" style={{ resize: "vertical" }} />
              </label>
              <div className="button-row">
                <button type="submit" className="button primary" disabled={saving}>{saving ? "Saving…" : "Add Enemy"}</button>
                <button type="button" className="button ghost" onClick={resetEnemyForm}>Cancel</button>
              </div>
            </form>
          </article>
        )}

        {enemies.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <p style={{ color: "var(--muted)" }}>No enemies defined yet.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {enemies.map((en) => (
              <article key={en.id} className="card" style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <h3 style={{ marginBottom: 4 }}>
                      {en.name}
                      <span style={{ marginLeft: 8, fontSize: "0.68rem", padding: "2px 8px", borderRadius: 6, background: typeBadgeColor[en.enemy_type ?? "standard"] ?? "rgba(255,255,255,0.08)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: en.enemy_type === "boss" ? "var(--red)" : en.enemy_type === "elite" ? "var(--yellow)" : "var(--muted)" }}>
                        {en.enemy_type ?? "standard"}
                      </span>
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      Count: <strong style={{ color: "var(--text)" }}>{en.count}</strong>
                    </p>
                  </div>
                  <button onClick={() => deleteEnemy(en.id)} style={{ background: "none", border: "none", color: "#ff9999", cursor: "pointer", fontSize: "0.9rem", padding: "2px 6px" }}>✕</button>
                </div>
                {/* Live HP / STA trackers */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                  {([
                    { label: "HP",  cur: en.current_hp ?? en.hp,  max: en.hp,  color: "var(--red)",  onMinus: () => adjustHp(en, -1),  onPlus: () => adjustHp(en, 1),  onBig: () => adjustHp(en, -10) },
                    { label: "STA", cur: en.current_sta ?? en.sta, max: en.sta, color: "var(--blue)", onMinus: () => adjustSta(en, -1), onPlus: () => adjustSta(en, 1), onBig: () => adjustSta(en, -10) },
                  ]).map(({ label, cur, max, color, onMinus, onPlus, onBig }) => (
                    <div key={label}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>{label}</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color }}>{cur} / {max}</span>
                      </div>
                      {/* Bar */}
                      <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 6 }}>
                        <div style={{ height: "100%", borderRadius: 4, background: color, width: `${max > 0 ? Math.round((cur / max) * 100) : 0}%`, transition: "width 0.2s" }} />
                      </div>
                      {/* Steppers */}
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={onBig} title={`-10 ${label}`} style={{ flex: 1, background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff9999", borderRadius: 6, cursor: "pointer", fontSize: "0.7rem", padding: "3px 0", fontFamily: "var(--font-orbitron)" }}>−10</button>
                        <button onClick={onMinus} title={`-1 ${label}`} style={{ flex: 1, background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff9999", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", padding: "3px 0" }}>−</button>
                        <button onClick={onPlus} title={`+1 ${label}`} style={{ flex: 1, background: "rgba(89,221,157,0.1)", border: "1px solid rgba(89,221,157,0.25)", color: "var(--green)", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", padding: "3px 0" }}>+</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => resetHp(en)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color: "var(--muted)", borderRadius: 6, cursor: "pointer", fontSize: "0.62rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 0" }}>
                    Reset to Full
                  </button>
                </div>
                {/* ARM / MOV static */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                  {([["ARM", en.arm, "var(--text)"], ["MOV", en.mov ? `${en.mov}ft` : "—", "var(--green)"]] as [string, string|number, string][]).map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "5px 4px" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: c }}>{v ?? 0}</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--muted)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                {/* Attributes */}
                <div className="char-stats">
                  {([["STR",en.strength],["AGI",en.agility],["VIG",en.vigor],["GEN",en.genius],["CUN",en.cunning],["AUR",en.aura]] as [string, number][]).map(([l,v]) => (
                    <div key={l} className="stat-pip">
                      <div className="val">{v ?? 10}</div>
                      <div className="lbl">{l}</div>
                    </div>
                  ))}
                </div>
                {en.notes && <p style={{ fontSize: "0.78rem", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 6 }}>{en.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── BATTLEFIELD ─────────────────────────────────── */}
      <section>
        <h2 style={{ marginBottom: 14 }}>Battlefield</h2>

        {/* Tile palette */}
        <div className="card" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 10, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Paint Mode — click a type to select, then click tiles to paint
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {TILE_CYCLE.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTile(t)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: activeTile === t ? "2px solid var(--blue)" : "1px solid var(--line)",
                  background: activeTile === t ? "rgba(71,190,255,0.15)" : "rgba(255,255,255,0.04)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 3, background: TILE_META[t].color, display: "inline-block", border: "1px solid rgba(255,255,255,0.15)" }} />
                {TILE_META[t].label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button
              className="button secondary"
              style={{ minHeight: 34, padding: "0 14px", fontSize: "0.68rem" }}
              onClick={saveBattlefield}
              disabled={savingGrid}
            >
              {savingGrid ? "Saving…" : gridSaved ? "✓ Saved!" : "Save Battlefield"}
            </button>
            <button
              className="button ghost"
              style={{ minHeight: 34, padding: "0 14px", fontSize: "0.68rem" }}
              onClick={clearGrid}
            >
              Clear All
            </button>
          </div>

          {/* Grid */}
          <div className="battlefield-scroll" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_COLS}, 40px)`,
              gap: 2,
              background: "#060c18",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: 8,
              width: "max-content",
              minWidth: "100%",
            }}
          >
            {Array.from({ length: GRID_ROWS }).map((_, y) =>
              Array.from({ length: GRID_COLS }).map((_, x) => {
                const tileType = grid.get(mkKey(x, y)) ?? "empty";
                const meta = TILE_META[tileType];
                return (
                  <div
                    key={mkKey(x, y)}
                    onClick={() => handleTileClick(x, y)}
                    title={`${meta.label} (${x},${y})`}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 4,
                      background: meta.color,
                      border: "1px solid rgba(255,255,255,0.07)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.5)",
                      userSelect: "none",
                      transition: "filter 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.5)")}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
                  >
                    {tileType !== "empty" ? meta.short : ""}
                  </div>
                );
              })
            )}
          </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
            {TILE_CYCLE.filter((t) => t !== "empty").map((t) => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "var(--muted)" }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: TILE_META[t].color, display: "inline-block", border: "1px solid rgba(255,255,255,0.15)" }} />
                {TILE_META[t].label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── BATTLE MAP ──────────────────────────────────── */}
      <section style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Battle Map</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="button secondary"
              style={{ minHeight: 34, padding: "0 14px", fontSize: "0.68rem" }}
              onClick={saveMapData}
              disabled={mapSaving}
            >
              {mapSaving ? "Saving…" : mapSaved ? "✓ Saved!" : "Save Map"}
            </button>
          </div>
        </div>

        {/* Layer upload row */}
        <div className="card" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 12, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Background Layers
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {(["floor", "wall"] as const).map((layer) => {
              const url = layer === "floor" ? floorUrl : wallUrl;
              return (
                <div key={layer} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: layer === "floor" ? "var(--yellow)" : "var(--blue)" }}>
                      {layer === "floor" ? "Floor Layer" : "Wall Layer"}
                    </span>
                    <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", minHeight: 28, padding: "0 10px", fontSize: "0.6rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(220,231,248,0.24)", color: "#f2f6ff", borderRadius: 8 }}>
                      {mapUploading === layer ? "Uploading…" : url ? "Change" : "Upload"}
                      <input type="file" accept="image/*" style={{ display: "none" }} disabled={mapUploading !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMapImage(f, layer); }} />
                    </label>
                  </div>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={`${layer} preview`} style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
                  ) : (
                    <div style={{ height: 80, borderRadius: 8, border: "1px dashed rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>No image yet</span>
                    </div>
                  )}
                  <p style={{ fontSize: "0.66rem", color: "var(--muted)", margin: 0 }}>
                    {layer === "floor"
                      ? "Shown beneath walls. Revealed in room polygons."
                      : "Painted on top of floor. Rooms cut through this layer."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas editor */}
        <div className="card">
          <BattleMap
            floorUrl={floorUrl}
            wallUrl={wallUrl}
            mapData={mapData}
            onChange={handleMapChange}
          />
        </div>
      </section>
    </>
  );
}
