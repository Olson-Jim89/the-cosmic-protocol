"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Campaign, Scene } from "@/lib/types";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showSceneForm, setShowSceneForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const { error: err } = await supabase.from("scenes").insert({
      campaign_id: campaignId,
      title: String(fd.get("title")),
      description: String(fd.get("description") ?? "") || null,
      location: String(fd.get("location") ?? "") || null,
      scene_order: scenes.length,
    });
    if (err) setError(err.message);
    else {
      setShowSceneForm(false);
      (e.target as HTMLFormElement).reset();
      await fetchScenes();
    }
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
            <h1>{campaign.title}</h1>
            {campaign.setting && <p style={{ color: "var(--purple)", fontFamily: "var(--font-orbitron)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{campaign.setting}</p>}
            {campaign.description && <p className="lede">{campaign.description}</p>}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
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
            <div className="button-row">
              <button type="submit" className="button secondary" disabled={saving}>
                {saving ? "Saving…" : "Add Scene"}
              </button>
              <button type="button" className="button ghost" onClick={() => setShowSceneForm(false)}>Cancel</button>
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
