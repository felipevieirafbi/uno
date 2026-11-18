import React, { useEffect, useRef } from 'react';

export interface JuiceBurstSignal {
  seq: number;
  kind: 'card_play' | 'stack' | 'uno' | 'victory' | 'championship' | 'taunt' | 'legendary_taunt';
  accentColor?: string;
  shockwave?: boolean;
}

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ShockwaveSlot {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

const POOL_SIZE = 84;
const RING_POOL_SIZE = 8;
const SUIT_PALETTE = ['#E11D48', '#0284C7', '#FACC15', '#16A34A', '#FFFDF9'];
const STACK_PALETTE = ['#EF4444', '#F97316', '#FACC15', '#FFFDF9'];
const LEGENDARY_PALETTE = ['#FDE047', '#F472B6', '#38BDF8', '#A855F7', '#4ADE80', '#FFFDF9'];
const CHAMPION_PALETTE = ['#FDE047', '#FACC15', '#F59E0B', '#34D399', '#FFFDF9'];

function createParticlePool(): ParticleSlot[] {
  const pool: ParticleSlot[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      vrot: 0,
      size: 8,
      life: 0,
      maxLife: 1,
      color: '#FACC15',
    });
  }
  return pool;
}

function createShockwavePool(): ShockwaveSlot[] {
  const pool: ShockwaveSlot[] = [];
  for (let i = 0; i < RING_POOL_SIZE; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      radius: 16,
      maxRadius: 200,
      life: 0,
      maxLife: 0.5,
      color: '#FACC15',
    });
  }
  return pool;
}

export const TableJuiceOverlay: React.FC<{ burst: JuiceBurstSignal | null }> = ({ burst }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poolRef = useRef<ParticleSlot[]>(createParticlePool());
  const ringPoolRef = useRef<ShockwaveSlot[]>(createShockwavePool());
  const cursorRef = useRef<number>(0);
  const ringCursorRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    };

    syncSize();
    window.addEventListener('resize', syncSize);
    return () => {
      window.removeEventListener('resize', syncSize);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (!burst || burst.seq === 0) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cx = window.innerWidth * 0.5 * dpr;
    const cy =
      window.innerHeight *
      (burst.kind === 'uno'
        ? 0.72
        : burst.kind === 'taunt' || burst.kind === 'legendary_taunt'
          ? 0.42
          : burst.kind === 'championship'
            ? 0.35
            : 0.46) *
      dpr;
    const count =
      burst.kind === 'championship'
        ? 64
        : burst.kind === 'victory' || burst.kind === 'legendary_taunt'
          ? 48
          : burst.kind === 'stack'
            ? 28
            : burst.kind === 'taunt'
              ? 20
              : burst.kind === 'card_play'
                ? 14
                : 20;
    const basePalette =
      burst.kind === 'championship'
        ? CHAMPION_PALETTE
        : burst.kind === 'legendary_taunt'
          ? LEGENDARY_PALETTE
          : burst.kind === 'stack'
            ? STACK_PALETTE
            : SUIT_PALETTE;
    const pool = poolRef.current;

    for (let i = 0; i < count; i++) {
      const idx = cursorRef.current % POOL_SIZE;
      cursorRef.current += 1;
      const slot = pool[idx];
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const isBig =
        burst.kind === 'championship' ||
        burst.kind === 'victory' ||
        burst.kind === 'legendary_taunt';
      const speed =
        (burst.kind === 'card_play'
          ? 125 + Math.random() * 155
          : isBig
            ? 240 + Math.random() * 400
            : 185 + Math.random() * 260) * dpr;

      slot.active = true;
      slot.x = cx;
      slot.y = cy;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed - (isBig ? 160 * dpr : 65 * dpr);
      slot.rot = Math.random() * Math.PI * 2;
      slot.vrot = (Math.random() - 0.5) * 11;
      slot.size = (isBig ? 8 + Math.random() * 6 : 6 + Math.random() * 5) * dpr;
      slot.maxLife = isBig ? 1.1 : 0.72;
      slot.life = slot.maxLife;
      slot.color =
        burst.accentColor && i % 2 === 0
          ? burst.accentColor
          : basePalette[i % basePalette.length];
    }

    const shouldRing =
      Boolean(burst.shockwave) ||
      burst.kind === 'stack' ||
      burst.kind === 'victory' ||
      burst.kind === 'championship';
    if (shouldRing) {
      const rings = ringPoolRef.current;
      const primaryIdx = ringCursorRef.current % RING_POOL_SIZE;
      ringCursorRef.current += 1;
      const rSlot = rings[primaryIdx];
      rSlot.active = true;
      rSlot.x = cx;
      rSlot.y = cy;
      rSlot.radius = 22 * dpr;
      rSlot.maxRadius =
        (burst.kind === 'championship' || burst.kind === 'victory' ? 280 : 195) * dpr;
      rSlot.maxLife = 0.52;
      rSlot.life = rSlot.maxLife;
      rSlot.color = burst.accentColor || '#FACC15';
    }

    const step = (now: number) => {
      const rawDt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = 0;
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      const gravity = 640 * dpr;

      const rings = ringPoolRef.current;
      for (let i = 0; i < RING_POOL_SIZE; i++) {
        const ring = rings[i];
        if (!ring.active) continue;
        ring.life -= dt;
        if (ring.life <= 0) {
          ring.active = false;
          continue;
        }
        alive += 1;
        const progress = 1 - ring.life / ring.maxLife;
        const eased = 1 - Math.pow(1 - progress, 3);
        const curRadius = ring.radius + (ring.maxRadius - ring.radius) * eased;
        const alpha = Math.max(0, (1 - progress) * 0.78);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = Math.max(1.5, (1 - progress) * 6.5 * dpr);
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, curRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = 0; i < POOL_SIZE; i++) {
        const p = pool[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        alive += 1;
        p.vy += gravity * dt;
        p.vx *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;

        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.65, -p.size * 0.42, p.size * 1.3, p.size * 0.84);
        ctx.restore();
      }

      if (alive > 0) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafRef.current = 0;
        lastTimeRef.current = 0;
      }
    };

    if (!rafRef.current) {
      lastTimeRef.current = performance.now();
      rafRef.current = window.requestAnimationFrame(step);
    }
  }, [burst]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="table-juice-canvas"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 h-full w-full"
    />
  );
};
