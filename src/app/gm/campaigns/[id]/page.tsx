"use client";

import { useEffect, useState, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Campaign, Scene } from "@/lib/types";
import { ALL_ITEMS } from "@/lib/items";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showSceneForm, setShowSceneForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tag state for new scene form
  const [newItems, setNewItems] = useState<string[]>([]);
  const [newLocations, setNewLocations] = useState<string[]>([]);
  const [newHooks, setNewHooks] = useState<string[]>([]);
  const [itemInput, setItemInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [hookInput, setHookInput] = useState("");

  function addTag(value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) {
    const t = value.trim();
    if (!t || list.includes(t)) { setInput(""); return; }
    setList([...list, t]);
    setInput("");
  }
  function removeTag(i: number, list: string[], setList: (v: string[]) => void) {
    setList(list.filter((_, idx) => idx !== i));
  }

  useEffect(() => {
    params.then((p) => setCampaignId(p.id));
  }, [params]);

  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!campaignId || !user) return;
    Promise.all([fetchCampaign(), fetchScenes()]).finally(() => setDataLoading(false));
  }, [campaignId, user]);

  async function fetchCampaign() {
    if (!campaignId) return;
    const { data } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    setCampaign(data ?? null);
  }

  async function fetchScenes() {
    if (!campaignId) return;
    const { data } = await supabase
      .from("scenes")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("scene_order", { ascending: true });
    setScenes(data ?? []);
  }

  async function addScene(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { data: newScene, error: err } = await supabase.from("scenes").insert({
      campaign_id: campaignId,
      title: String(fd.get("title")),
      description: String(fd.get("description") ?? "") || null,
      location: String(fd.get("location") ?? "") || null,
      scene_order: scenes.length,
      items: newItems,
      locations: newLocations,
      event_hooks: newHooks,
    }).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    // Reset form tags
    setNewItems([]); setNewLocations([]); setNewHooks([]);
    setShowSceneForm(false);
    (e.target as HTMLFormElement).reset();
    setSaving(false);
    // Go straight to scene detail to add NPCs / encounters
    if (newScene) router.push(`/gm/campaigns/${campaignId}/scenes/${newScene.id}`);
    else await fetchScenes();
  }

  async function saveCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { error: err } = await supabase.from("campaigns").update({
      title: String(fd.get("title")),
      setting: String(fd.get("setting") ?? "") || null,
      description: String(fd.get("description") ?? "") || null,
    }).eq("id", campaignId);
    if (err) setError(err.message);
    else { await fetchCampaign(); setShowEditForm(false); }
    setSaving(false);
  }

  async function deleteScene(id: string) {
    if (!confirm("Delete this scene and all its encounters? Cannot be undone.")) return;
    await supabase.from("scenes").delete().eq("id", id);
    setScenes((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading || !user) return null;

  return (
    <>
      <section className="page-intro">
        <div style={{ marginBottom: 10 }}>
          <Link href="/gm" style={{ fontSize: "0.75rem", color: "var(--blue)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            ← Campaigns
          </Link>
        </div>
        {dataLoading ? (
          <h1>Loading…</h1>
        ) : campaign ? (
          <>
            {showEditForm ? (
              <form onSubmit={saveCampaign} className="grid" style={{ gap: 12, marginTop: 8 }}>
                <label>Title<input name="title" type="text" defaultValue={campaign.title} required /></label>
                <label>Setting<input name="setting" type="text" defaultValue={campaign.setting ?? ""} placeholder="Far-future space opera…" /></label>
                <label>Description<textarea name="description" rows={3} defaultValue={campaign.description ?? ""} placeholder="A brief synopsis…" style={{ resize: "vertical" }} /></label>
                <div className="button-row">
                  <button type="submit" className="button secondary" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
                  <button type="button" className="button ghost" onClick={() => setShowEditForm(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <h1 style={{ margin: 0, flex: 1 }}>{campaign.title}</h1>
                  <button className="button ghost" style={{ marginTop: 4, fontSize: "0.72rem" }} onClick={() => setShowEditForm(true)}>Edit</button>
                </div>
                {campaign.setting && <p style={{ color: "var(--purple)", fontFamily: "var(--font-orbitron)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 }}>{campaign.setting}</p>}
                {campaign.description && <p className="lede">{campaign.description}</p>}
              </>
            )}
          </>
        ) : (
          <h1>Campaign Not Found</h1>
        )}
      </section>

      {error && (
        <div className="status" style={{ background: "rgba(255,60,60,0.1)", borderColor: "rgba(255,80,80,0.3)", color: "#ff9999" }}>
          {error}
        </div>
      )}

      <div className="page-split-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Scenes</h2>
        <button className="button primary" onClick={() => setShowSceneForm((v) => !v)}>
          {showSceneForm ? "Cancel" : "+ Add Scene"}
        </button>
      </div>

      {showSceneForm && (
        <article className="card" style={{ marginBottom: 16 }}>
          <h3>New Scene</h3>
          <form onSubmit={addScene} className="grid" style={{ gap: 14, marginTop: 12 }}>
            <label>
              Scene Title
              <input name="title" type="text" placeholder="Ambush at Wayfarer's Rest" required />
            </label>
            <label>
              Location
              <input name="location" type="text" placeholder="Docking Bay 7, Orbital Platform" />
            </label>
            <label>
              Description
              <textarea name="description" rows={3} placeholder="Set the scene — what's happening, the mood, the stakes…" style={{ resize: "vertical" }} />
            </label>

            {/* Locations */}
            <div>
              <p style={{ fontSize: "0.72rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--blue)", marginBottom: 8 }}>📍 Locations</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: newLocations.length ? 10 : 0 }}>
                {newLocations.map((t, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(71,190,255,0.12)", border: "1px solid rgba(71,190,255,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", color: "var(--blue)" }}>
                    {t}<button type="button" onClick={() => removeTag(i, newLocations, setNewLocations)} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", padding: 0, fontSize: "0.85rem", opacity: 0.7 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); addTag(locationInput, newLocations, setNewLocations, setLocationInput); } }} placeholder="Guard post, Cargo hold…" style={{ flex: 1, fontSize: "0.82rem", padding: "6px 12px" }} />
                <button type="button" onClick={() => addTag(locationInput, newLocations, setNewLocations, setLocationInput)} className="button ghost" style={{ minHeight: 34, padding: "0 12px", fontSize: "0.72rem" }}>Add</button>
              </div>
            </div>

            {/* Items */}
            <div>
              <p style={{ fontSize: "0.72rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--yellow)", marginBottom: 8 }}>🗃 Items</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: newItems.length ? 10 : 0 }}>
                {newItems.map((t, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,204,0,0.1)", border: "1px solid rgba(255,204,0,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", color: "var(--yellow)" }}>
                    {t}<button type="button" onClick={() => removeTag(i, newItems, setNewItems)} style={{ background: "none", border: "none", color: "var(--yellow)", cursor: "pointer", padding: 0, fontSize: "0.85rem", opacity: 0.7 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input list="items-catalog" value={itemInput} onChange={(e) => setItemInput(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); addTag(itemInput, newItems, setNewItems, setItemInput); } }} placeholder="Keycard, Manifest…" style={{ flex: 1, fontSize: "0.82rem", padding: "6px 12px" }} />
                <button type="button" onClick={() => addTag(itemInput, newItems, setNewItems, setItemInput)} className="button ghost" style={{ minHeight: 34, padding: "0 12px", fontSize: "0.72rem" }}>Add</button>
                <datalist id="items-catalog">{ALL_ITEMS.map((item) => <option key={item} value={item} />)}</datalist>
              </div>
            </div>

            {/* Event Hooks */}
            <div>
              <p style={{ fontSize: "0.72rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--red)", marginBottom: 8 }}>⚡ Event Hooks</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: newHooks.length ? 10 : 0 }}>
                {newHooks.map((t, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,86,109,0.12)", border: "1px solid rgba(255,86,109,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", color: "var(--red)" }}>
                    {t}<button type="button" onClick={() => removeTag(i, newHooks, setNewHooks)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 0, fontSize: "0.85rem", opacity: 0.7 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={hookInput} onChange={(e) => setHookInput(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); addTag(hookInput, newHooks, setNewHooks, setHookInput); } }} placeholder="Alarm triggers, Betrayal…" style={{ flex: 1, fontSize: "0.82rem", padding: "6px 12px" }} />
                <button type="button" onClick={() => addTag(hookInput, newHooks, setNewHooks, setHookInput)} className="button ghost" style={{ minHeight: 34, padding: "0 12px", fontSize: "0.72rem" }}>Add</button>
              </div>
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>NPCs can be added after saving the scene.</p>
            <div className="button-row">
              <button type="submit" className="button secondary" disabled={saving}>
                {saving ? "Saving…" : "Create Scene →"}
              </button>
              <button type="button" className="button ghost" onClick={() => { setShowSceneForm(false); setNewItems([]); setNewLocations([]); setNewHooks([]); }}>Cancel</button>
            </div>
          </form>
        </article>
      )}

      {dataLoading ? (
        <p style={{ color: "var(--muted)" }}>Loading scenes…</p>
      ) : scenes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "var(--muted)" }}>No scenes yet. Add the first scene above to begin writing.</p>
        </div>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {scenes.map((scene, idx) => (
            <article key={scene.id} className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div
                style={{
                  minWidth: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(71,190,255,0.2), rgba(183,132,255,0.2))",
                  border: "1px solid rgba(71,190,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-orbitron)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--blue)",
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginBottom: 4 }}>{scene.title}</h3>
                {scene.location && (
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 6 }}>
                    📍 {scene.location}
                  </p>
                )}
                {scene.description && (
                  <p style={{ fontSize: "0.83rem", marginBottom: 10 }}>{scene.description}</p>
                )}
              </div>
              <div className="button-row" style={{ flexShrink: 0 }}>
                <Link
                  href={`/gm/campaigns/${campaignId}/scenes/${scene.id}`}
                  className="button secondary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", fontSize: "0.66rem" }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteScene(scene.id)}
                  style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff9999", borderRadius: 8, padding: "5px 10px", fontSize: "0.66rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
