"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = "login" | "register";

export default function AccountPrototype() {
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const callsign = String(fd.get("callsign") ?? "").trim();
    const role = String(fd.get("role") ?? "player");
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { callsign, role } },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setMessage(
        "Account created! Check your email for a confirmation link, then log in."
      );
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      router.push("/play");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      {/* Tab row */}
      <div className="tab-row">
        <button
          className={`tab-btn${tab === "login" ? " active" : ""}`}
          onClick={() => { setTab("login"); setError(null); setMessage(null); }}
        >
          Login
        </button>
        <button
          className={`tab-btn${tab === "register" ? " active" : ""}`}
          onClick={() => { setTab("register"); setError(null); setMessage(null); }}
        >
          Register
        </button>
      </div>

      {error && (
        <div className="status" style={{ background: "rgba(255,60,60,0.12)", borderColor: "rgba(255,80,80,0.3)", color: "#ff9999" }}>
          {error}
        </div>
      )}
      {message && (
        <div className="status" style={{ background: "rgba(89,221,157,0.1)", borderColor: "rgba(89,221,157,0.3)", color: "#59dd9d" }}>
          {message}
        </div>
      )}

      {tab === "login" && (
        <article className="card" style={{ maxWidth: 480 }}>
          <h2>Login To Command Deck</h2>
          <form onSubmit={onLogin} className="grid" style={{ gap: 14 }}>
            <label>
              Email
              <input name="email" type="email" placeholder="crew@cosmicprotocol.io" required autoComplete="email" />
            </label>
            <label>
              Password
              <input name="password" type="password" placeholder="Enter your password" required autoComplete="current-password" minLength={6} />
            </label>
            <button type="submit" className="button secondary" disabled={loading}>
              {loading ? "Authenticating…" : "Login"}
            </button>
          </form>
          <p style={{ marginTop: 12, fontSize: "0.82rem", color: "var(--muted)" }}>
            No account?{" "}
            <button
              onClick={() => setTab("register")}
              style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}
            >
              Register here
            </button>
          </p>
        </article>
      )}

      {tab === "register" && (
        <article className="card" style={{ maxWidth: 520 }}>
          <h2>Register A New Crew Member</h2>
          <form onSubmit={onRegister} className="grid" style={{ gap: 14 }}>
            <div className="grid grid-2">
              <label>
                Callsign
                <input name="callsign" type="text" placeholder="Vega-Actual" required />
              </label>
              <label>
                Crew Role
                <select name="role">
                  <option value="player">Player</option>
                  <option value="gm">Game Master</option>
                </select>
              </label>
            </div>
            <label>
              Email
              <input name="email" type="email" placeholder="captain@cosmicprotocol.io" required autoComplete="email" />
            </label>
            <label>
              Password
              <input name="password" type="password" placeholder="Create a secure password (min 6 chars)" required autoComplete="new-password" minLength={6} />
            </label>
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? "Creating Account…" : "Create Account"}
            </button>
          </form>
          <p style={{ marginTop: 12, fontSize: "0.82rem", color: "var(--muted)" }}>
            Already have an account?{" "}
            <button
              onClick={() => setTab("login")}
              style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}
            >
              Login here
            </button>
          </p>
        </article>
      )}
    </div>
  );
}