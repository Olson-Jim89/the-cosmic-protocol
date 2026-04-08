"use client";

import { useEffect } from "react";

const MAIN_SPEED = 12;
const FAST_SPEED = 7;

export default function StarfieldController() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--star-main-speed", `${MAIN_SPEED}s`);
    root.style.setProperty("--star-fast-speed", `${FAST_SPEED}s`);

    return () => {
      root.style.removeProperty("--star-main-speed");
      root.style.removeProperty("--star-fast-speed");
    };
  }, []);

  return null;
}
