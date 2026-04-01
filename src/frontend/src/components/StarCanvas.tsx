import { useEffect, useRef } from "react";
import type { AppTheme } from "../hooks/useAppSettings";

interface Props {
  theme: AppTheme;
}

const ORION_STARS: [number, number][] = [
  [0.5, 0.47], // belt center
  [0.35, 0.45], // belt left
  [0.65, 0.45], // belt right
  [0.2, 0.25], // left shoulder
  [0.8, 0.3], // right shoulder
  [0.25, 0.75], // left foot
  [0.75, 0.7], // right foot
];

export function StarCanvas({ theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = theme === "dark" || theme === "bw";
    const isGrey = theme === "grey";
    function starColor(alpha: number): string {
      if (isDark) return `rgba(200,220,255,${alpha})`;
      if (isGrey) return `rgba(50,50,60,${alpha})`;
      return `rgba(100,120,160,${alpha})`;
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const STAR_COUNT = 120;
    const stars: {
      fx: number;
      fy: number;
      r: number;
      opacity: number;
      twinkling: boolean;
      speed: number;
      phase: number;
      pulseSpeed: number;
      pulsePhase: number;
    }[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        fx: Math.random(),
        fy: Math.random(),
        r: 0.5 + Math.random() * 1.0,
        opacity: 0.5,
        twinkling: false,
        speed: 0.5 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2,
        // gentle global pulsation for all stars
        pulseSpeed: 0.2 + Math.random() * 0.4,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    function pickTwinklers() {
      for (const s of stars) s.twinkling = false;
      const count = 10 + Math.floor(Math.random() * 6);
      const indices = new Set<number>();
      while (indices.size < count)
        indices.add(Math.floor(Math.random() * STAR_COUNT));
      for (const i of indices) stars[i].twinkling = true;
    }
    pickTwinklers();
    const twinkleInterval = setInterval(pickTwinklers, 8000);

    // Shooting star
    let shootingStar: {
      x: number;
      y: number;
      progress: number;
      length: number;
      active: boolean;
    } | null = null;
    let shootingStarStart = 0;
    const SHOOT_DURATION = 600;

    function launchShootingStar() {
      const w = canvas?.width ?? window.innerWidth;
      const h = canvas?.height ?? window.innerHeight;
      shootingStar = {
        x: Math.random() * w * 0.6,
        y: Math.random() * h * 0.4,
        progress: 0,
        length: 80 + Math.random() * 40,
        active: true,
      };
      shootingStarStart = performance.now();
    }

    function scheduleShootingStar() {
      // Every 10 seconds
      return setTimeout(() => {
        launchShootingStar();
        shootingStarTimeout = scheduleShootingStar();
      }, 10000);
    }
    let shootingStarTimeout = scheduleShootingStar();

    // Orion constellation
    interface OrionState {
      cx: number;
      cy: number;
      alpha: number;
      phase: "fadein" | "hold" | "fadeout" | "done";
      startTime: number;
    }
    let orion: OrionState | null = null;
    const ORION_W = 150;
    const ORION_H = 200;
    const ORION_FADEIN = 1500;
    const ORION_HOLD = 5000;
    const ORION_FADEOUT = 1500;

    function launchOrion() {
      const w = canvas?.width ?? window.innerWidth;
      const h = canvas?.height ?? window.innerHeight;
      const pad = 0.2;
      const cx = w * pad + Math.random() * w * (1 - 2 * pad);
      const cy = h * pad + Math.random() * h * (1 - 2 * pad);
      orion = {
        cx,
        cy,
        alpha: 0,
        phase: "fadein",
        startTime: performance.now(),
      };
    }

    function scheduleOrion() {
      // Every 30 seconds
      return setTimeout(() => {
        launchOrion();
        orionTimeout = scheduleOrion();
      }, 30000);
    }
    let orionTimeout = scheduleOrion();

    let rafId: number;
    let lastDraw = 0;
    const FPS_INTERVAL = 50; // 20fps

    function draw(now: number) {
      rafId = requestAnimationFrame(draw);
      const delta = now - lastDraw;
      if (delta < FPS_INTERVAL) return;
      lastDraw = now;

      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      const t = now / 1000;

      ctx.clearRect(0, 0, w, h);

      // Draw all stars — twinkling ones flicker rapidly, others pulsate gently
      for (const star of stars) {
        let alpha: number;
        if (star.twinkling) {
          // Fast flicker between 0.2 and 1.0
          alpha = 0.6 + 0.4 * Math.sin(t * star.speed + star.phase);
          alpha = Math.max(0.2, Math.min(1.0, alpha));
        } else {
          // Slow faint pulsation for all background stars
          alpha = 0.35 + 0.15 * Math.sin(t * star.pulseSpeed + star.pulsePhase);
        }
        ctx.beginPath();
        ctx.arc(star.fx * w, star.fy * h, star.r, 0, Math.PI * 2);
        ctx.fillStyle = starColor(alpha);
        ctx.fill();
      }

      // Shooting star
      if (shootingStar?.active) {
        const elapsed = now - shootingStarStart;
        const progress = Math.min(elapsed / SHOOT_DURATION, 1);
        const dist = 200 * progress;
        const hx = shootingStar.x + dist;
        const hy = shootingStar.y + dist;
        const tx = hx - shootingStar.length;
        const ty = hy - shootingStar.length;

        const grad = ctx.createLinearGradient(tx, ty, hx, hy);
        if (isDark) {
          grad.addColorStop(0, "rgba(200,220,255,0)");
          grad.addColorStop(1, `rgba(200,220,255,${1 - progress * 0.5})`);
        } else if (isGrey) {
          grad.addColorStop(0, "rgba(50,50,60,0)");
          grad.addColorStop(1, `rgba(50,50,60,${1 - progress * 0.5})`);
        } else {
          grad.addColorStop(0, "rgba(100,120,160,0)");
          grad.addColorStop(1, `rgba(100,120,160,${1 - progress * 0.5})`);
        }

        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (progress >= 1) shootingStar.active = false;
      }

      // Orion constellation
      if (orion && orion.phase !== "done") {
        const elapsed = now - orion.startTime;
        let alpha = 0;
        if (orion.phase === "fadein") {
          alpha = Math.min(elapsed / ORION_FADEIN, 1);
          if (elapsed >= ORION_FADEIN) {
            orion.phase = "hold";
            orion.startTime = now;
          }
        } else if (orion.phase === "hold") {
          alpha = 1;
          if (elapsed >= ORION_HOLD) {
            orion.phase = "fadeout";
            orion.startTime = now;
          }
        } else if (orion.phase === "fadeout") {
          alpha = Math.max(1 - elapsed / ORION_FADEOUT, 0);
          if (elapsed >= ORION_FADEOUT) {
            orion.phase = "done";
          }
        }
        orion.alpha = alpha;

        const cx = orion.cx;
        const cy = orion.cy;

        ctx.strokeStyle = starColor(alpha * 0.35);
        ctx.lineWidth = 0.8;

        ctx.beginPath();
        ctx.moveTo(
          cx + (ORION_STARS[1][0] - 0.5) * ORION_W,
          cy + (ORION_STARS[1][1] - 0.5) * ORION_H,
        );
        ctx.lineTo(
          cx + (ORION_STARS[0][0] - 0.5) * ORION_W,
          cy + (ORION_STARS[0][1] - 0.5) * ORION_H,
        );
        ctx.lineTo(
          cx + (ORION_STARS[2][0] - 0.5) * ORION_W,
          cy + (ORION_STARS[2][1] - 0.5) * ORION_H,
        );
        ctx.stroke();

        const body = [3, 4, 6, 5, 3];
        ctx.beginPath();
        body.forEach((idx, i) => {
          const sx = cx + (ORION_STARS[idx][0] - 0.5) * ORION_W;
          const sy = cy + (ORION_STARS[idx][1] - 0.5) * ORION_H;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();

        for (const [fx, fy] of ORION_STARS) {
          const sx = cx + (fx - 0.5) * ORION_W;
          const sy = cy + (fy - 0.5) * ORION_H;
          ctx.beginPath();
          ctx.arc(sx, sy, 2 + Math.random() * 1, 0, Math.PI * 2);
          ctx.fillStyle = starColor(alpha);
          ctx.fill();
        }
      }
    }

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(twinkleInterval);
      clearTimeout(shootingStarTimeout);
      clearTimeout(orionTimeout);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
