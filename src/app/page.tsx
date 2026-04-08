import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";

export default function Home() {
  return (
    <>
      <HeroCarousel />

      <section className="home-grid-rows">
        {/* Row 1: info then picture */}
        <article className="card home-col info-panel">
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
        </article>

      </section>
    </>
  );
}
