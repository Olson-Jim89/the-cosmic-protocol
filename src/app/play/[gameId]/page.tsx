"use client";

import { useCallback, useEffect, useRef, useState, KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { Game, Encounter, Enemy, Character, InitiativeEntry } from "@/lib/types";

interface Member {
  user_id: string;
  callsign: string;
  character_id: string | null;
  character_name: string | null;
  character_race: string | null;
}

interface Message {
  id: number;
  user_id: string;
  callsign: string;
  body: string;
  created_at: string;
}

interface EncounterOption {
  id: string;
  title: string;
  scene_title: string;
  campaign_title: string;
}

const ENEMY_TYPE_COLOR: Record<string, string> = {
  minion:   "rgba(255,255,255,0.08)",
  standard: "rgba(71,190,255,0.12)",
  elite:    "rgba(255,200,0,0.12)",
  boss:     "rgba(255,60,60,0.12)",
};

const ENEMY_TYPE_TEXT: Record<string, string> = {
  minion:   "var(--muted)",
  standard: "var(--blue)",
  elite:    "var(--yellow)",
  boss:     "var(--red)",
};

export default function GameLobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Encounter broadcast state
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [activeEnemies, setActiveEnemies] = useState<Enemy[]>([]);
  const [encounterOptions, setEncounterOptions] = useState<EncounterOption[]>([]);
  const [selectedEncId, setSelectedEncId] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const enemyChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Character sheet viewer
  const [sheetMember, setSheetMember] = useState<{ callsign: string; character: Character } | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Initiative tracker
  const [initEntries, setInitEntries] = useState<InitiativeEntry[]>([]);
  const [newInitLabel, setNewInitLabel] = useState("");
  const [newInitValue, setNewInitValue] = useState(10);
  const initChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function openSheet(m: Member) {
    if (!m.character_id) return;
    setSheetLoading(true);
    setSheetMember(null);
    const { data } = await supabase.from("characters").select("*").eq("id", m.character_id).single();
    if (data) setSheetMember({ callsign: m.callsign, character: data as Character });
    setSheetLoading(false);
  }

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.replace("/accounts");
  }, [loading, user, router]);

  // Load game, members, messages
  useEffect(() => {
    if (!user) return;

    async function load() {
      // Fetch game details
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();
      setGame(gameData ?? null);

      // Ensure current user's callsign is stored in game_players
      if (profile?.callsign && user) {
        await supabase
          .from("game_players")
          .update({ callsign: profile.callsign })
          .eq("game_id", gameId)
          .eq("user_id", user.id);
      }

      // Fetch members directly from game_players (callsign stored at join time)
      const { data: playerData } = await supabase
        .from("game_players")
        .select("user_id, callsign, character_id, characters(name, race)")
        .eq("game_id", gameId);

      setMembers(
        (playerData ?? []).map((p: { user_id: string; callsign?: string; character_id?: string | null; characters?: { name: string; race: string }[] | null }) => ({
          user_id: p.user_id,
          callsign: p.callsign ?? "Unknown",
          character_id: p.character_id ?? null,
          character_name: p.characters?.[0]?.name ?? null,
          character_race: p.characters?.[0]?.race ?? null,
        }))
      );

      // Fetch message history
      const { data: msgData } = await supabase
        .from("game_messages")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages(msgData ?? []);
      setDataLoading(false);
    }

    load();

    // Realtime: new messages
    const channel = supabase
      .channel(`game-lobby-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_messages", filter: `game_id=eq.${gameId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      // Realtime: player joins/leaves
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` },
        () => {
          // Re-fetch members (callsign stored in game_players)
          supabase
            .from("game_players")
            .select("user_id, callsign, character_id, characters(name, race)")
            .eq("game_id", gameId)
            .then(({ data: pd }) => {
              setMembers(
                (pd ?? []).map((p: { user_id: string; callsign?: string; character_id?: string | null; characters?: { name: string; race: string }[] | null }) => ({
                  user_id: p.user_id,
                  callsign: p.callsign ?? "Unknown",
                  character_id: p.character_id ?? null,
                  character_name: p.characters?.[0]?.name ?? null,
                  character_race: p.characters?.[0]?.race ?? null,
                }))
              );
            });
        }
      )
      // Realtime: game row updates (active_encounter_id changes)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => setGame(payload.new as Game)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (enemyChannelRef.current) supabase.removeChannel(enemyChannelRef.current);
    };
  }, [user, profile, gameId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load active encounter + subscribe to enemy changes
  const loadActiveEncounter = useCallback(async (encId: string | null | undefined) => {
    if (enemyChannelRef.current) {
      supabase.removeChannel(enemyChannelRef.current);
      enemyChannelRef.current = null;
    }
    if (!encId) {
      setActiveEncounter(null);
      setActiveEnemies([]);
      return;
    }
    const [{ data: enc }, { data: enms }] = await Promise.all([
      supabase.from("encounters").select("*").eq("id", encId).single(),
      supabase.from("enemies").select("*").eq("encounter_id", encId),
    ]);
    setActiveEncounter(enc ?? null);
    setActiveEnemies(enms ?? []);

    const ch = supabase
      .channel(`active-enemies-${encId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enemies", filter: `encounter_id=eq.${encId}` },
        () => {
          supabase
            .from("enemies")
            .select("*")
            .eq("encounter_id", encId)
            .then(({ data }) => setActiveEnemies(data ?? []));
        }
      )
      .subscribe();
    enemyChannelRef.current = ch;
  }, []);

  // Reload whenever the active encounter changes
  useEffect(() => {
    loadActiveEncounter(game?.active_encounter_id ?? null);
  }, [game?.active_encounter_id, loadActiveEncounter]);

  // Load GM's encounter options
  useEffect(() => {
    if (!user || !game || game.gm_id !== user.id) return;
    supabase
      .from("encounters")
      .select("id, title, scenes(title, campaigns(title))")
      .then(({ data }) => {
        const opts: EncounterOption[] = (data ?? []).map((e: Record<string, unknown>) => {
          const scene = e.scenes as Record<string, unknown> | null;
          const campaign = scene?.campaigns as Record<string, unknown> | null;
          return {
            id: e.id as string,
            title: e.title as string,
            scene_title: (scene?.title as string) ?? "Scene",
            campaign_title: (campaign?.title as string) ?? "Campaign",
          };
        });
        setEncounterOptions(opts);
        if (!selectedEncId && opts.length > 0) setSelectedEncId(opts[0].id);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, game?.id, game?.gm_id]);

  // Load initiative entries + subscribe to realtime changes
  useEffect(() => {
    if (!user) return;
    const load = () =>
      supabase.from("initiative_entries").select("*").eq("game_id", gameId)
        .then(({ data }) => setInitEntries(data ?? []));
    load();
    const ch = supabase
      .channel(`initiative-${gameId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "initiative_entries", filter: `game_id=eq.${gameId}` },
        load
      )
      .subscribe();
    initChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user, gameId]);

  async function adjustLiveHp(en: Enemy, delta: number) {
    const cur = en.current_hp ?? en.hp;
    const next = Math.max(0, Math.min(en.hp, cur + delta));
    setActiveEnemies((prev) => prev.map((e) => e.id === en.id ? { ...e, current_hp: next } : e));
    await supabase.from("enemies").update({ current_hp: next }).eq("id", en.id);
  }

  async function adjustLiveSta(en: Enemy, delta: number) {
    const cur = en.current_sta ?? en.sta;
    const next = Math.max(0, Math.min(en.sta, cur + delta));
    setActiveEnemies((prev) => prev.map((e) => e.id === en.id ? { ...e, current_sta: next } : e));
    await supabase.from("enemies").update({ current_sta: next }).eq("id", en.id);
  }

  async function addInitEntry() {
    if (!newInitLabel.trim()) return;
    await supabase.from("initiative_entries").insert({
      game_id: gameId,
      label: newInitLabel.trim(),
      initiative: newInitValue,
      is_active: false,
      sort_order: initEntries.length,
    });
    setNewInitLabel("");
  }

  async function removeInitEntry(id: string) {
    await supabase.from("initiative_entries").delete().eq("id", id);
  }

  async function advanceTurn() {
    if (initEntries.length === 0) return;
    const sorted = [...initEntries].sort((a, b) => b.initiative - a.initiative || a.sort_order - b.sort_order);
    const curIdx = sorted.findIndex((e) => e.is_active);
    const nextIdx = curIdx === -1 || curIdx === sorted.length - 1 ? 0 : curIdx + 1;
    await supabase.from("initiative_entries").update({ is_active: false }).eq("game_id", gameId);
    await supabase.from("initiative_entries").update({ is_active: true }).eq("id", sorted[nextIdx].id);
  }

  async function clearInit() {
    await supabase.from("initiative_entries").delete().eq("game_id", gameId);
  }

  async function broadcastEncounter() {    if (!selectedEncId) return;
    setBroadcasting(true);
    await supabase.from("games").update({ active_encounter_id: selectedEncId }).eq("id", gameId);
    setBroadcasting(false);
  }

  async function endBroadcast() {
    setBroadcasting(true);
    await supabase.from("games").update({ active_encounter_id: null }).eq("id", gameId);
    setBroadcasting(false);
  }

  async function sendMessage() {
    const body = input.trim();
    if (!body || !user || !profile) return;
    setSending(true);
    setSendError(null);
    setInput("");
    const { data, error } = await supabase.from("game_messages").insert({
      game_id: gameId,
      user_id: user.id,
      callsign: profile.callsign,
      body,
    }).select().single();
    if (error) {
      setSendError(error.message);
      setInput(body); // restore input on failure
    } else if (data) {
      // Add locally in case realtime is slow
      setMessages((prev) =>
        prev.some((m) => m.id === (data as Message).id) ? prev : [...prev, data as Message]
      );
    }
    setSending(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function leaveGame() {
    if (!user) return;
    setLeaving(true);
    await supabase
      .from("game_players")
      .delete()
      .eq("game_id", gameId)
      .eq("user_id", user.id);
    setLeaving(false);
    setShowLeaveModal(false);
    router.push("/play");
  }

  async function deleteGame() {
    if (!user) return;
    setDeleting(true);
    await supabase.from("games").delete().eq("id", gameId).eq("gm_id", user.id);
    setDeleting(false);
    setShowDeleteModal(false);
    router.push("/play");
  }

  if (loading || !user) return null;

  const isGM = game?.gm_id === user.id;
  const activeEncId = game?.active_encounter_id;

  return (
    <>
      {/* Header */}
      <section className="page-intro" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{dataLoading ? "Loading…" : (game?.name ?? "Game Lobby")}</h1>
          <p className="lede" style={{ margin: 0 }}>
            Game lobby — {members.length} {members.length === 1 ? "member" : "members"} present
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="button ghost" onClick={() => router.push("/play")}>
            ← Back to Lobby
          </button>
          {game?.gm_id === user.id ? (
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                background: "rgba(255,60,60,0.1)",
                border: "1px solid rgba(255,80,80,0.3)",
                color: "#ff9999",
                borderRadius: 10,
                padding: "7px 16px",
                fontSize: "0.72rem",
                fontFamily: "var(--font-orbitron)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                cursor: "pointer",
              }}
            >
              Delete Game
            </button>
          ) : !dataLoading ? (
            <button
              onClick={() => setShowLeaveModal(true)}
              style={{
                background: "rgba(255,60,60,0.1)",
                border: "1px solid rgba(255,80,80,0.3)",
                color: "#ff9999",
                borderRadius: 10,
                padding: "7px 16px",
                fontSize: "0.72rem",
                fontFamily: "var(--font-orbitron)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                cursor: "pointer",
              }}
            >
              Leave Game
            </button>
          ) : null}
        </div>
      </section>

      {/* Leave confirmation modal */}
      {showLeaveModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => !leaving && setShowLeaveModal(false)}
        >
          <article
            className="card"
            style={{ maxWidth: 400, width: "90%", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 10 }}>Leave Game?</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: "0.9rem" }}>
              You will be removed from <strong>{game?.name}</strong>. You can rejoin from the lobby if the table is still open.
            </p>
            <div className="button-row" style={{ justifyContent: "center" }}>
              <button
                onClick={leaveGame}
                disabled={leaving}
                style={{
                  background: "rgba(255,60,60,0.15)",
                  border: "1px solid rgba(255,80,80,0.4)",
                  color: "#ff9999",
                  borderRadius: 10,
                  padding: "8px 20px",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-orbitron)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  cursor: "pointer",
                }}
              >
                {leaving ? "Leaving…" : "Yes, Leave"}
              </button>
              <button className="button ghost" onClick={() => setShowLeaveModal(false)} disabled={leaving}>
                Cancel
              </button>
            </div>
          </article>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <article
            className="card"
            style={{ maxWidth: 400, width: "90%", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 10 }}>Delete Game?</h2>
            <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: "0.9rem" }}>
              This will permanently delete <strong>{game?.name}</strong> and remove all players. This cannot be undone.
            </p>
            <div className="button-row" style={{ justifyContent: "center" }}>
              <button
                onClick={deleteGame}
                disabled={deleting}
                style={{
                  background: "rgba(255,60,60,0.15)",
                  border: "1px solid rgba(255,80,80,0.4)",
                  color: "#ff9999",
                  borderRadius: 10,
                  padding: "8px 20px",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-orbitron)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  cursor: "pointer",
                }}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button className="button ghost" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancel
              </button>
            </div>
          </article>
        </div>
      )}

      {/* ── ACTIVE ENCOUNTER ─────────────────────────────── */}
      <section className="card">
        {/* Header + GM controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {activeEncId ? (
              <>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--red)", boxShadow: "0 0 8px rgba(255,60,60,0.8)", marginRight: 8, verticalAlign: "middle" }} />
                Live Encounter
              </>
            ) : "Encounter Broadcast"}
          </h2>

          {isGM && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={selectedEncId}
                onChange={(e) => setSelectedEncId(e.target.value)}
                style={{ minWidth: 280, margin: 0, fontSize: "0.82rem", padding: "6px 10px" }}
                disabled={encounterOptions.length === 0}
              >
                {encounterOptions.length === 0 ? (
                  <option value="">No encounters found — create one in your campaign</option>
                ) : (
                  encounterOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.campaign_title} › {opt.scene_title} › {opt.title}
                    </option>
                  ))
                )}
              </select>
              {!activeEncId ? (
                <button
                  className="button primary"
                  style={{ padding: "6px 18px", fontSize: "0.75rem" }}
                  onClick={broadcastEncounter}
                  disabled={broadcasting || !selectedEncId || encounterOptions.length === 0}
                >
                  {broadcasting ? "Starting…" : "▶ Go Live"}
                </button>
              ) : (
                <>
                  <button
                    className="button secondary"
                    style={{ padding: "6px 16px", fontSize: "0.75rem" }}
                    onClick={broadcastEncounter}
                    disabled={broadcasting || selectedEncId === activeEncId}
                  >
                    Switch
                  </button>
                  <button
                    style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff9999", borderRadius: 10, padding: "6px 16px", fontSize: "0.72rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer" }}
                    onClick={endBroadcast}
                    disabled={broadcasting}
                  >
                    {broadcasting ? "Ending…" : "■ End"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* No active encounter */}
        {!activeEncId && (
          <p style={{ color: "var(--muted)", fontSize: "0.84rem", margin: 0 }}>
            {isGM
              ? "Select an encounter above and click Go Live to broadcast it to all players."
              : "No active encounter — waiting for the GM to start one."}
          </p>
        )}

        {/* Active encounter content */}
        {activeEncId && activeEncounter && (
          <>
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ marginBottom: 4 }}>{activeEncounter.title}</h3>
              {activeEncounter.description && (
                <p style={{ color: "var(--muted)", fontSize: "0.84rem", margin: 0 }}>{activeEncounter.description}</p>
              )}
            </div>
            {activeEnemies.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.84rem" }}>No enemies defined for this encounter.</p>
            ) : (
              <div className="grid grid-2" style={{ gap: 12 }}>
                {activeEnemies.map((en) => (
                  <article key={en.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ marginBottom: 10 }}>
                      <h4 style={{ marginBottom: 4, fontSize: "0.95rem" }}>
                        {en.name}
                        <span style={{ marginLeft: 8, fontSize: "0.65rem", padding: "2px 8px", borderRadius: 6, background: ENEMY_TYPE_COLOR[en.enemy_type ?? "standard"], fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: ENEMY_TYPE_TEXT[en.enemy_type ?? "standard"] }}>
                          {en.enemy_type ?? "standard"}
                        </span>
                      </h4>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: 0 }}>
                        Count: <strong style={{ color: "var(--text)" }}>{en.count}</strong>
                      </p>
                    </div>
                    {/* HP / STA live bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                      {([
                        { label: "HP",  cur: en.current_hp ?? en.hp,  max: en.hp,  color: "var(--red)",  adjH: (d: number) => adjustLiveHp(en, d) },
                        { label: "STA", cur: en.current_sta ?? en.sta, max: en.sta, color: "var(--blue)", adjH: (d: number) => adjustLiveSta(en, d) },
                      ]).map(({ label, cur, max, color, adjH }) => (
                        <div key={label}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>{label}</span>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color }}>{cur} / {max}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: isGM ? 5 : 0 }}>
                            <div style={{ height: "100%", borderRadius: 4, background: color, width: `${max > 0 ? Math.round((cur / max) * 100) : 0}%`, transition: "width 0.2s" }} />
                          </div>
                          {isGM && (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => adjH(-10)} style={{ flex: 1, background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff9999", borderRadius: 6, cursor: "pointer", fontSize: "0.65rem", padding: "2px 0", fontFamily: "var(--font-orbitron)" }}>−10</button>
                              <button onClick={() => adjH(-1)}  style={{ flex: 1, background: "rgba(255,60,60,0.1)",  border: "1px solid rgba(255,80,80,0.2)", color: "#ff9999", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", padding: "2px 0" }}>−</button>
                              <button onClick={() => adjH(1)}   style={{ flex: 1, background: "rgba(89,221,157,0.1)", border: "1px solid rgba(89,221,157,0.25)", color: "var(--green)", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", padding: "2px 0" }}>+</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* ARM / MOV */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                      {([["ARM", en.arm, "var(--text)"], ["MOV", en.mov ? `${en.mov}ft` : "—", "var(--green)"]] as [string, string|number, string][]).map(([l, v, c]) => (
                        <div key={l} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "5px 4px" }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: c }}>{v ?? 0}</div>
                          <div style={{ fontSize: "0.58rem", color: "var(--muted)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Attributes */}
                    <div className="char-stats">
                      {(
                        [["STR", en.strength], ["AGI", en.agility], ["VIG", en.vigor], ["GEN", en.genius], ["CUN", en.cunning], ["AUR", en.aura]] as [string, number][]
                      ).map(([l, v]) => (
                        <div key={l} className="stat-pip">
                          <div className="val">{v ?? 10}</div>
                          <div className="lbl">{l}</div>
                        </div>
                      ))}
                    </div>
                    {en.notes && (
                      <p style={{ fontSize: "0.76rem", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 8 }}>{en.notes}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── INITIATIVE TRACKER ─────────────────────────────── */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ⚔ Initiative Order
          </h2>
          {isGM && initEntries.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button primary"
                style={{ padding: "6px 16px", fontSize: "0.75rem" }}
                onClick={advanceTurn}
              >
                ▶ Next Turn
              </button>
              <button
                style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff9999", borderRadius: 10, padding: "6px 14px", fontSize: "0.72rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer" }}
                onClick={clearInit}
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>

        {/* Add entry form (GM only) */}
        {isGM && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input
              type="text"
              value={newInitLabel}
              onChange={(e) => setNewInitLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addInitEntry()}
              placeholder="Name — e.g. Kael, Bandit × 3, Turret"
              style={{ flex: 1, minWidth: 180, margin: 0, fontSize: "0.82rem", padding: "6px 10px" }}
            />
            <input
              type="number"
              value={newInitValue}
              onChange={(e) => setNewInitValue(Number(e.target.value))}
              title="Initiative value"
              style={{ width: 72, margin: 0, fontSize: "0.82rem", padding: "6px 10px" }}
              min={-99} max={99}
            />
            <button
              className="button secondary"
              style={{ padding: "6px 16px", fontSize: "0.75rem" }}
              onClick={addInitEntry}
              disabled={!newInitLabel.trim()}
            >
              + Add
            </button>
          </div>
        )}

        {/* Initiative list */}
        {initEntries.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.84rem", margin: 0 }}>
            {isGM
              ? "Add combatants above to build the turn order."
              : "Waiting for the GM to set initiative order."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...initEntries]
              .sort((a, b) => b.initiative - a.initiative || a.sort_order - b.sort_order)
              .map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: entry.is_active ? "rgba(255,200,0,0.12)" : "rgba(255,255,255,0.03)",
                    border: entry.is_active ? "1px solid rgba(255,200,0,0.4)" : "1px solid var(--line)",
                    transition: "background 0.2s, border 0.2s",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-orbitron)", minWidth: 18, textAlign: "right" }}>
                    {idx + 1}
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, transition: "all 0.2s", background: entry.is_active ? "var(--yellow)" : "rgba(255,255,255,0.2)", boxShadow: entry.is_active ? "0 0 8px rgba(255,200,0,0.8)" : "none" }} />
                  <span style={{ flex: 1, fontSize: "0.9rem", fontWeight: entry.is_active ? 700 : 400, color: entry.is_active ? "var(--yellow)" : "var(--text)" }}>
                    {entry.label}
                  </span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--blue)", fontFamily: "var(--font-orbitron)", minWidth: 32, textAlign: "right" }}>
                    {entry.initiative}
                  </span>
                  {isGM && (
                    <button
                      onClick={() => removeInitEntry(entry.id)}
                      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.9rem", padding: "0 4px", lineHeight: 1, opacity: 0.5 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Two-column layout: Members + Chat */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>

        {/* Members panel */}
        <aside className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ marginBottom: 6, fontSize: "0.8rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Crew
          </h3>
          {dataLoading ? (
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Loading…</p>
          ) : members.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>No members yet.</p>
          ) : (
            members.map((m) => (
              <div
                key={m.user_id}
                onClick={() => m.character_id ? openSheet(m) : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: m.user_id === user.id ? "rgba(71,190,255,0.1)" : "rgba(255,255,255,0.03)",
                  border: m.user_id === user.id ? "1px solid rgba(71,190,255,0.25)" : "1px solid transparent",
                  cursor: m.character_id ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0, boxShadow: "0 0 6px rgba(89,221,157,0.6)" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.84rem", color: m.user_id === user.id ? "var(--blue)" : "var(--text)" }}>
                    {m.callsign}
                    {m.user_id === user.id && (
                      <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: 4 }}>(you)</span>
                    )}
                  </div>
                  {m.character_name ? (
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.character_name}
                      {m.character_race ? <span style={{ opacity: 0.7 }}> · {m.character_race}</span> : null}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", opacity: 0.5, marginTop: 1 }}>No character</div>
                  )}
                </div>
              </div>
            ))
          )}
          {isGM && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
              <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--yellow)" }}>
                ★ You are GM
              </span>
            </div>
          )}
          {members.some((m) => m.character_id) && (
            <p style={{ fontSize: "0.64rem", color: "var(--muted)", marginTop: 6, opacity: 0.6 }}>Click a crew member to view their sheet</p>
          )}
        </aside>

      {/* Character sheet modal */}
      {(sheetMember || sheetLoading) && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
          onClick={() => { setSheetMember(null); setSheetLoading(false); }}
        >
          <article
            className="card"
            style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            {sheetLoading ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Loading…</p>
            ) : sheetMember ? (
              <>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ marginBottom: 4 }}>{sheetMember.character.name}</h2>
                    <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: 0 }}>
                      {sheetMember.character.race} · {sheetMember.character.caste} · {sheetMember.character.profession}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "var(--blue)", marginTop: 4, fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {sheetMember.callsign}&apos;s character
                    </p>
                  </div>
                  <button
                    onClick={() => setSheetMember(null)}
                    style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.2rem", padding: "0 4px", lineHeight: 1 }}
                  >✕</button>
                </div>

                {/* HP / Stamina */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {([
                    ["Max HP",      sheetMember.character.max_hp,          "var(--red)"],
                    ["Stamina",     sheetMember.character.current_stamina,  "var(--blue)"],
                  ] as [string, number, string][]).map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 8px" }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: c, fontFamily: "var(--font-orbitron)" }}>{v}</div>
                      <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 3 }}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Attributes */}
                <div>
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Attributes</p>
                  <div className="char-stats">
                    {([
                      ["STR", sheetMember.character.strength],
                      ["AGI", sheetMember.character.agility],
                      ["VIG", sheetMember.character.vigor],
                      ["GEN", sheetMember.character.genius],
                      ["CUN", sheetMember.character.cunning],
                      ["AUR", sheetMember.character.aura],
                    ] as [string, number][]).map(([l, v]) => (
                      <div key={l} className="stat-pip">
                        <div className="val">{v}</div>
                        <div className="lbl">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Backstory */}
                {sheetMember.character.backstory && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                    <p style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Backstory</p>
                    <p style={{ fontSize: "0.84rem", color: "var(--text)", lineHeight: 1.55 }}>{sheetMember.character.backstory}</p>
                  </div>
                )}

                {/* Full sheet link */}
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <a
                    href={`/character-sheet?id=${sheetMember.character.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button secondary"
                    style={{ display: "inline-block", fontSize: "0.75rem", padding: "8px 20px" }}
                  >
                    Open Full Sheet ↗
                  </a>
                </div>
              </>
            ) : null}
          </article>
        </div>
      )}

        {/* Chat panel */}
        <article className="card" style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
          {/* Chat header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <h3 style={{ margin: 0, fontSize: "0.8rem", fontFamily: "var(--font-orbitron)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Table Chat
            </h3>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 360,
              maxHeight: "calc(100vh - 340px)",
            }}
          >
            {dataLoading ? (
              <p style={{ color: "var(--muted)", fontSize: "0.84rem" }}>Loading messages…</p>
            ) : messages.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.84rem", textAlign: "center", marginTop: 40 }}>
                No messages yet. Say something to the crew.
              </p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user_id === user.id;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontFamily: "var(--font-orbitron)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: isMe ? "var(--blue)" : "var(--muted)",
                        marginBottom: 3,
                      }}
                    >
                      {msg.callsign}
                    </span>
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "8px 12px",
                        borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: isMe ? "rgba(71,190,255,0.15)" : "rgba(255,255,255,0.06)",
                        border: isMe ? "1px solid rgba(71,190,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                        fontSize: "0.88rem",
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.body}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
            {sendError && (
              <p style={{ color: "#ff9999", fontSize: "0.78rem", margin: 0 }}>
                ⚠ {sendError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message…"
                disabled={sending}
                style={{ flex: 1, margin: 0 }}
              />
              <button
                className="button primary"
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                style={{ flexShrink: 0, padding: "0 18px" }}
              >
                Send
              </button>
            </div>
          </div>
        </article>

      </div>
    </>
  );
}
