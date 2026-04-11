export default function AboutPage() {
  return (
    <>
      <section className="page-intro">
        <h1>About CPI</h1>
        <p className="lede">
          Cosmic Protocol is a sci-fi tabletop RPG project focused on campaign storytelling,
          tactical play, and realtime online crew sessions.
        </p>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <h2>Our Mission</h2>
          <p>
            Build a modern TTRPG experience where players can read rules, join campaigns,
            and run persistent sessions with shared assets and communication tools.
          </p>
        </article>
        <article className="card">
          <h2>What We Build</h2>
          <ul>
            <li>Readable rulebook and lore systems</li>
            <li>Player accounts and campaign management</li>
            <li>Realtime drag-drop board interaction</li>
            <li>Table chat and direct messaging</li>
          </ul>
        </article>
      </section>
    </>
  );
}
