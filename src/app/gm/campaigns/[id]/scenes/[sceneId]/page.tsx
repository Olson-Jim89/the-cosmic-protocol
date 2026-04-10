"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Scene, Encounter, Npc } from "@/lib/types";

const RACES = ["Human", "Haptapian", "Foltian", "Sluginish", "Muldion", "Verscar", "Ssarax", "Unknown"];
const NPC_ROLES = ["villain", "ally", "neutral", "quest_giver", "merchant", "other"];

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
  const [dataLoading, setDataLoading] = useState(true);

  const [showEncForm, setShowEncForm] = useState(false);
  const [showNpcForm, setShowNpcForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setIds(p));
  }, [params]);

  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!ids || !user) return;
    Promise.all([fetchScene(), fetchEncounters(), fetchNpcs()]).finally(() =>
      setDataLoading(false)
    );
  }, [ids, user]);

  async function fetchScene() {
    if (!ids) return;
    const { data } = await supabase.from("scenes").select("*").eq("id", ids.sceneId).single();
    setScene(data ?? null);
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

  async function addEncounter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ids) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { error: err } = await supabase.from("encounters").insert({
      scene_id: ids.sceneId,
      title: String(fd.get("title")),
      description: String(fd.get("description") ?? "") || null,
      encounter_order: encounters.length,
    });
    if (err) setError(err.message);
    else {
      setShowEncForm(false);
      (e.target as HTMLFormElement).reset();
      await fetchEncounters();
    }
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
      notes: String(fd.get("notes") ?? "") || null,
      strength: Number(fd.get("strength") ?? 1),
      vigor: Number(fd.get("vigor") ?? 1),
      genius: Number(fd.get("genius") ?? 1),
      cunning: Number(fd.get("cunning") ?? 1),
      aura: Number(fd.get("aura") ?? 1),
    });
    if (err) setError(err.message);
    else {
      setShowNpcForm(false);
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
      <input name={name} type="number" min={1} max={20} defaultValue={1} required style={{ textAlign: "center", padding: "6px 4px" }} />
    </label>
  );

  return (
    <>
      <section className="page-intro">
        <div style={{ marginBottom: 10 }}>
          <Link href={`/gm/campaigns/${ids?.id}`} style={{ fontSize: "0.75rem", color: "var(--blue)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            ← Campaign
          </Link>
        </div>
        {dataLoading ? <h1>Loading…</h1> : scene ? (
          <>
            <h1>{scene.title}</h1>
            {scene.location && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>📍 {scene.location}</p>}
            {scene.description && <p className="lede">{scene.description}</p>}
          </>
        ) : <h1>Scene Not Found</h1>}
      </section>

      {error && (
        <div className="status" style={{ background: "rgba(255,60,60,0.1)", borderColor: "rgba(255,80,80,0.3)", color: "#ff9999" }}>{error}</div>
      )}

      {/* ── ENCOUNTERS ──────────────────────────────────── */}
      <section>
        <div className="page-split-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Encounters</h2>
          <button className="button primary" onClick={() => setShowEncForm((v) => !v)}>
            {showEncForm ? "Cancel" : "+ Add Encounter"}
          </button>
        </div>

        {showEncForm && (
          <article className="card" style={{ marginBottom: 14 }}>
            <h3>New Encounter</h3>
            <form onSubmit={addEncounter} className="grid" style={{ gap: 12, marginTop: 12 }}>
              <label>
                Title
                <input name="title" type="text" placeholder="Firefight in the Loading Bay" required />
              </label>
              <label>
                Description
                <textarea name="description" rows={2} placeholder="Describe the encounter setup and objectives…" style={{ resize: "vertical" }} />
              </label>
              <div className="button-row">
                <button type="submit" className="button secondary" disabled={saving}>{saving ? "Saving…" : "Add Encounter"}</button>
                <button type="button" className="button ghost" onClick={() => setShowEncForm(false)}>Cancel</button>
              </div>
            </form>
          </article>
        )}

        {encounters.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 24, marginBottom: 24 }}>
            <p style={{ color: "var(--muted)" }}>No encounters yet.</p>
          </div>
        ) : (
          <div className="grid" style={{ gap: 10, marginBottom: 24 }}>
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
                  <Link
                    href={`/gm/campaigns/${ids?.id}/scenes/${ids?.sceneId}/encounters/${enc.id}`}
                    className="button primary"
                    style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", fontSize: "0.66rem" }}
                  >
                    Edit Encounter
                  </Link>
                  <button
                    onClick={() => deleteEncounter(enc.id)}
                    style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff9999", borderRadius: 8, padding: "5px 10px", fontSize: "0.66rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── NPCs ─────────────────────────────────────────── */}
      <section>
        <div className="page-split-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
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
                <label>
                  Name
                  <input name="name" type="text" placeholder="Commander Valek" required />
                </label>
                <label>
                  Race
                  <select name="race">
                    {RACES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </label>
              </div>
              <label>
                Role
                <select name="role">
                  {NPC_ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 8, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Stats</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {[["strength","STR"],["vigor","VIG"],["genius","GEN"],["cunning","CUN"],["aura","AUR"]].map(([n,l]) => statInput(n, l))}
                </div>
              </div>
              <label>
                Notes
                <textarea name="notes" rows={2} placeholder="Motivation, secrets, dialogue hooks…" style={{ resize: "vertical" }} />
              </label>
              <div className="button-row">
                <button type="submit" className="button secondary" disabled={saving}>{saving ? "Saving…" : "Add NPC"}</button>
                <button type="button" className="button ghost" onClick={() => setShowNpcForm(false)}>Cancel</button>
              </div>
            </form>
          </article>
        )}

        {npcs.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 24 }}>
            <p style={{ color: "var(--muted)" }}>No NPCs assigned to this scene yet.</p>
          </div>
        ) : (
          <div className="grid grid-2">
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
                  <button
                    onClick={() => deleteNpc(npc.id)}
                    style={{ background: "none", border: "none", color: "#ff9999", cursor: "pointer", fontSize: "0.9rem", padding: "2px 6px" }}
                  >
                    ✕
                  </button>
                </div>
                <div className="char-stats">
                  {[["STR", npc.strength],["VIG",npc.vigor],["GEN",npc.genius],["CUN",npc.cunning],["AUR",npc.aura]].map(([l,v]) => (
                    <div key={l} className="stat-pip">
                      <div className="val">{v}</div>
                      <div className="lbl">{l}</div>
                    </div>
                  ))}
                </div>
                {npc.notes && <p style={{ fontSize: "0.78rem", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 6 }}>{npc.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
