"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Character } from "@/lib/types";

const FREE_CHAR_LIMIT = 2;

const RACES = ["Human", "Haptapian", "Foltian", "Sluginish", "Muldion", "Verscar", "Ssarax"];
const CASTES = ["Royalty", "Upper Echelon", "Lower Echelon", "Fugitive"];
const PROFESSIONS = [
  "Navigator", "Soldier", "Diplomat", "Engineer", "Medic",
  "Infiltrator", "Merchant", "Scholar", "Pilot", "Bounty Hunter",
];

function StatInput({ name, label }: { name: string; label: string }) {
  return (
    <label style={{ textAlign: "center" }}>
      <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>{label}</span>
      <input
        name={name}
        type="number"
        min={1}
        max={10}
        defaultValue={1}
        required
        style={{ textAlign: "center", padding: "8px 4px", fontSize: "1.1rem" }}
      />
    </label>
  );
}

export default function CharactersPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetchCharacters();
  }, [user]);

  async function fetchCharacters() {
    if (!user) return;
    const { data } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setCharacters(data ?? []);
    setDataLoading(false);
  }

  async function createCharacter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    if (characters.length >= FREE_CHAR_LIMIT) {
      setError(`Free accounts are limited to ${FREE_CHAR_LIMIT} characters.`);
      return;
    }
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const vigor = Number(fd.get("vigor") ?? 1);
    const { error: insertError } = await supabase.from("characters").insert({
      user_id: user.id,
      name: String(fd.get("name")),
      race: String(fd.get("race")),
      caste: String(fd.get("caste")),
      profession: String(fd.get("profession")),
      strength: Number(fd.get("strength") ?? 1),
      vigor,
      genius: Number(fd.get("genius") ?? 1),
      cunning: Number(fd.get("cunning") ?? 1),
      aura: Number(fd.get("aura") ?? 1),
      max_hp: vigor * 5 + 5,
      current_hp: vigor * 5 + 5,
      backstory: String(fd.get("backstory") ?? "") || null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      await fetchCharacters();
    }
    setSaving(false);
  }

  async function deleteCharacter(id: string) {
    if (!confirm("Delete this character? This cannot be undone.")) return;
    await supabase.from("characters").delete().eq("id", id);
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading || !user) return null;

  const atLimit = characters.length >= FREE_CHAR_LIMIT;

  return (
    <>
      <section className="page-intro">
        <h1>Characters</h1>
        <p className="lede">
          Manage your crew, {profile?.callsign ?? "Commander"}. Free accounts can maintain up to{" "}
          <strong>{FREE_CHAR_LIMIT}</strong> characters.
        </p>
      </section>

      {error && (
        <div className="status" style={{ background: "rgba(255,60,60,0.1)", borderColor: "rgba(255,80,80,0.3)", color: "#ff9999" }}>
          {error}
        </div>
      )}

      {/* Character cards */}
      {dataLoading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : (
        <div className="grid grid-2">
          {characters.map((c) => (
            <article key={c.id} className="char-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <h2 style={{ marginBottom: 2 }}>{c.name}</h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {c.race} · {c.caste} · {c.profession}
                  </p>
                </div>
                <span
                  style={{
                    background: "rgba(71,190,255,0.12)",
                    border: "1px solid rgba(71,190,255,0.25)",
                    borderRadius: 8,
                    padding: "3px 10px",
                    fontSize: "0.7rem",
                    color: "var(--blue)",
                    fontFamily: "var(--font-orbitron)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  HP {c.current_hp}/{c.max_hp}
                </span>
              </div>

              <div className="char-stats">
                {[
                  { key: "strength", label: "STR", val: c.strength },
                  { key: "vigor",    label: "VIG", val: c.vigor },
                  { key: "genius",   label: "GEN", val: c.genius },
                  { key: "cunning",  label: "CUN", val: c.cunning },
                  { key: "aura",     label: "AUR", val: c.aura },
                ].map(({ key, label, val }) => (
                  <div key={key} className="stat-pip">
                    <div className="val">{val}</div>
                    <div className="lbl">{label}</div>
                  </div>
                ))}
              </div>

              {c.backstory && (
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4 }}>
                  {c.backstory}
                </p>
              )}

              <button
                onClick={() => deleteCharacter(c.id)}
                style={{
                  marginTop: 12,
                  background: "rgba(255,60,60,0.1)",
                  border: "1px solid rgba(255,80,80,0.25)",
                  color: "#ff9999",
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontSize: "0.68rem",
                  fontFamily: "var(--font-orbitron)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </article>
          ))}

          {/* Slot placeholders */}
          {Array.from({ length: Math.max(0, FREE_CHAR_LIMIT - characters.length) }).map((_, i) => (
            <article
              key={`empty-${i}`}
              className="char-card"
              style={{
                border: "1px dashed rgba(220,231,246,0.18)",
                background: "rgba(255,255,255,0.02)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 160,
                cursor: "pointer",
              }}
              onClick={() => setShowForm(true)}
            >
              <span style={{ color: "var(--muted)", fontSize: "0.82rem", textAlign: "center" }}>
                Empty Slot<br />
                <span style={{ color: "var(--blue)", fontSize: "0.75rem" }}>+ Create Character</span>
              </span>
            </article>
          ))}
        </div>
      )}

      {/* Create button */}
      {!atLimit && !showForm && (
        <div>
          <button className="button primary" onClick={() => setShowForm(true)}>
            + New Character
          </button>
        </div>
      )}

      {/* Creation form */}
      {showForm && (
        <article className="card">
          <h2>New Character</h2>
          <form onSubmit={createCharacter} className="grid" style={{ gap: 16, marginTop: 14 }}>
            <div className="grid grid-2">
              <label>
                Character Name
                <input name="name" type="text" placeholder="Zara Vol" required />
              </label>
              <label>
                Race
                <select name="race" required>
                  {RACES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-2">
              <label>
                Caste
                <select name="caste" required>
                  {CASTES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>
                Profession
                <select name="profession" required>
                  {PROFESSIONS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
            </div>

            {/* Stat grid */}
            <div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 10, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ability Scores (1–10)
              </p>
              <div className="stat-input-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                <StatInput name="strength" label="Strength" />
                <StatInput name="vigor" label="Vigor" />
                <StatInput name="genius" label="Genius" />
                <StatInput name="cunning" label="Cunning" />
                <StatInput name="aura" label="Aura" />
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 6 }}>
                HP is calculated automatically from Vigor (Vigor × 5 + 5).
              </p>
            </div>

            <label>
              Backstory <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
              <textarea name="backstory" rows={3} placeholder="A brief history of this character…" style={{ resize: "vertical" }} />
            </label>

            <div className="button-row">
              <button type="submit" className="button primary" disabled={saving}>
                {saving ? "Saving…" : "Create Character"}
              </button>
              <button type="button" className="button ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </article>
      )}
    </>
  );
}
