"use client";

import { useState } from "react";
import Link from "next/link";

const MERCH = [
  {
    id: 1,
    name: "Core Rulebook",
    desc: "336-page hardcover with full lore, mechanics, and illustrated faction profiles.",
    price: "$42",
    accent: "#47beff",
    icon: "📖",
  },
  {
    id: 2,
    name: "Gem Dice Set",
    desc: "Seven polyhedral dice in translucent hull-white with gem-coloured numerals.",
    price: "$28",
    accent: "#b784ff",
    icon: "🎲",
  },
  {
    id: 3,
    name: "Commander Patch",
    desc: "Embroidered shoulder patch — white hull crest with conic gem ring detail.",
    price: "$12",
    accent: "#59dd9d",
    icon: "🛡️",
  },
  {
    id: 4,
    name: "Ops Deck T-Shirt",
    desc: "Heavyweight cotton, screen-printed command deck topographic map on the back.",
    price: "$34",
    accent: "#ffd65c",
    icon: "👕",
  },
  {
    id: 5,
    name: "Printable Pack",
    desc: "Digital download — character sheets, GM screens, faction cards, and hex maps.",
    price: "$9",
    accent: "#ff566d",
    icon: "🗂️",
  },
];

export default function MerchCarousel() {
  const [active, setActive] = useState(0);
  const item = MERCH[active];

  return (
    <div className="merch-carousel">
      <div
        className="merch-carousel-card"
        style={{ borderColor: item.accent }}
      >
        <span className="merch-icon" aria-hidden="true">{item.icon}</span>
        <h3 style={{ color: item.accent }}>{item.name}</h3>
        <p>{item.desc}</p>
        <strong className="merch-price" style={{ color: item.accent }}>{item.price}</strong>
        <Link href="/store" className="button primary" style={{ marginTop: "10px" }}>
          View In Store
        </Link>
      </div>

      <div className="merch-carousel-nav">
        <button
          onClick={() => setActive((i) => (i - 1 + MERCH.length) % MERCH.length)}
          aria-label="Previous item"
        >
          ‹
        </button>
        <div className="hero-carousel-dots">
          {MERCH.map((m, i) => (
            <button
              key={m.id}
              className={`dot${i === active ? " active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`View ${m.name}`}
              style={i === active ? { background: item.accent } : undefined}
            />
          ))}
        </div>
        <button
          onClick={() => setActive((i) => (i + 1) % MERCH.length)}
          aria-label="Next item"
        >
          ›
        </button>
      </div>
    </div>
  );
}
