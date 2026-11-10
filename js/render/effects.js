import { rgba } from './color.js';
import { RING } from '../systems/particles.js';

// Rings expand and fade; dots shrink and fade.
export function drawParticles(ctx, pool, alpha) {
  ctx.lineWidth = 1.5;
  for (const p of pool.items) {
    if (!p.active) continue;
    const t = p.age / p.life;
    const x = p.prevX + (p.x - p.prevX) * alpha;
    const y = p.prevY + (p.y - p.prevY) * alpha;
    ctx.beginPath();
    if (p.kind === RING) {
      ctx.strokeStyle = rgba(p.color, (1 - t) * 0.85);
      ctx.arc(x, y, p.size * (1 + 1.6 * t), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = rgba(p.color, (1 - t) * 0.9);
      ctx.arc(x, y, p.size * (1 - 0.5 * t), 0, Math.PI * 2);
      ctx.fill();
    }
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

// Golden bubbles.
export function drawPickups(ctx, pool, alpha, color, settings) {
  const r = settings.radius;
  ctx.lineWidth = 1.2;
  for (const p of pool.items) {
    if (!p.active) continue;
    const x = p.prevX + (p.x - p.prevX) * alpha;
    const y = p.prevY + (p.y - p.prevY) * alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.25);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
  }
}
