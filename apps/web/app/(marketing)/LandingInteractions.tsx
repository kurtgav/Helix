"use client";

import { useEffect } from "react";

// Progressive enhancement for the landing: scroll-reveal + nav hairline on
// scroll. Reduced-motion safe (reveals resolve immediately). Renders nothing.
export function LandingInteractions() {
  useEffect(() => {
    const nav = document.getElementById("mk-nav");
    const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const items = Array.from(document.querySelectorAll<HTMLElement>(".mk .reveal"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let io: IntersectionObserver | undefined;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io?.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      items.forEach((el) => io?.observe(el));
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  return null;
}
