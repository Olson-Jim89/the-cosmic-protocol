"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Character } from "@/lib/types";

const FREE_CHAR_LIMIT = 2;

export default function CharactersPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("characters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setCharacters(data ?? []);
        setDataLoading(false);
      });
  }, [user]);

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

              <div className="button-row" style={{ marginTop: 12 }}>
                <button
                  className="button primary"
                  style={{ fontSize: "0.72rem", padding: "6px 14px" }}
                  onClick={() => router.push(`/character-sheet?id=${c.id}`)}
                >
                  Open Sheet
                </button>
                <button
                  onClick={() => deleteCharacter(c.id)}
                  style={{
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
              </div>
            </article>
          ))}

          {/* Empty slot placeholders */}
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
              onClick={() => router.push("/character-sheet")}
            >
              <span style={{ color: "var(--muted)", fontSize: "0.82rem", textAlign: "center" }}>
                Empty Slot<br />
                <span style={{ color: "var(--blue)", fontSize: "0.75rem" }}>+ Create Character</span>
              </span>
            </article>
          ))}
        </div>
      )}

      {!atLimit && (
        <div style={{ marginTop: 16 }}>
          <button className="button primary" onClick={() => router.push("/character-sheet")}>
            + New Character
          </button>
        </div>
      )}
    </>
  );
}
