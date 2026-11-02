import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

type Particle = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
};

const COLORS = ["231,196,106", "232,161,91", "247,245,239"];

export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let particles: Particle[] = [];
    let visible = true;

    const make = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.6 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.24,
      vy: -0.09 - Math.random() * 0.26,
      alpha: 0.12 + Math.random() * 0.34,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = width < 700 ? 22 : 38;
      particles = Array.from({ length: target }, make);
    };

    const tick = () => {
      if (!visible) return;
      ctx.clearRect(0, 0, width, height);
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.y < -12) {
          particle.y = height + 12;
          particle.x = Math.random() * width;
        }
        if (particle.x < -12) particle.x = width + 12;
        if (particle.x > width + 12) particle.x = -12;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${particle.color},${particle.alpha})`;
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = window.requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      window.cancelAnimationFrame(frame);
      if (visible) frame = window.requestAnimationFrame(tick);
    };

    resize();
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  return <canvas ref={ref} className="particle-field" aria-hidden="true" />;
}
