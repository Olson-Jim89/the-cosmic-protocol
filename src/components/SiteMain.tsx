"use client";

import { usePathname } from "next/navigation";

const NO_STARFIELD_ROUTES = ["/rulebook", "/character-sheet"];

export default function SiteMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noStarfield = NO_STARFIELD_ROUTES.includes(pathname);

  return (
    <main className={`site-main${noStarfield ? " no-starfield" : ""}`}>
      {children}
    </main>
  );
}
