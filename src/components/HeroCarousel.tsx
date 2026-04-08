"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const SLIDES = [
  {
    id: 1,
    label: "The White Hull",
    caption: "A colossal command vessel drifts through the outer belt — your operations deck awaits.",
    image: "/carousel/the-white-hull.png",
    bg: "radial-gradient(ellipse at 30% 60%, rgba(71,190,255,0.45) 0%, transparent 55%), radial-gradient(ellipse at 75% 30%, rgba(183,132,255,0.35) 0%, transparent 50%), linear-gradient(160deg, #01030a 0%, #061228 45%, #020810 100%)",
    accent: "#47beff",
  },
  {
    id: 2,
    label: "Faction War",
    caption: "Three factions vie for control of the Relay Gate. Command your crew through the chaos.",
    image: "/carousel/faction-war.png",
    bg: "radial-gradient(ellipse at 70% 40%, rgba(255,86,109,0.45) 0%, transparent 55%), radial-gradient(ellipse at 20% 70%, rgba(255,214,92,0.28) 0%, transparent 50%), linear-gradient(160deg, #0a0101 0%, #1f0808 45%, #090201 100%)",
    accent: "#ff566d",
  },
  {
    id: 3,
    label: "War Council",
    caption: "Different races gather around a glowing hologram to plan their next move against impossible odds.",
    image: "/carousel/war-council.png",
    bg: "radial-gradient(ellipse at 50% 30%, rgba(89,221,157,0.4) 0%, transparent 55%), radial-gradient(ellipse at 80% 75%, rgba(71,190,255,0.22) 0%, transparent 50%), linear-gradient(160deg, #000a06 0%, #051a0e 45%, #000a04 100%)",
    accent: "#59dd9d",
  },
  {
    id: 4,
    label: "Corridor Firefight",
    caption: "Space pirates rain fire down a narrow corridor. You and your crew return fire from cover, inches from death.",
    image: "/carousel/corridor-firefight.png",
    bg: "radial-gradient(ellipse at 20% 40%, rgba(183,132,255,0.45) 0%, transparent 55%), radial-gradient(ellipse at 80% 65%, rgba(89,221,157,0.22) 0%, transparent 50%), linear-gradient(160deg, #05010a 0%, #110820 45%, #020006 100%)",
    accent: "#b784ff",
  },
];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive((i) => (i + 1) % SLIDES.length), []);
  const prev = () => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, next]);

  const slide = SLIDES[active];

  return (
    <div
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Game highlights carousel"
    >
      <div
        className="hero-carousel-stage"
        style={{ background: slide.bg }}
      >
        {/* background image */}
        {slide.image && (
          <Image
            src={slide.image}
            alt={slide.label}
            fill
            sizes="100vw"
            priority={slide.id === SLIDES[0].id}
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        )}

        {/* decorative grid overlay */}
        <div className="hero-carousel-grid" aria-hidden="true" />

        {/* corner rivets */}
        <span className="rivet tl" aria-hidden="true" />
        <span className="rivet tr" aria-hidden="true" />
        <span className="rivet bl" aria-hidden="true" />
        <span className="rivet br" aria-hidden="true" />

        <div className="hero-carousel-content">
          <p className="hero-carousel-eye" style={{ color: slide.accent }}>
            ◈ {slide.label}
          </p>
          <p className="hero-carousel-caption">{slide.caption}</p>
        </div>

        <div className="hero-carousel-controls">
          <button onClick={prev} aria-label="Previous slide">‹</button>
          <div className="hero-carousel-dots">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                className={`dot${i === active ? " active" : ""}`}
                onClick={() => setActive(i)}
                aria-label={`Go to slide ${i + 1}`}
                style={i === active ? { background: slide.accent } : undefined}
              />
            ))}
          </div>
          <button onClick={next} aria-label="Next slide">›</button>
        </div>
      </div>
    </div>
  );
}
