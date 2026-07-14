"use client";

import { useEffect } from "react";

// The landing's scroll engine — progressive enhancement only. Server HTML ships
// fully visible and readable; this component then:
//
//   1. stamps `data-armed` on .mk so CSS may hide elements into their pre-reveal
//      state (no JS → nothing is ever hidden),
//   2. reveals `.fx` elements via IntersectionObserver (adds .is-in once),
//   3. staggers children of `[data-stagger]` parents via a --d delay variable,
//   4. counts `[data-count]` numbers up when they enter the viewport,
//   5. drives the nav chrome, the top scroll-progress bar, light parallax
//      (`[data-parallax]`) and the how-it-works deck state — all inside ONE
//      rAF-throttled scroll handler, transform/opacity only.
//
// prefers-reduced-motion: parallax and count-ups are skipped entirely; reveals
// still fire but the global reduced-motion rule zeroes their transitions.
export function ScrollFx() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".mk");
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    // Stagger delays must exist BEFORE reveal transitions arm.
    for (const parent of Array.from(root.querySelectorAll<HTMLElement>("[data-stagger]"))) {
      const step = Number(parent.dataset.stagger) || 70;
      Array.from(parent.children).forEach((child, i) => {
        (child as HTMLElement).style.setProperty("--d", `${i * step}ms`);
      });
    }

    root.setAttribute("data-armed", "");
    cleanups.push(() => root.removeAttribute("data-armed"));

    // ---- count-up -----------------------------------------------------------
    const formatCount = (value: number, decimals: number) =>
      value.toLocaleString("en-PH", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

    const runCount = (el: HTMLElement) => {
      const target = Number(el.dataset.count ?? "0");
      const decimals = Number(el.dataset.countDecimals ?? "0");
      if (reduced || !Number.isFinite(target)) {
        el.textContent = formatCount(target, decimals);
        return;
      }
      const duration = 1300;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatCount(target * eased, decimals);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    // ---- reveal observer ----------------------------------------------------
    const revealIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          for (const counter of Array.from(
            entry.target.querySelectorAll<HTMLElement>("[data-count]"),
          )) {
            if (!counter.dataset.counted) {
              counter.dataset.counted = "true";
              runCount(counter);
            }
          }
          revealIo.unobserve(entry.target);
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );
    for (const el of Array.from(root.querySelectorAll(".fx"))) revealIo.observe(el);
    cleanups.push(() => revealIo.disconnect());

    // ---- how-it-works deck: which card owns the center band ------------------
    const deck = root.querySelector<HTMLElement>(".mk-deck");
    if (deck) {
      const cards = Array.from(deck.querySelectorAll<HTMLElement>(".mk-deck__card"));
      const deckIo = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const idx = cards.indexOf(entry.target as HTMLElement);
            if (idx >= 0) deck.setAttribute("data-active", String(idx));
          }
        },
        { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
      );
      for (const card of cards) deckIo.observe(card);
      cleanups.push(() => deckIo.disconnect());
    }

    // ---- one scroll loop: nav chrome, progress bar, parallax ----------------
    const nav = document.getElementById("mk-nav");
    const progress = root.querySelector<HTMLElement>("[data-progress]");
    const parallaxEls = reduced
      ? []
      : Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));

    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      nav?.classList.toggle("is-scrolled", y > 8);
      if (progress) {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
      const vhMid = window.innerHeight / 2;
      for (const el of parallaxEls) {
        const speed = Number(el.dataset.parallax) || 0;
        const rect = el.getBoundingClientRect();
        const offset = rect.top + rect.height / 2 - vhMid;
        el.style.transform = `translate3d(0, ${(-offset * speed).toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });
    update();

    return () => {
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}
