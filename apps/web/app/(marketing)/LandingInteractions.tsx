"use client";

import { useEffect } from "react";

// Progressive enhancement for the landing: a hairline under the nav once the
// page is scrolled. Purely cosmetic — the hero reveal is CSS-only (see
// marketing.css `mk-rise`), so nothing here gates content visibility. If this
// never runs, the only effect is the nav border staying transparent.
export function LandingInteractions() {
  useEffect(() => {
    const nav = document.getElementById("mk-nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
