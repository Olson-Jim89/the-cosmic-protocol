"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SheetFrame() {
  const params = useSearchParams();
  const id = params.get("id");
  const src = id ? `/character-sheet.html?id=${encodeURIComponent(id)}` : "/character-sheet.html";

  return (
    <iframe
      src={src}
      title="Cosmic Protocol — Galactic Passport"
      style={{
        display: "block",
        width: "100%",
        height: "calc(100dvh - 54px)",
        border: "none",
      }}
    />
  );
}

export default function CharacterSheetPage() {
  return (
    <Suspense>
      <SheetFrame />
    </Suspense>
  );
}
