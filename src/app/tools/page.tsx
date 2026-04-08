export default function ToolsPage() {
  return (
    <>
      <section className="page-intro">
        <h1>Best Tools To Build The TTRPG</h1>
        <p className="lede">
          The full product requires more than static pages. Accounts, realtime play,
          persistence, and moderation need a production stack.
        </p>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <h2>Recommended Website Stack</h2>
          <ul>
            <li>Frontend: Next.js App Router</li>
            <li>Auth: Supabase Auth, Clerk, or Auth.js</li>
            <li>Database: PostgreSQL via Supabase or Neon</li>
            <li>Storage: Supabase Storage or Cloudinary</li>
            <li>Hosting: Vercel with environment variable management</li>
          </ul>
        </article>

        <article className="card">
          <h2>Recommended Realtime Stack</h2>
          <ul>
            <li>Live collaboration: Liveblocks or Socket.IO</li>
            <li>Realtime events: Supabase Realtime or websockets</li>
            <li>Presence channels for online status and typing</li>
            <li>Room permissions for GM-only and player-only layers</li>
            <li>Server validation for all scene mutations</li>
          </ul>
        </article>

        <article className="card">
          <h2>Game Creation Toolchain</h2>
          <ul>
            <li>Rules drafting: Notion or Obsidian</li>
            <li>UI/UX and art direction: Figma</li>
            <li>Map and asset design: Dungeondraft, Blender</li>
            <li>Rulebook print layout: Affinity Publisher or InDesign</li>
            <li>Task tracking: Linear, Trello, or GitHub Projects</li>
          </ul>
        </article>

        <article className="card">
          <h2>Practical Advice</h2>
          <p>
            Use this multipage site as your front-end foundation. Then connect auth,
            persistence, and realtime services in phases: accounts first, then room
            state sync, then chat and direct messaging media support.
          </p>
        </article>
      </section>
    </>
  );
}