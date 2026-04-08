export default function PlayPage() {
  return (
    <>
      <section className="page-intro">
        <h1>Join Or Start A Game</h1>
        <p className="lede">
          Players can discover open tables or launch private campaign rooms with
          invitations, schedules, and role-based table permissions.
        </p>
      </section>

      <section className="grid grid-3">
        <article className="card">
          <h2>Join Public Table</h2>
          <ul>
            <li>Filter by time zone and session length</li>
            <li>Browse tone, genre, and difficulty tags</li>
            <li>Match by player experience level</li>
          </ul>
        </article>
        <article className="card">
          <h2>Start Private Campaign</h2>
          <ul>
            <li>Create room and invite trusted players</li>
            <li>Set GM and player permissions</li>
            <li>Upload campaign maps and handouts</li>
          </ul>
        </article>
        <article className="card">
          <h2>Session Control</h2>
          <ul>
            <li>Pause and restore table state</li>
            <li>Track initiative and mission clocks</li>
            <li>Sync inventory and story handouts</li>
          </ul>
        </article>
      </section>
    </>
  );
}