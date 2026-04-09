"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Encounter, Enemy, TerrainTile, TileType } from "@/lib/types";

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
  const [saving, setSaving] = useState(false);
  const [savingGrid, setSavingGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridSaved, setGridSaved] = useState(false);
  const [activeTile, setActiveTile] = useState<TileType>("cover");

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
    setEncounter(data ?? null);
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

  async function addEnemy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ids) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { error: err } = await supabase.from("enemies").insert({
      encounter_id: ids.encounterId,
      name: String(fd.get("name")),
      enemy_type: String(fd.get("enemy_type") ?? "standard") || null,
      count: Number(fd.get("count") ?? 1),
      strength: Number(fd.get("strength") ?? 1),
      vigor: Number(fd.get("vigor") ?? 1),
      genius: Number(fd.get("genius") ?? 1),
      cunning: Number(fd.get("cunning") ?? 1),
      aura: Number(fd.get("aura") ?? 1),
      notes: String(fd.get("notes") ?? "") || null,
    });
    if (err) setError(err.message);
    else {
      setShowEnemyForm(false);
      (e.target as HTMLFormElement).reset();
      await fetchEnemies();
    }
    setSaving(false);
  }

  async function deleteEnemy(id: string) {
    await supabase.from("enemies").delete().eq("id", id);
    setEnemies((prev) => prev.filter((en) => en.id !== id));
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
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
                  <input name="name" type="text" placeholder="Void Raider" required />
                </label>
                <label>
                  Type
                  <select name="enemy_type">
                    {ENEMY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ maxWidth: 120 }}>
                Count
                <input name="count" type="number" min={1} max={50} defaultValue={1} required />
              </label>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 8, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Stats</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {[["strength","STR"],["vigor","VIG"],["genius","GEN"],["cunning","CUN"],["aura","AUR"]].map(([n,l]) => (
                    <label key={n} style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>{l}</span>
                      <input name={n} type="number" min={1} max={20} defaultValue={1} required style={{ textAlign: "center", padding: "6px 4px" }} />
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
                <button type="button" className="button ghost" onClick={() => setShowEnemyForm(false)}>Cancel</button>
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
                <div className="char-stats">
                  {[["STR",en.strength],["VIG",en.vigor],["GEN",en.genius],["CUN",en.cunning],["AUR",en.aura]].map(([l,v]) => (
                    <div key={l} className="stat-pip">
                      <div className="val">{v}</div>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_COLS}, 40px)`,
              gap: 2,
              background: "#060c18",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: 8,
              overflowX: "auto",
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
    </>
  );
}
