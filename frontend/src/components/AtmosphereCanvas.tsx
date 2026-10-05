'use client';

import React, { useEffect, useRef } from 'react';

interface AtmosphereCanvasProps {
  effectType: 'rain' | 'particles' | 'cyber-grid' | 'stars' | 'ambient';
  accentColor?: string;
}

export function AtmosphereCanvas({ effectType, accentColor = '#38bdf8' }: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Resize handler
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    if (reducedMotion || effectType === 'ambient') {
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    // ── RAIN SIMULATION ──────────────────────────────
    if (effectType === 'rain') {
      const dropCount = Math.min(120, Math.floor(window.innerWidth / 15));
      const drops: Array<{ x: number; y: number; length: number; speed: number; opacity: number }> = [];

      for (let i = 0; i < dropCount; i++) {
        drops.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          length: 15 + Math.random() * 20,
          speed: 8 + Math.random() * 8,
          opacity: 0.15 + Math.random() * 0.25,
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.2;

        for (const d of drops) {
          ctx.beginPath();
          ctx.globalAlpha = d.opacity;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - 2, d.y + d.length);
          ctx.stroke();

          d.y += d.speed;
          d.x -= 0.5;

          if (d.y > canvas.height) {
            d.y = -d.length;
            d.x = Math.random() * (canvas.width + 100);
          }
        }

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    }

    // ── PARTICLES SIMULATION ─────────────────────────
    else if (effectType === 'particles') {
      const particleCount = Math.min(60, Math.floor(window.innerWidth / 25));
      const particles: Array<{ x: number; y: number; r: number; vx: number; vy: number; alpha: number }> = [];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 1 + Math.random() * 2.5,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.2 - Math.random() * 0.4,
          alpha: 0.2 + Math.random() * 0.5,
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
          ctx.beginPath();
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = p.alpha;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();

          p.x += p.vx;
          p.y += p.vy;

          if (p.y < 0) p.y = canvas.height;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
        }

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    }

    // ── STARS SIMULATION ─────────────────────────────
    else if (effectType === 'stars') {
      const starCount = Math.min(80, Math.floor(window.innerWidth / 20));
      const stars: Array<{ x: number; y: number; r: number; alpha: number; delta: number }> = [];

      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 0.8 + Math.random() * 1.5,
          alpha: 0.1 + Math.random() * 0.7,
          delta: 0.005 + Math.random() * 0.015,
        });
      }

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const s of stars) {
          s.alpha += s.delta;
          if (s.alpha > 0.85 || s.alpha < 0.15) s.delta = -s.delta;

          ctx.beginPath();
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = Math.max(0, s.alpha);
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    }

    // ── CYBER GRID SIMULATION ────────────────────────
    else if (effectType === 'cyber-grid') {
      let offset = 0;
      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.08;

        const gridSize = 48;
        offset = (offset + 0.3) % gridSize;

        // Vertical lines
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        // Drifting Horizontal lines
        for (let y = offset; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        animationFrameId = requestAnimationFrame(render);
      };
      render();
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [effectType, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
}
