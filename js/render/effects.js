import { rgba } from './color.js';

export function createPop() {
  return { x: 0, y: 0, radius: 0, age: 0, life: 0, color: '#ffffff' };
}

export function spawnPop(pool, x, y, radius, life, color) {
  const pop = pool.spawn();
  if (!pop) return;
  pop.x = x;
  pop.y = y;
  pop.radius = radius;
  pop.age = 0;
  pop.life = life;
  pop.color = color;
}

export function updatePops(pool, dt) {
  for (const pop of pool.items) {
    if (!pop.active) continue;
    pop.age += dt;
    if (pop.age >= pop.life) pool.release(pop);
  }
}

// An expanding, fading ring.
export function drawPops(ctx, pool) {
  ctx.lineWidth = 1.5;
  for (const pop of pool.items) {
    if (!pop.active) continue;
    const t = pop.age / pop.life;
    ctx.strokeStyle = rgba(pop.color, (1 - t) * 0.85);
    ctx.beginPath();
    ctx.arc(pop.x, pop.y, pop.radius * (1 + 1.6 * t), 0, Math.PI * 2);
    ctx.stroke();
  }
}

// A soft glow plus a bright core, each drawn as one path for all projectiles.
export function drawProjectiles(ctx, pool, alpha, color) {
  const path = (scale) => {
    ctx.beginPath();
    for (const p of pool.items) {
      if (!p.active) continue;
      const x = p.prevX + (p.x - p.prevX) * alpha;
      const y = p.prevY + (p.y - p.prevY) * alpha;
      const r = p.radius * scale;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  path(2.2);
  ctx.fillStyle = rgba(color, 0.18);
  ctx.fill();
  ctx.restore();
  path(1);
  ctx.fillStyle = rgba(color, 0.95);
  ctx.fill();
}
