import RealtimePrototype from "@/components/RealtimePrototype";

export default function RealtimePage() {
  return (
    <>
      <section className="page-intro">
        <h1>Realtime Multiplayer Hub</h1>
        <p className="lede">
          This page demonstrates drag-and-drop, table chat, and direct messaging patterns.
          It runs locally in-browser and is ready for backend realtime wiring.
        </p>
      </section>

      <RealtimePrototype />
    </>
  );
}