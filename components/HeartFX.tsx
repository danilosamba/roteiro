"use client";

import { useEffect } from "react";

// Corações discretos que sobem de onde a pessoa toca num botão ou card,
// e um rastro leve ao passar o mouse sobre os cards (só em computador).
const COLORS = ["#ef5a7c", "#ff8fa3", "#a996ee", "#ffb497"];
const SVG = (c: string, s: number) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c}"><path d="M12 20.5s-7.5-4.6-9.3-9.6C1.5 7.4 3.6 4 7.1 4c2 0 3.6 1.1 4.9 2.9C13.3 5.1 14.9 4 16.9 4c3.5 0 5.6 3.4 4.4 6.9-1.8 5-9.3 9.6-9.3 9.6Z"/></svg>`;

function spawn(x: number, y: number, count: number, spread = 1) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "heart-fx";
    const size = 10 + Math.random() * 9;
    el.innerHTML = SVG(COLORS[Math.floor(Math.random() * COLORS.length)], size);
    document.body.appendChild(el);
    const dx = (Math.random() - 0.5) * 70 * spread;
    const dy = -(40 + Math.random() * 50) * spread;
    const rot = (Math.random() - 0.5) * 50;
    const anim = el.animate(
      [
        { transform: `translate(${x - size / 2}px, ${y - size / 2}px) scale(0.3) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${x - size / 2 + dx * 0.3}px, ${y - size / 2 + dy * 0.3}px) scale(1.1) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${x - size / 2 + dx}px, ${y - size / 2 + dy}px) scale(0.8) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 750 + Math.random() * 350, easing: "cubic-bezier(.22,1,.36,1)", delay: i * 35, fill: "both" },
    );
    anim.onfinish = () => el.remove();
  }
}

export default function HeartFX() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onDown = (e: PointerEvent) => {
      const t = (e.target as HTMLElement)?.closest("button, a, [data-heart]");
      if (!t || t.closest("[data-noheart]")) return;
      spawn(e.clientX, e.clientY, 3 + Math.floor(Math.random() * 2));
    };

    let last = 0;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onMove = (e: PointerEvent) => {
      if (!fine.matches) return;
      const now = performance.now();
      if (now - last < 170) return;
      const t = (e.target as HTMLElement)?.closest("[data-heart]");
      if (!t) return;
      last = now;
      spawn(e.clientX, e.clientY, 1, 0.6);
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}
