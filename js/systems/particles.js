// Short-lived visual particles: expanding rings (pops) and drifting dots
// (bursts, muzzle puffs, trails). One fixed pool, so effects never
// allocate. No browser references, so this can be tested in Node.

export const RING = 0;
export const DOT = 1;

export function createParticle() {
  return {
    kind: RING, x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0,
    size: 0, age: 0, life: 0, drag: 0, color: '#ffffff',
  };
}

function spawn(pool, kind, x, y, vx, vy, size, life, drag, color) {
  const p = pool.spawn();
  if (!p) return null;
  p.kind = kind;
  p.x = p.prevX = x;
  p.y = p.prevY = y;
  p.vx = vx;
  p.vy = vy;
  p.size = size;
  p.age = 0;
  p.life = life;
  p.drag = drag;
  p.color = color;
  return p;
}

// An expanding, fading ring.
export function spawnRing(pool, x, y, radius, life, color) {
  return spawn(pool, RING, x, y, 0, 0, radius, life, 0, color);
}

// `count` dots flung out from (x, y). `angle` and `spread` narrow the
// direction (a full circle by default).
export function spawnDots(pool, rng, x, y, count, opts) {
  const {
    speedMin, speedMax, size, life, color, drag = 4, angle = 0, spread = Math.PI * 2,
  } = opts;
  for (let i = 0; i < count; i++) {
    const a = angle + (rng.next() - 0.5) * spread;
    const s = speedMin + rng.next() * (speedMax - speedMin);
    const sz = size * (0.6 + rng.next() * 0.8);
    const lf = life * (0.7 + rng.next() * 0.6);
    if (!spawn(pool, DOT, x, y, Math.cos(a) * s, Math.sin(a) * s, sz, lf, drag, color)) return;
  }
}

export function updateParticles(pool, dt) {
  for (const p of pool.items) {
    if (!p.active) continue;
    p.age += dt;
    if (p.age >= p.life) {
      pool.release(p);
      continue;
    }
    p.prevX = p.x;
    p.prevY = p.y;
    const keep = Math.exp(-p.drag * dt);
    p.vx *= keep;
    p.vy *= keep;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
