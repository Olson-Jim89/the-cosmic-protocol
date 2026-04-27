"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/lib/types";

export default function GmPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetchCampaigns().finally(() => setDataLoading(false));
  }, [user]);

  async function fetchCampaigns() {
    if (!user) return;
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("gm_id", user.id)
      .order("created_at", { ascending: false });
    setCampaigns(data ?? []);
  }

  async function createCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { error: err } = await supabase.from("campaigns").insert({
      gm_id: user.id,
      title: String(fd.get("title")),
      description: String(fd.get("description") ?? "") || null,
      setting: String(fd.get("setting") ?? "") || null,
    });
    if (err) setError(err.message);
    else {
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      await fetchCampaigns();
    }
    setSaving(false);
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign and all its scenes/encounters? This cannot be undone.")) return;
    await supabase.from("campaigns").delete().eq("id", id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading || !user) return null;

  return (
    <>
      <section className="page-intro">
        <h1>GM Tools</h1>
        <p className="lede">
          Write campaigns, craft scenes, deploy NPCs, and design encounters — all in one place.
        </p>
      </section>

      {error && (
        <div className="status" style={{ background: "rgba(255,60,60,0.1)", borderColor: "rgba(255,80,80,0.3)", color: "#ff9999" }}>
          {error}
        </div>
      )}

      <div className="page-split-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Your Campaigns</h2>
        <button className="button primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Campaign"}
        </button>
      </div>

      {showForm && (
        <article className="card" style={{ marginBottom: 18 }}>
          <h3>New Campaign</h3>
          <form onSubmit={createCampaign} className="grid" style={{ gap: 14, marginTop: 12 }}>
            <label>
              Campaign Title
              <input name="title" type="text" placeholder="The Obsidian Veil Chronicles" required />
            </label>
            <div className="grid grid-2">
              <label>
                Setting / Era
                <input name="setting" type="text" placeholder="Age of the Trade Expanse" />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" rows={3} placeholder="A brief synopsis of the campaign…" style={{ resize: "vertical" }} />
            </label>
            <div className="button-row">
              <button type="submit" className="button primary" disabled={saving}>
                {saving ? "Creating…" : "Create Campaign"}
              </button>
              <button type="button" className="button ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </article>
      )}

      {dataLoading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--muted)" }}>No campaigns yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {campaigns.map((camp) => (
            <article key={camp.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{camp.title}</h3>
                {camp.setting && (
                  <span style={{ fontSize: "0.7rem", color: "var(--purple)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {camp.setting}
                  </span>
                )}
                {camp.description && (
                  <p style={{ marginTop: 8, fontSize: "0.84rem" }}>{camp.description}</p>
                )}
              </div>
              <div className="button-row" style={{ marginTop: "auto" }}>
                <Link href={`/gm/campaigns/${camp.id}`} className="button secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 34, padding: "0 14px", fontSize: "0.68rem" }}>
                  Open
                </Link>
                <button
                  onClick={() => deleteCampaign(camp.id)}
                  style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,80,80,0.25)", color: "#ff9999", borderRadius: 8, padding: "5px 12px", fontSize: "0.68rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
