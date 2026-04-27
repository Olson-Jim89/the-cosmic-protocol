"use client";

import { useEffect, useState, FormEvent, KeyboardEvent, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Scene, Encounter, Npc, SceneLocation } from "@/lib/types";
import { ALL_ITEMS } from "@/lib/items";
import { ENEMY_ROSTER, ENEMY_NAMES, CATEGORY_TO_TYPE } from "@/lib/enemies";

const RACES = ["Human", "Haptapian", "Foltian", "Sluginish", "Muldion", "Verscar", "Ssarax", "Unknown"];
const NPC_ROLES = ["villain", "ally", "neutral", "quest_giver", "merchant", "other"];
const GREEK = ["α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","ο","π","ρ","σ","τ","υ"];

const ROLE_NOTES: Record<string, string> = {
  villain:    "Motivation: [what they want]\nSecret: [what they're hiding]\nThreat: [how they oppose the crew]\nDialogue hook: \"[signature line]\"",
  ally:       "Motivation: [why they help]\nService: [what they can offer]\nLoyalty limit: [what would turn them]\nDialogue hook: \"[signature line]\"",
  neutral:    "Motivation: [self-interest]\nAttitude: Indifferent until [condition]\nKnowledge: [what they know]\nDialogue hook: \"[signature line]\"",
  quest_giver:"Mission: [what they need done]\nReward: [what they're offering]\nUrgency: [why now]\nHidden agenda: [what they're not telling the crew]",
  merchant:   "Stock: [what they sell]\nPricing: Standard / Inflated / Black market\nBonus offer: [special item or info for sale]\nDialogue hook: \"[signature line]\"",
  other:      "Role: [describe their function]\nMotivation: [what drives them]\nNotes: ",
};

