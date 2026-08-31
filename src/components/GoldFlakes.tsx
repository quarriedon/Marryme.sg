"use client";

import { useEffect, useRef } from "react";

type Flake = {
  x: number;
  y: number;
  r: number;
  opacity: number;
  driftX: number;
  speedY: number;
  phase: number;
  phaseSpeed: number;
};

// Fewer particles on narrow viewports — phones don't need (or want,
// battery-wise) the same density as a desktop hero section.
function densityForWidth(width: number): number {
  if (width < 640) return 24;
  if (width < 1024) return 42;
  return 60;
}

function makeFlake(width: number, height: number): Flake {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    r: 0.8 + Math.random() * 2.2,
    opacity: 0.12 + Math.random() * 0.45,
    driftX: (Math.random() - 0.5) * 0.15,
    speedY: 0.06 + Math.random() * 0.18,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.002 + Math.random() * 0.004,
  };
}

/**
 * Floating gold-leaf particles, drifting slowly upward with a gentle
 * horizontal sway — behind all page content (see layout.tsx, which
 * stacks this under a z-10 content wrapper) and never intercepting
 * clicks (pointer-events: none). Skips animating entirely for
 * prefers-reduced-motion rather than just slowing down, per WCAG
 * motion guidance; the glossy background alone still carries the
 * look for those users.
 */
export function GoldFlakes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Re-bind as non-null so the closures below (resize/tick) don't
    // need repeated null checks or non-null assertions.
    const canvasEl: HTMLCanvasElement = canvas;
    const ctx: CanvasRenderingContext2D = rawCtx;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let flakes: Flake[] = [];
    let rafId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: densityForWidth(width) }, () =>
        makeFlake(width, height)
      );
    }

    function tick() {
      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.y -= f.speedY;
        f.phase += f.phaseSpeed;
        f.x += f.driftX + Math.sin(f.phase) * 0.08;

        if (f.y < -4) {
          f.y = height + 4;
          f.x = Math.random() * width;
        }
        if (f.x < -4) f.x = width + 4;
        if (f.x > width + 4) f.x = -4;

        ctx.beginPath();
        ctx.fillStyle = `rgba(227, 200, 135, ${f.opacity})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(tick);
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }

    resize();
    rafId = requestAnimationFrame(tick);

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
