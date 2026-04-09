"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const linkStyle: React.CSSProperties = {
  fontFamily: "var(--font-orbitron), sans-serif",
  fontSize: "0.65rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "4px 8px",
  color: "#ffffff",
  fontWeight: 800,
  display: "inline-block",
  border: "1px solid rgba(160,190,236,0.3)",
  borderRadius: 7,
  background: "rgba(10,20,40,0.6)",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
};

export default function NavAuth() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <span
        style={{
          opacity: 0.45,
          fontSize: "0.68rem",
          color: "#aaccee",
          display: "inline-block",
          transform: "skewX(9deg)",
          letterSpacing: "0.1em",
          fontFamily: "var(--font-orbitron), sans-serif",
        }}
      >
        ···
      </span>
    );
  }

  if (user) {
    return (
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          transform: "skewX(9deg)",
          flexWrap: "wrap",
        }}
      >
        <Link href="/play" style={linkStyle}>Lobby</Link>
        <Link href="/characters" style={linkStyle}>Characters</Link>
        {profile?.role === "gm" && (
          <Link href="/gm" style={{ ...linkStyle, color: "#b784ff", borderColor: "rgba(183,132,255,0.35)" }}>
            GM Tools
          </Link>
        )}
        <span
          style={{
            color: "rgba(190,220,255,0.5)",
            fontSize: "0.6rem",
            fontFamily: "var(--font-orbitron), sans-serif",
            letterSpacing: "0.05em",
            maxWidth: 110,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            padding: "0 4px",
          }}
        >
          {profile?.callsign ?? user.email}
        </span>
        <button
          onClick={handleSignOut}
          style={{
            background: "rgba(255,70,70,0.16)",
            border: "1px solid rgba(255,110,110,0.3)",
            color: "#ff9999",
            borderRadius: 7,
            padding: "4px 10px",
            fontSize: "0.6rem",
            fontFamily: "var(--font-orbitron), sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  return <Link href="/accounts">Play Online</Link>;
}