export default function ScenePage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [ids, setIds] = useState<{ id: string; sceneId: string } | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [sceneLocs, setSceneLocs] = useState<SceneLocation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Map / location state
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [mapUploading, setMapUploading] = useState(false);
  const [locTitle, setLocTitle] = useState("");
  const [locDesc, setLocDesc] = useState("");
  const [locItems, setLocItems] = useState<string[]>([]);
  const [locItemInput, setLocItemInput] = useState("");

  const [showNpcForm, setShowNpcForm] = useState(false);
  const [showEncForm, setShowEncForm] = useState(false);

  // Encounter creation — pending enemies
  type PendingEnemy = { name: string; enemy_type: string; count: number; hp: number; sta: number; arm: number; mov: number; strength: number; agility: number; vigor: number; genius: number; cunning: number; aura: number };
  const [encEnemies, setEncEnemies] = useState<PendingEnemy[]>([]);
  const [showEnemySubForm, setShowEnemySubForm] = useState(false);
  const [encEnemyName, setEncEnemyName] = useState("");
  const [encEnemyType, setEncEnemyType] = useState("standard");
  const [encEnemyCount, setEncEnemyCount] = useState(1);
  const [encEnemyStats, setEncEnemyStats] = useState({ hp: 50, sta: 40, arm: 1, mov: 25, strength: 10, agility: 10, vigor: 10, genius: 10, cunning: 10, aura: 10 });
  const [npcNotes, setNpcNotes] = useState(ROLE_NOTES["villain"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived
  const selectedLoc = sceneLocs.find((l) => l.id === selectedLocId) ?? null;

  useEffect(() => {
    params.then((p) => setIds(p));
  }, [params]);

  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!ids || !user) return;
    Promise.all([fetchScene(), fetchEncounters(), fetchNpcs(), fetchSceneLocs()]).finally(() =>
      setDataLoading(false)
    );
  }, [ids, user]);

  // Sync right-panel form when selected location changes
  useEffect(() => {
    if (selectedLoc) {
      setLocTitle(selectedLoc.title);
      setLocDesc(selectedLoc.description ?? "");
      setLocItems(selectedLoc.items ?? []);
      setLocItemInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocId]);

  async function fetchScene() {
    if (!ids) return;
    const { data } = await supabase.from("scenes").select("*").eq("id", ids.sceneId).single();
    if (data) setScene(data);
  }
  async function fetchEncounters() {
    if (!ids) return;
    const { data } = await supabase
      .from("encounters")
      .select("*")
      .eq("scene_id", ids.sceneId)
      .order("encounter_order", { ascending: true });
    setEncounters(data ?? []);
  }
  async function fetchNpcs() {
    if (!ids) return;
    const { data } = await supabase
      .from("npcs")
      .select("*")
      .eq("scene_id", ids.sceneId)
      .order("created_at", { ascending: true });
    setNpcs(data ?? []);
  }

  async function fetchSceneLocs() {
    if (!ids) return;
    const { data } = await supabase
      .from("scene_locations")
      .select("*")
      .eq("scene_id", ids.sceneId)
      .order("sort_order");
    setSceneLocs(data ?? []);
  }

  // ── Area map ─────────────────────────────────────────────
  async function uploadAreaMap(file: File) {
    if (!ids) return;
    setMapUploading(true);
    setError(null);
    const path = `${ids.sceneId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from("scene-maps")
      .upload(path, file, { upsert: true });
    if (upErr) { setError(upErr.message); setMapUploading(false); return; }
    const { data: urlData } = supabase.storage.from("scene-maps").getPublicUrl(path);
    await supabase.from("scenes").update({ area_map_url: urlData.publicUrl }).eq("id", ids.sceneId);
    setScene((prev) => prev ? { ...prev, area_map_url: urlData.publicUrl } : prev);
    setMapUploading(false);
  }

  function handleMapClick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    addLocation((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  }

  // ── Scene locations CRUD ──────────────────────────────────
  async function addLocation(map_x: number | null, map_y: number | null) {
    if (!ids) return;
    const greekIdx = sceneLocs.length;
    const { data, error: err } = await supabase
      .from("scene_locations")
      .insert({
        scene_id: ids.sceneId,
        greek_index: greekIdx,
        title: `Location ${GREEK[greekIdx % GREEK.length]}`,
        description: null,
        map_x,
        map_y,
        items: [],
        sort_order: greekIdx,
      })
      .select()
      .single();
    if (err) { setError(err.message); return; }
    if (data) { setSceneLocs((prev) => [...prev, data]); setSelectedLocId(data.id); }
  }

  async function saveLocation(id: string, patch: Partial<SceneLocation>) {
    const { error: err } = await supabase.from("scene_locations").update(patch).eq("id", id);
    if (err) { setError(err.message); return; }
    setSceneLocs((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  }

  async function deleteLocation(id: string) {
    if (!confirm("Delete this location?")) return;
    await supabase.from("scene_locations").delete().eq("id", id);
    setSceneLocs((prev) => prev.filter((l) => l.id !== id));
    if (selectedLocId === id) setSelectedLocId(null);
  }

  function addLocItem() {
    if (!selectedLoc || !locItemInput.trim()) return;
    const next = [...locItems, locItemInput.trim()];
    setLocItems(next);
    setLocItemInput("");
    saveLocation(selectedLoc.id, { items: next });
  }

  function removeLocItem(i: number) {
    if (!selectedLoc) return;
    const next = locItems.filter((_, idx) => idx !== i);
    setLocItems(next);
    saveLocation(selectedLoc.id, { items: next });
  }

  function handleEncEnemyNameChange(name: string) {
    setEncEnemyName(name);
    const match = ENEMY_ROSTER.find((en) => en.name === name);
    if (match) {
      setEncEnemyType(CATEGORY_TO_TYPE[match.category]);
      setEncEnemyStats({ hp: match.hp, sta: match.sta, arm: match.arm, mov: match.mov, strength: match.strength, agility: match.agility, vigor: match.vigor, genius: match.genius, cunning: match.cunning, aura: match.aura });
    }
  }

  function addEnemyToList() {
    if (!encEnemyName.trim()) return;
    setEncEnemies((prev) => [...prev, { name: encEnemyName.trim(), enemy_type: encEnemyType, count: encEnemyCount, ...encEnemyStats }]);
    setEncEnemyName("");
    setEncEnemyType("standard");
    setEncEnemyCount(1);
    setEncEnemyStats({ hp: 50, sta: 40, arm: 1, mov: 25, strength: 10, agility: 10, vigor: 10, genius: 10, cunning: 10, aura: 10 });
    setShowEnemySubForm(false);
  }

  function resetEncounterForm() {
    setShowEncForm(false);
    setShowEnemySubForm(false);
    setEncEnemies([]);
    setEncEnemyName("");
    setEncEnemyType("standard");
    setEncEnemyCount(1);
    setEncEnemyStats({ hp: 50, sta: 40, arm: 1, mov: 25, strength: 10, agility: 10, vigor: 10, genius: 10, cunning: 10, aura: 10 });
  }

  async function addEncounter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ids) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { data: enc, error: err } = await supabase
      .from("encounters")
      .insert({
        scene_id: ids.sceneId,
        title: String(fd.get("title")),
        description: String(fd.get("description") ?? "") || null,
        encounter_order: encounters.length,
      })
      .select()
      .single();
    if (err) { setError(err.message); setSaving(false); return; }
    if (encEnemies.length > 0 && enc) {
      await supabase.from("enemies").insert(
        encEnemies.map((en) => ({ ...en, encounter_id: enc.id }))
      );
    }
    resetEncounterForm();
    (e.target as HTMLFormElement).reset();
    await fetchEncounters();
    setSaving(false);
  }

  async function addNpc(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ids) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { error: err } = await supabase.from("npcs").insert({
      scene_id: ids.sceneId,
      name: String(fd.get("name")),
      race: String(fd.get("race") ?? "") || null,
      role: String(fd.get("role") ?? "") || null,
      notes: npcNotes || null,
      strength: Number(fd.get("strength") ?? 1),
      vigor: Number(fd.get("vigor") ?? 1),
      genius: Number(fd.get("genius") ?? 1),
      cunning: Number(fd.get("cunning") ?? 1),
      aura: Number(fd.get("aura") ?? 1),
    });
    if (err) setError(err.message);
    else {
      setShowNpcForm(false);
      setNpcNotes(ROLE_NOTES["villain"]);
      (e.target as HTMLFormElement).reset();
      await fetchNpcs();
    }
    setSaving(false);
  }

  async function deleteEncounter(id: string) {
    if (!confirm("Delete this encounter?")) return;
    await supabase.from("encounters").delete().eq("id", id);
    setEncounters((prev) => prev.filter((e) => e.id !== id));
  }

  async function deleteNpc(id: string) {
    if (!confirm("Delete this NPC?")) return;
    await supabase.from("npcs").delete().eq("id", id);
    setNpcs((prev) => prev.filter((n) => n.id !== id));
  }

  if (loading || !user) return null;

  const statInput = (name: string, label: string) => (
    <label key={name} style={{ textAlign: "center" }}>
      <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>{label}</span>
      <input name={name} type="number" min={1} max={20} defaultValue={10} required style={{ textAlign: "center", padding: "6px 4px" }} />
    </label>
  );

  return (
    <>
      {/* ── Header ────────────────────────────────────────── */}
      <section className="page-intro">
        <div style={{ marginBottom: 10 }}>
          <Link href={`/gm/campaigns/${ids?.id}`} style={{ fontSize: "0.75rem", color: "var(--blue)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            ← Campaign
          </Link>
        </div>
        {dataLoading ? <h1>Loading…</h1> : scene ? (
          <>
            <h1>{scene.title}</h1>
            {scene.description && <p className="lede">{scene.description}</p>}
          </>
        ) : <h1>Scene Not Found</h1>}
      </section>

      {error && (
        <div className="status" style={{ background: "rgba(255,60,60,0.1)", borderColor: "rgba(255,80,80,0.3)", color: "#ff9999" }}>{error}</div>
      )}

      {!dataLoading && scene && (
        <>
          {/* ── 3-PANEL MAP AREA ──────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 320px", marginBottom: 32, border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", height: 520 }}>

            {/* LEFT: location list */}
            <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", background: "var(--panel)" }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.63rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--blue)" }}>Locations</span>
                <button className="button ghost" style={{ minHeight: 26, padding: "0 8px", fontSize: "0.6rem" }} onClick={() => addLocation(null, null)}>+ Add</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
                {sceneLocs.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.72rem", padding: "16px 8px", textAlign: "center", lineHeight: 1.7 }}>
                    No locations yet.<br />Upload a map and click to place pins.
                  </p>
                ) : (
                  sceneLocs.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => setSelectedLocId(loc.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
                        cursor: "pointer", marginBottom: 3,
                        background: selectedLocId === loc.id ? "rgba(71,190,255,0.12)" : "transparent",
                        border: `1px solid ${selectedLocId === loc.id ? "rgba(71,190,255,0.3)" : "transparent"}`,
                      }}
                    >
                      <span style={{ color: "var(--blue)", fontFamily: "Georgia,serif", fontSize: "1.05rem", lineHeight: 1, minWidth: 18, flexShrink: 0, textAlign: "center" }}>
                        {GREEK[loc.greek_index % GREEK.length]}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: selectedLocId === loc.id ? "#d9e8ff" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {loc.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CENTER: area map */}
            <div style={{ display: "flex", flexDirection: "column", background: "#060b12" }}>
              {scene.area_map_url && (
                <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "rgba(0,0,0,0.4)" }}>
                  <span style={{ fontSize: "0.62rem", color: "var(--muted)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Click map to place pin
                  </span>
                  <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", minHeight: 26, padding: "0 10px", fontSize: "0.6rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(220,231,248,0.24)", color: "#f2f6ff", borderRadius: 8 }}>
                    {mapUploading ? "Uploading…" : "Change Map"}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAreaMap(f); }} disabled={mapUploading} />
                  </label>
                </div>
              )}
              <div
                style={{ flex: 1, position: "relative", overflow: "hidden", cursor: scene.area_map_url ? "crosshair" : "default" }}
                onClick={scene.area_map_url ? handleMapClick : undefined}
              >
                {scene.area_map_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={scene.area_map_url} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", userSelect: "none" }} alt="Area map" draggable={false} />
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
                      {sceneLocs.filter((l) => l.map_x !== null && l.map_y !== null).map((loc) => {
                        const cx = `${(loc.map_x ?? 0) * 100}%`;
                        const cy = `${(loc.map_y ?? 0) * 100}%`;
                        const isSel = selectedLocId === loc.id;
                        return (
                          <g key={loc.id} style={{ pointerEvents: "all", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setSelectedLocId(loc.id); }}>
                            <circle cx={cx} cy={cy} r={14} fill={isSel ? "rgba(71,190,255,0.88)" : "rgba(8,14,26,0.85)"} stroke={isSel ? "#47BEFF" : "rgba(71,190,255,0.5)"} strokeWidth={isSel ? 2.5 : 1.5} />
                            <text x={cx} y={cy} dominantBaseline="central" textAnchor="middle" fill={isSel ? "#04111f" : "#47BEFF"} fontSize={13} fontFamily="Georgia,serif" fontWeight="bold">
                              {GREEK[loc.greek_index % GREEK.length]}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14 }}>
                    <div style={{ fontSize: "2.5rem", opacity: 0.18 }}>🗺</div>
                    <p style={{ color: "var(--muted)", fontSize: "0.82rem", textAlign: "center" }}>No area map uploaded yet</p>
                    <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", minHeight: 40, padding: "0 18px", fontSize: "0.7rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", background: "linear-gradient(135deg,var(--yellow),var(--green))", color: "#0f1c18", borderRadius: 12, border: 0 }}>
                      {mapUploading ? "Uploading…" : "Upload Map Image"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAreaMap(f); }} disabled={mapUploading} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: location detail */}
            <div style={{ borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", background: "#0a0f18" }}>
              {selectedLoc ? (
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--blue)", fontFamily: "Georgia,serif", fontSize: "2rem", lineHeight: 1 }}>
                      {GREEK[selectedLoc.greek_index % GREEK.length]}
                    </span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => deleteLocation(selectedLoc.id)} style={{ background: "none", border: "none", color: "#ff9999", cursor: "pointer", fontSize: "0.9rem", padding: "2px 6px" }} title="Delete location">✕</button>
                  </div>
                  <label style={{ gap: 4 }}>
                    <span style={{ fontSize: "0.63rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Title</span>
                    <input
                      value={locTitle}
                      onChange={(e) => setLocTitle(e.target.value)}
                      onBlur={() => { if (locTitle !== selectedLoc.title) saveLocation(selectedLoc.id, { title: locTitle }); }}
                      style={{ fontSize: "0.82rem", padding: "8px 10px" }}
                    />
                  </label>
                  <label style={{ gap: 4 }}>
                    <span style={{ fontSize: "0.63rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Description</span>
                    <textarea
                      value={locDesc}
                      rows={4}
                      onChange={(e) => setLocDesc(e.target.value)}
                      onBlur={() => { if (locDesc !== (selectedLoc.description ?? "")) saveLocation(selectedLoc.id, { description: locDesc || null }); }}
                      style={{ resize: "none", fontSize: "0.78rem", padding: "8px 10px" }}
                    />
                  </label>
                  <div>
                    <p style={{ fontSize: "0.63rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--yellow)", marginBottom: 8 }}>Items</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: locItems.length ? 8 : 0 }}>
                      {locItems.map((item, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,204,0,0.1)", border: "1px solid rgba(255,204,0,0.3)", borderRadius: 14, padding: "3px 10px", fontSize: "0.7rem", color: "var(--yellow)" }}>
                          {item}
                          <button onClick={() => removeLocItem(i)} style={{ background: "none", border: "none", color: "var(--yellow)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "0.85rem", opacity: 0.7 }}>×</button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        list="loc-items-catalog"
                        value={locItemInput}
                        onChange={(e) => setLocItemInput(e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); addLocItem(); } }}
                        placeholder="Keycard, Crate…"
                        style={{ flex: 1, fontSize: "0.78rem", padding: "6px 10px" }}
                      />
                      <datalist id="loc-items-catalog">{ALL_ITEMS.map((item) => <option key={item} value={item} />)}</datalist>
                      <button onClick={addLocItem} className="button ghost" style={{ minHeight: 32, padding: "0 10px", fontSize: "0.6rem" }}>Add</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 24, textAlign: "center" }}>
                  <p style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.8 }}>
                    {scene.area_map_url
                      ? "Click the map to place a location pin,\nor select one from the list."
                      : "Select a location from the sidebar\nto edit its details."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── NPCs ──────────────────────────────────────── */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>NPCs</h2>
              <button className="button secondary" onClick={() => setShowNpcForm((v) => !v)}>
                {showNpcForm ? "Cancel" : "+ Add NPC"}
              </button>
            </div>

            {showNpcForm && (
              <article className="card" style={{ marginBottom: 14 }}>
                <h3>New NPC</h3>
                <form onSubmit={addNpc} className="grid" style={{ gap: 12, marginTop: 12 }}>
                  <div className="grid grid-2">
                    <label>Name<input name="name" type="text" placeholder="Commander Valek" required /></label>
                    <label>Race<select name="race">{RACES.map((r) => <option key={r}>{r}</option>)}</select></label>
                  </div>
                  <label>
                    Role
                    <select name="role" onChange={(e) => setNpcNotes(ROLE_NOTES[e.target.value] ?? "")}>
                      {NPC_ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                  <div>
                    <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 8, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Stats</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                      {[["strength","STR"],["vigor","VIG"],["genius","GEN"],["cunning","CUN"],["aura","AUR"]].map(([n,l]) => statInput(n, l))}
                    </div>
                  </div>
                  <label>Notes<textarea name="notes" rows={4} value={npcNotes} onChange={(e) => setNpcNotes(e.target.value)} style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.82rem" }} /></label>
                  <div className="button-row">
                    <button type="submit" className="button secondary" disabled={saving}>{saving ? "Saving…" : "Add NPC"}</button>
                    <button type="button" className="button ghost" onClick={() => { setShowNpcForm(false); setNpcNotes(ROLE_NOTES["villain"]); }}>Cancel</button>
                  </div>
                </form>
              </article>
            )}

            {npcs.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 24, marginBottom: 24 }}>
                <p style={{ color: "var(--muted)" }}>No NPCs assigned to this scene yet.</p>
              </div>
            ) : (
              <div className="grid grid-2" style={{ marginBottom: 32 }}>
                {npcs.map((npc) => (
                  <article key={npc.id} className="card" style={{ position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <h3 style={{ marginBottom: 2 }}>{npc.name}</h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {npc.race && `${npc.race} · `}
                          {npc.role && (
                            <span style={{ textTransform: "capitalize", color: npc.role === "villain" ? "var(--red)" : npc.role === "ally" ? "var(--green)" : "var(--muted)" }}>
                              {npc.role}
                            </span>
                          )}
                        </p>
                      </div>
                      <button onClick={() => deleteNpc(npc.id)} style={{ background: "none", border: "none", color: "#ff9999", cursor: "pointer", fontSize: "0.9rem", padding: "2px 6px" }}>✕</button>
                    </div>
                    <div className="char-stats">
                      {[["STR", npc.strength],["VIG",npc.vigor],["GEN",npc.genius],["CUN",npc.cunning],["AUR",npc.aura]].map(([l,v]) => (
                        <div key={String(l)} className="stat-pip"><div className="val">{v}</div><div className="lbl">{l}</div></div>
                      ))}
                    </div>
                    {npc.notes && <p style={{ fontSize: "0.78rem", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 6 }}>{npc.notes}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ── ENCOUNTERS ────────────────────────────────── */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Encounters</h2>
              <button className="button primary" onClick={() => setShowEncForm((v) => !v)}>
                {showEncForm ? "Cancel" : "+ Add Encounter"}
              </button>
            </div>

            {showEncForm && (
              <article className="card" style={{ marginBottom: 14 }}>
                <h3>New Encounter</h3>
                <form onSubmit={addEncounter} className="grid" style={{ gap: 12, marginTop: 12 }}>
                  <label>Title<input name="title" type="text" placeholder="Firefight in the Loading Bay" required /></label>
                  <label>Description<textarea name="description" rows={2} placeholder="Describe the encounter setup and objectives…" style={{ resize: "vertical" }} /></label>

                  {/* ── Enemy list ── */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Enemies</p>
                      <button type="button" className="button ghost" style={{ fontSize: "0.65rem", minHeight: 28, padding: "0 10px" }} onClick={() => setShowEnemySubForm((v) => !v)}>
                        {showEnemySubForm ? "Cancel" : "+ Add Enemy"}
                      </button>
                    </div>

                    {encEnemies.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: showEnemySubForm ? 12 : 0 }}>
                        {encEnemies.map((en, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid var(--line)" }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: "0.82rem" }}>{en.name}</span>
                              <span style={{ marginLeft: 8, fontSize: "0.65rem", color: en.enemy_type === "boss" ? "var(--red)" : en.enemy_type === "elite" ? "var(--yellow)" : "var(--muted)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase" }}>{en.enemy_type}</span>
                              <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "var(--muted)" }}>×{en.count}</span>
                            </div>
                            <button type="button" onClick={() => setEncEnemies((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#ff9999", cursor: "pointer", padding: "2px 6px", fontSize: "0.85rem" }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showEnemySubForm && (
                      <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <label style={{ margin: 0 }}>
                            <span style={{ fontSize: "0.68rem", display: "block", marginBottom: 4 }}>Name</span>
                            <input
                              type="text"
                              list="enc-enemy-catalog"
                              value={encEnemyName}
                              onChange={(e) => handleEncEnemyNameChange(e.target.value)}
                              placeholder="Pick from roster or custom…"
                              style={{ width: "100%" }}
                            />
                            <datalist id="enc-enemy-catalog">
                              {ENEMY_NAMES.map((n) => <option key={n} value={n} />)}
                            </datalist>
                          </label>
                          <label style={{ margin: 0 }}>
                            <span style={{ fontSize: "0.68rem", display: "block", marginBottom: 4 }}>Type</span>
                            <select value={encEnemyType} onChange={(e) => setEncEnemyType(e.target.value)} style={{ width: "100%" }}>
                              {["minion","standard","elite","boss"].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                          </label>
                        </div>
                        <label style={{ margin: 0, maxWidth: 100 }}>
                          <span style={{ fontSize: "0.68rem", display: "block", marginBottom: 4 }}>Count</span>
                          <input type="number" min={1} max={50} value={encEnemyCount} onChange={(e) => setEncEnemyCount(Number(e.target.value))} style={{ width: "100%" }} />
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
                          {(["hp","sta","arm","mov"] as const).map((n) => (
                            <label key={n} style={{ textAlign: "center", margin: 0 }}>
                              <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 3 }}>{n.toUpperCase()}{n === "mov" ? " (ft)" : ""}</span>
                              <input type="number" min={0} max={n === "mov" ? 100 : 999} value={encEnemyStats[n]} onChange={(e) => setEncEnemyStats((prev) => ({ ...prev, [n]: Number(e.target.value) }))} style={{ textAlign: "center", padding: "5px 2px", width: "100%" }} />
                            </label>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                          {([["strength","STR"],["agility","AGI"],["vigor","VIG"],["genius","GEN"],["cunning","CUN"],["aura","AUR"]] as const).map(([n, l]) => (
                            <label key={n} style={{ textAlign: "center", margin: 0 }}>
                              <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 3 }}>{l}</span>
                              <input type="number" min={1} max={30} value={encEnemyStats[n]} onChange={(e) => setEncEnemyStats((prev) => ({ ...prev, [n]: Number(e.target.value) }))} style={{ textAlign: "center", padding: "5px 2px", width: "100%" }} />
                            </label>
                          ))}
                        </div>
                        <button type="button" className="button secondary" style={{ fontSize: "0.7rem", minHeight: 32, alignSelf: "flex-start" }} onClick={addEnemyToList}>
                          + Add to Encounter
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="button-row">
                    <button type="submit" className="button secondary" disabled={saving}>{saving ? "Saving…" : `Create Encounter${encEnemies.length ? ` + ${encEnemies.length} Enem${encEnemies.length === 1 ? "y" : "ies"}` : ""}`}</button>
                    <button type="button" className="button ghost" onClick={resetEncounterForm}>Cancel</button>
                  </div>
                </form>
              </article>
            )}

            {encounters.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 24 }}>
                <p style={{ color: "var(--muted)" }}>No encounters yet.</p>
              </div>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                {encounters.map((enc, idx) => (
                  <article key={enc.id} className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 36, height: 36, borderRadius: 8, background: "rgba(255,86,109,0.15)", border: "1px solid rgba(255,86,109,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-orbitron)", fontSize: "0.75rem", color: "var(--red)", flexShrink: 0 }}>
                      E{idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: 4 }}>{enc.title}</h3>
                      {enc.description && <p style={{ fontSize: "0.82rem" }}>{enc.description}</p>}
                    </div>
                    <div className="button-row" style={{ flexShrink: 0 }}>
                      <Link href={`/gm/campaigns/${ids?.id}/scenes/${ids?.sceneId}/encounters/${enc.id}`} className="button primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", fontSize: "0.66rem" }}>Edit</Link>
                      <button onClick={() => deleteEncounter(enc.id)} style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff9999", borderRadius: 8, padding: "5px 10px", fontSize: "0.66rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer" }}>✕</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
