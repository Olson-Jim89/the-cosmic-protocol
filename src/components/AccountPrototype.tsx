"use client";

import { FormEvent, useState } from "react";

export default function AccountPrototype() {
  const [registerStatus, setRegisterStatus] = useState(
    "Prototype mode: connect this form to Supabase Auth, Clerk, or Auth.js for real registration."
  );
  const [loginStatus, setLoginStatus] = useState(
    "Prototype mode: connect this form to your backend session service for real login."
  );

  function onRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const callsign = String(formData.get("callsign") || "Crew Member");
    setRegisterStatus(
      `${callsign}, your account UI flow works locally. Add backend auth to persist this account.`
    );
    event.currentTarget.reset();
  }

  function onLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "crew@example.com");
    setLoginStatus(
      `${email} passed the front-end login prototype. Add real session issuance on the server.`
    );
    event.currentTarget.reset();
  }

  return (
    <section className="grid grid-2">
      <article className="card">
        <h2>Register A New Crew Member</h2>
        <form onSubmit={onRegisterSubmit} className="grid" style={{ gap: 12 }}>
          <div className="grid grid-2">
            <label>
              Callsign
              <input name="callsign" type="text" placeholder="Vega-Actual" required disabled />
            </label>
            <label>
              Crew Role
              <select name="role" disabled>
                <option>Player</option>
                <option>Game Master</option>
                <option>Artist</option>
                <option>Playtester</option>
              </select>
            </label>
          </div>
          <label>
            Email
            <input name="email" type="email" placeholder="captain@cosmicprotocol.io" required disabled />
          </label>
          <label>
            Password
            <input name="password" type="password" placeholder="Create a secure password" required disabled />
          </label>
          <button type="submit" className="button primary" disabled>Create Account</button>
        </form>
        <p className="status">{registerStatus}</p>
      </article>

      <article className="card">
        <h2>Login To Command Deck</h2>
        <form onSubmit={onLoginSubmit} className="grid" style={{ gap: 12 }}>
          <label>
            Email
            <input name="email" type="email" placeholder="crew@cosmicprotocol.io" required disabled />
          </label>
          <label>
            Password
            <input name="password" type="password" placeholder="Enter your password" required disabled />
          </label>
          <button type="submit" className="button secondary" disabled>Login</button>
        </form>
        <p className="status">{loginStatus}</p>
      </article>
    </section>
  );
}