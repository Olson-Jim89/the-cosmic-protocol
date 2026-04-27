import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";

export default function Home() {
  return (
    <>
      <HeroCarousel />

      <section className="home-columns" style={{ padding: "20px 24px 32px" }}>

        {/* Left: Latest Updates */}
        <article className="card home-col" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2>Latest Updates</h2>
          <ul style={{ marginTop: "6px", paddingLeft: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
            <li>
              <span style={{ fontSize: "0.7rem", opacity: 0.55, display: "block", marginBottom: "2px" }}>APR 14, 2026</span>
              <strong>Digital Beta Live</strong>
              <p style={{ marginTop: "4px", fontSize: "0.85rem", opacity: 0.8 }}>
                The Cosmic Protocol web app is now in open beta. Create your character and join a crew today.
              </p>
            </li>
            <li>
              <span style={{ fontSize: "0.7rem", opacity: 0.55, display: "block", marginBottom: "2px" }}>MAR 28, 2026</span>
              <strong>Rulebook v1.2 Published</strong>
              <p style={{ marginTop: "4px", fontSize: "0.85rem", opacity: 0.8 }}>
                Updated faction rules, revised Action Point economy, and two new races added to the core book.
              </p>
            </li>
            <li>
              <span style={{ fontSize: "0.7rem", opacity: 0.55, display: "block", marginBottom: "2px" }}>MAR 10, 2026</span>
              <strong>Tactical Combat Playtests Complete</strong>
              <p style={{ marginTop: "4px", fontSize: "0.85rem", opacity: 0.8 }}>
                Twelve crews. Forty sessions. The 3 AP system survived. See what changed in the updated rulebook.
              </p>
            </li>
          </ul>
          <Link href="/rulebook" className="button ghost" style={{ marginTop: "auto" }}>
            Read The Rulebook
          </Link>
        </article>

        {/* Center: What Is TCP */}
        <article className="card home-col info-panel" style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", flex: 1 }}>
            <div style={{ flex: 1 }}>
              <h2>What Is &quot;The Cosmic Protocol&quot;?</h2>
              <p style={{ marginTop: "10px" }}>
                The Cosmic Protocol is a sci-fi tabletop RPG of faction intrigue, starship crews,
                and decisions that echo across the galaxy. Choose your race, your profession, and
                your allegiance. Then find out what you&rsquo;re made of.
              </p>
              <p style={{ marginTop: "10px" }}>The Cosmic Protocol features:</p>
              <ul style={{ marginTop: "6px", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>Roll <strong>d20 + exploding d6</strong> for all attacks, saves, and skill checks</li>
                <li>Choose your <strong>race</strong> and <strong>profession</strong> to shape your role in the crew</li>
                <li>Contest combat style before every fight — <strong>narrative</strong> or <strong>tactical</strong> mode</li>
                <li>3 Action Points (AP) per turn in tactical combat for granular, strategic play</li>
                <li>Faction reputation, alliance choices, and long-term consequences carry session to session</li>
              </ul>
              <Link href="/rulebook" className="button ghost" style={{ marginTop: "14px" }}>
                Read The Rulebook
              </Link>
              <Link href="/character-sheet" className="button ghost" style={{ marginTop: "8px" }}>
                Character Sheet
              </Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/instructor.png"
              alt="Instructor"
              style={{ width: "140px", flexShrink: 0, alignSelf: "flex-end" }}
            />
          </div>
        </article>

        {/* Right: Store / Merch Teaser */}
        <article className="card home-col" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2>Gear Up</h2>
          <p style={{ marginTop: "6px", fontSize: "0.9rem", opacity: 0.85 }}>
            Rep the Protocol. Official merch, printable play aids, and limited-edition crew gear are coming soon.
          </p>
          <ul style={{ marginTop: "6px", paddingLeft: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
            <li style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(71,190,255,0.08)", border: "1px solid rgba(71,190,255,0.2)" }}>
              <strong style={{ fontSize: "0.9rem" }}>Printable Character Sheets</strong>
              <p style={{ marginTop: "3px", fontSize: "0.8rem", opacity: 0.7 }}>Full-resolution PDF sheets — free to download.</p>
            </li>
            <li style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(183,132,255,0.08)", border: "1px solid rgba(183,132,255,0.2)" }}>
              <strong style={{ fontSize: "0.9rem" }}>Crew T-Shirts</strong>
              <p style={{ marginTop: "3px", fontSize: "0.8rem", opacity: 0.7 }}>Show your faction allegiance. Dropping soon.</p>
            </li>
            <li style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(89,221,157,0.08)", border: "1px solid rgba(89,221,157,0.2)" }}>
              <strong style={{ fontSize: "0.9rem" }}>Dice & Play Aids</strong>
              <p style={{ marginTop: "3px", fontSize: "0.8rem", opacity: 0.7 }}>Custom d20 sets and AP tracker tokens.</p>
            </li>
          </ul>
          <Link href="/store" className="button ghost" style={{ marginTop: "auto" }}>
            Visit The Store
          </Link>
        </article>

      </section>
    </>
  );
}
