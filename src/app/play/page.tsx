"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Game, Character } from "@/lib/types";

export default function PlayPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [myGameIds, setMyGameIds] = useState<Set<string>>(new Set());
  const [dataLoading, setDataLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchGames(), fetchMyChars(), fetchMyJoins()]).finally(() =>
      setDataLoading(false)
    );
  }, [user]);

  async function fetchGames() {
    const { data } = await supabase
      .from("games")
      .select("*, gm:profiles!gm_id(callsign)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (data) {
      setGames(
        data.map((g: unknown) => {
          const game = g as Game & { gm: { callsign?: string } | null };
          return {
            ...game,
            gm_callsign: game.gm?.callsign ?? "Unknown",
          };
        })
      );
    }
  }

  async function fetchMyChars() {
    if (!user) return;
    const { data } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setCharacters(data ?? []);
  }

  async function fetchMyJoins() {
    if (!user) return;
    const { data } = await supabase
      .from("game_players")
      .select("game_id")
      .eq("user_id", user.id);
    setMyGameIds(new Set((data ?? []).map((r: { game_id: string }) => r.game_id)));
  }

  async function joinGame(gameId: string) {
    if (!user) return;
    setJoinError(null);
    const { error } = await supabase
      .from("game_players")
      .insert({ game_id: gameId, user_id: user.id });
    if (error) setJoinError(error.message);
    else setMyGameIds((prev) => new Set([...prev, gameId]));
  }

  async function createGame(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("games").insert({
      name: String(fd.get("name")),
      gm_id: user.id,
      max_players: Number(fd.get("max_players") ?? 4),
      notes: String(fd.get("notes") ?? "") || null,
    });
    if (!error) {
      setShowCreate(false);
      (e.target as HTMLFormElement).reset();
      await fetchGames();
    }
    setCreating(false);
  }

  if (loading || !user) return null;

  return (
    <>
      <section className="page-intro">
        <h1>Game Lobby</h1>
        <p className="lede">
          Welcome back, <strong>{profile?.callsign ?? user.email}</strong>. Join
          an open table or launch your own session.
        </p>
      </section>

      {/* Characters quick bar */}
      <section className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
          Your Characters:
        </span>
        {characters.length === 0 && (
          <span style={{ color: "var(--muted)", fontSize: "0.86rem" }}>None yet —</span>
        )}
        {characters.map((c) => (
          <span
            key={c.id}
            style={{
              background: "rgba(71,190,255,0.12)",
              border: "1px solid rgba(71,190,255,0.3)",
              borderRadius: 10,
              padding: "5px 12px",
              fontSize: "0.84rem",
              color: "var(--blue)",
            }}
          >
            {c.name} <span style={{ opacity: 0.6, fontSize: "0.72rem" }}>({c.race})</span>
          </span>
        ))}
        <a
          href="/characters"
          style={{
            fontSize: "0.75rem",
            color: "var(--blue)",
            textDecoration: "underline",
            fontFamily: "var(--font-orbitron)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {characters.length === 0 ? "Create a character" : "Manage"}
        </a>
      </section>

      {/* Error */}
      {joinError && (
        <div className="status" style={{ background: "rgba(255,60,60,0.1)", borderColor: "rgba(255,80,80,0.3)", color: "#ff9999" }}>
          {joinError}
        </div>
      )}

      {/* Open games */}
      <section>
        <div className="page-split-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Open Tables</h2>
          <button
            className="button primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? "Cancel" : "+ Host a Game"}
          </button>
        </div>

        {showCreate && (
          <article className="card" style={{ marginBottom: 16 }}>
            <h3>New Session</h3>
            <form onSubmit={createGame} className="grid" style={{ gap: 12, marginTop: 12 }}>
              <label>
                Session Name
                <input name="name" type="text" placeholder="The Obsidian Run" required />
              </label>
              <div className="grid grid-2">
                <label>
                  Max Players
                  <input name="max_players" type="number" min={2} max={8} defaultValue={4} required />
                </label>
              </div>
              <label>
                Session Notes <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
                <textarea name="notes" rows={2} placeholder="Brief description, tone, requirements…" style={{ resize: "vertical" }} />
              </label>
              <button type="submit" className="button secondary" disabled={creating}>
                {creating ? "Creating…" : "Launch Session"}
              </button>
            </form>
          </article>
        )}

        {dataLoading ? (
          <p style={{ color: "var(--muted)" }}>Loading tables…</p>
        ) : games.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "var(--muted)", marginBottom: 8 }}>No open tables right now.</p>
            <p style={{ color: "var(--muted)", fontSize: "0.86rem" }}>Be the first to host a session above.</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {games.map((game) => {
              const joined = myGameIds.has(game.id);
              return (
                <article key={game.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <h3 style={{ marginBottom: 4 }}>{game.name}</h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      GM: <strong style={{ color: "var(--blue)" }}>{game.gm_callsign}</strong>
                    </p>
                    {game.notes && (
                      <p style={{ fontSize: "0.82rem", marginTop: 6 }}>{game.notes}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "auto" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                        fontFamily: "var(--font-orbitron)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Max {game.max_players}
                    </span>
                    <button
                      className={`button ${joined ? "ghost" : "secondary"}`}
                      onClick={() => !joined && joinGame(game.id)}
                      disabled={joined}
                      style={{ marginLeft: "auto", minHeight: 34, padding: "0 14px" }}
                    >
                      {joined ? "✓ Joined" : "Join"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}