"use client";

import { KeyboardEvent, useMemo, useState } from "react";

type ThreadKey = "commander" | "engineer" | "broker";

type DMEntry = {
  sender: string;
  body: string;
};

const INITIAL_DM: Record<ThreadKey, DMEntry[]> = {
  commander: [
    { sender: "Commander Sol", body: "Send me the relic image first. Do not post it to table chat." },
    { sender: "You", body: "Understood. Uploading private item card and scan packet now." },
  ],
  engineer: [
    { sender: "Engineer Nyx", body: "Drag any damaged drone shell to cargo so I can repurpose it." },
  ],
  broker: [
    { sender: "Broker Venn", body: "I have a buyer for yellow-code artifacts. Keep this discreet." },
  ],
};

export default function RealtimePrototype() {
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<DMEntry[]>([
    { sender: "GM // Helios", body: "Mission clock starts now. Push loadouts to the table." },
    { sender: "Player // Aria", body: "Uploading station blueprint and breach route image." },
  ]);
  const [activeThread, setActiveThread] = useState<ThreadKey>("commander");
  const [dmLog, setDmLog] = useState(INITIAL_DM);
  const [dmInput, setDmInput] = useState("");
  const [dropStatus, setDropStatus] = useState("No item deployed yet.");

  const threadEntries = useMemo(() => dmLog[activeThread], [activeThread, dmLog]);

  function sendChat() {
    const value = chatInput.trim();
    if (!value) {
      return;
    }
    setChatLog((prev) => [...prev, { sender: "You", body: value }]);
    setChatInput("");
  }

  function sendDM() {
    const value = dmInput.trim();
    if (!value) {
      return;
    }
    setDmLog((prev) => ({
      ...prev,
      [activeThread]: [...prev[activeThread], { sender: "You", body: value }],
    }));
    setDmInput("");
  }

  function onKeySend(event: KeyboardEvent<HTMLInputElement>, callback: () => void) {
    if (event.key === "Enter") {
      event.preventDefault();
      callback();
    }
  }

  function onDrop(slotName: string, item: string) {
    setDropStatus(
      `${item} deployed to ${slotName}. Use Liveblocks or Socket.IO + backend persistence to sync this for all connected users.`
    );
  }

  return (
    <>
      <section className="grid grid-2">
        <article className="card">
          <h2>Drag And Drop Operations Deck</h2>
          <p>Drag an item into a tactical slot to simulate shared board interaction.</p>
          <div className="drag-rack">
            {[
              "Ion Rifle",
              "Quantum Medkit",
              "Encrypted Relic",
            ].map((item) => (
              <div
                key={item}
                className="drag-item"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", item);
                }}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="drop-grid">
            {["Pilot Station", "Cargo Grid", "Diplomatic Table"].map((slot) => (
              <div
                key={slot}
                className="drop-slot"
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const item = event.dataTransfer.getData("text/plain") || "Unknown Item";
                  onDrop(slot, item);
                  event.currentTarget.textContent = `${slot}: ${item}`;
                }}
              >
                {slot}
              </div>
            ))}
          </div>

          <p className="status">{dropStatus}</p>
        </article>

        <article className="card">
          <h2>Game Chat</h2>
          <div className="log">
            {chatLog.map((entry, idx) => (
              <div className="message" key={`${entry.sender}-${idx}`}>
                <strong>{entry.sender}</strong>
                {entry.body}
              </div>
            ))}
          </div>
          <div className="action-row">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => onKeySend(event, sendChat)}
              placeholder="Send table message, item link, or image note"
            />
            <button type="button" className="button ghost" onClick={sendChat}>
              Send
            </button>
          </div>
        </article>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <h2>Direct Messages</h2>
          <div className="grid grid-2">
            <div className="grid" style={{ gap: 8 }}>
              {[
                { key: "commander", label: "Commander Sol" },
                { key: "engineer", label: "Engineer Nyx" },
                { key: "broker", label: "Broker Venn" },
              ].map((thread) => (
                <button
                  key={thread.key}
                  type="button"
                  className={`button ${activeThread === thread.key ? "primary" : "ghost"}`}
                  onClick={() => setActiveThread(thread.key as ThreadKey)}
                >
                  {thread.label}
                </button>
              ))}
            </div>

            <div>
              <div className="log">
                {threadEntries.map((entry, idx) => (
                  <div className="message" key={`${entry.sender}-${idx}`}>
                    <strong>{entry.sender}</strong>
                    {entry.body}
                  </div>
                ))}
              </div>
              <div className="action-row">
                <input
                  value={dmInput}
                  onChange={(event) => setDmInput(event.target.value)}
                  onKeyDown={(event) => onKeySend(event, sendDM)}
                  placeholder="Send private item card or image reference"
                />
                <button type="button" className="button ghost" onClick={sendDM}>
                  Transmit
                </button>
              </div>
            </div>
          </div>
        </article>

        <article className="card">
          <h2>Required Realtime Features</h2>
          <ul>
            <li>User auth with role-based permissions for GM and players</li>
            <li>Presence: online indicators, typing status, and active board interactions</li>
            <li>Shared scene state for maps, tokens, clocks, and draggable inventory</li>
            <li>Table chat plus private DMs with image and item card sharing</li>
            <li>Persistent saves that resume exactly where the session stopped</li>
            <li>Moderation and reporting tooling for community safety</li>
          </ul>
        </article>
      </section>
    </>
  );
}