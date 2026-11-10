import { rgba } from './color.js';
import { RING } from '../systems/particles.js';

// Rings expand and fade; dots shrink and fade. Particles off screen are
// skipped. To keep draw calls few, particles are grouped by kind, colour
// and one of FADE_LEVELS fade steps, and each group is drawn as one path.
const FADE_LEVELS = 8;
const groups = new Map(); // `${kind}${color}` -> array of FADE_LEVELS lists
const used = [];

function groupFor(kind, color) {
  const key = kind + color;
  let levels = groups.get(key);
  if (!levels) {
    levels = Array.from({ length: FADE_LEVELS }, () => []);
    levels.kind = kind;
    levels.color = color;
    groups.set(key, levels);
  }
  return levels;
}

export function drawParticles(ctx, pool, alpha, cam, view) {
  const halfW = view.w / 2 + 60;
  const halfH = view.h / 2 + 60;
  used.length = 0;
  for (const p of pool.items) {
    if (!p.active) continue;
    if (Math.abs(p.x - cam.x) > halfW + p.size * 3 || Math.abs(p.y - cam.y) > halfH + p.size * 3) continue;
    const levels = groupFor(p.kind, p.color);
    const level = Math.min(FADE_LEVELS - 1, Math.floor((p.age / p.life) * FADE_LEVELS));
    if (levels[level].length === 0) used.push(levels[level]);
    levels[level].push(p);
    levels[level].group = levels;
    levels[level].level = level;
  }
  ctx.lineWidth = 1.5;
  for (const list of used) {
    const { kind, color } = list.group;
    const fade = 1 - (list.level + 0.5) / FADE_LEVELS;
    ctx.beginPath();
    for (const p of list) {
      const t = p.age / p.life;
      const x = p.prevX + (p.x - p.prevX) * alpha;
      const y = p.prevY + (p.y - p.prevY) * alpha;
      const r = kind === RING ? p.size * (1 + 1.6 * t) : p.size * (1 - 0.5 * t);
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    if (kind === RING) {
      ctx.strokeStyle = rgba(color, fade * 0.85);
      ctx.stroke();
    } else {
      ctx.fillStyle = rgba(color, fade * 0.9);
      ctx.fill();
    }
    list.length = 0;
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
