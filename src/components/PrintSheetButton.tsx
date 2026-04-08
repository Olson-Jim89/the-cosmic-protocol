"use client";

export default function PrintSheetButton() {
  return (
    <button type="button" className="button primary" onClick={() => window.print()}>
      Print / Save PDF
    </button>
  );
}
