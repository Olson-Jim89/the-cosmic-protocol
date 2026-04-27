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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [joinTargetGameId, setJoinTargetGameId] = useState<string | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string>("");
  const [joining, setJoining] = useState(false);

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
      .select("*, game_players(user_id)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (data) {
      setGames(
        data.map((g: unknown) => {
          const game = g as Game & { game_players: { user_id: string }[] };
          return {
            ...game,
            gm_callsign: "GM",
            player_count: game.game_players?.length ?? 0,
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

  function openJoinModal(gameId: string) {
    setJoinTargetGameId(gameId);
    setSelectedCharId(characters[0]?.id ?? "");
    setJoinError(null);
  }

  async function confirmJoin() {
    if (!user || !joinTargetGameId) return;
    setJoining(true);
    setJoinError(null);
    const { error } = await supabase.from("game_players").insert({
      game_id: joinTargetGameId,
      user_id: user.id,
      callsign: profile?.callsign ?? "Unknown",
      character_id: selectedCharId || null,
    });
    if (error) {
      setJoinError(error.message);
      setJoining(false);
    } else {
      setJoinTargetGameId(null);
      router.push(`/play/${joinTargetGameId}`);
    }
  }

  async function deleteGame(gameId: string) {
    if (!user) return;
    await supabase.from("games").delete().eq("id", gameId).eq("gm_id", user.id);
    setConfirmDeleteId(null);
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setMyGameIds((prev) => { const s = new Set(prev); s.delete(gameId); return s; });
  }

  async function createGame(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    const { data: newGame, error } = await supabase.from("games").insert({
      name: String(fd.get("name")),
      gm_id: user.id,
      max_players: Number(fd.get("max_players") ?? 4),
      notes: String(fd.get("notes") ?? "") || null,
    }).select().single();
    if (!error && newGame) {
      // Auto-join GM as a player so RLS allows them to chat
      await supabase.from("game_players").insert({ game_id: newGame.id, user_id: user.id, callsign: profile?.callsign ?? "Unknown" });
      router.push(`/play/${newGame.id}`);
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
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "auto", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                        fontFamily: "var(--font-orbitron)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      {game.player_count ?? 0}/{game.max_players} players
                    </span>
                    {joined ? (
                      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                        <button
                          className="button primary"
                          onClick={() => router.push(`/play/${game.id}`)}
                          style={{ minHeight: 34, padding: "0 16px", fontSize: "0.72rem" }}
                        >
                          ✓ Enter Lobby
                        </button>
                        {game.gm_id === user.id && (
                          confirmDeleteId === game.id ? (
                            <>
                              <button
                                onClick={() => deleteGame(game.id)}
                                style={{ minHeight: 34, padding: "0 12px", fontSize: "0.72rem", background: "rgba(255,60,60,0.2)", border: "1px solid rgba(255,80,80,0.4)", color: "#ff9999", borderRadius: 10, cursor: "pointer" }}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                style={{ minHeight: 34, padding: "0 12px", fontSize: "0.72rem", background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", borderRadius: 10, cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(game.id)}
                              style={{ minHeight: 34, padding: "0 12px", fontSize: "0.72rem", background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff9999", borderRadius: 10, cursor: "pointer" }}
                            >
                              Delete
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <button
                        className="button secondary"
                        onClick={() => openJoinModal(game.id)}
                        disabled={(game.player_count ?? 0) >= game.max_players}
                        style={{ marginLeft: "auto", minHeight: 34, padding: "0 16px" }}
                      >
                        {(game.player_count ?? 0) >= game.max_players ? "Full" : "Join"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {/* Join modal */}
      {joinTargetGameId && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => !joining && setJoinTargetGameId(null)}
        >
          <article className="card" style={{ maxWidth: 420, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 6 }}>Join Table</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.86rem", marginBottom: 20 }}>
              Select the character you want to bring to this session.
            </p>

            {characters.length === 0 ? (
              <div style={{ background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
                <p style={{ color: "var(--yellow)", fontSize: "0.84rem", margin: 0 }}>
                  You have no characters yet.{" "}
                  <a href="/characters" style={{ color: "var(--blue)", textDecoration: "underline" }}>Create one</a>
                  {" "}or join without one.
                </p>
              </div>
            ) : (
              <label style={{ marginBottom: 20 }}>
                Character
                <select
                  value={selectedCharId}
                  onChange={(e) => setSelectedCharId(e.target.value)}
                  style={{ marginTop: 6 }}
                >
                  <option value="">— No character (spectator) —</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.race} {c.caste}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {joinError && (
              <p style={{ color: "#ff9999", fontSize: "0.82rem", marginBottom: 14 }}>⚠ {joinError}</p>
            )}

            <div className="button-row">
              <button className="button primary" onClick={confirmJoin} disabled={joining}>
                {joining ? "Joining…" : "Join Session"}
              </button>
              <button className="button ghost" onClick={() => setJoinTargetGameId(null)} disabled={joining}>
                Cancel
              </button>
            </div>
          </article>
        </div>
      )}
    </>
  );
}