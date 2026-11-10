import { circlesOverlap } from './collision.js';

export function createProjectile() {
  return { x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, life: 0, damage: 0, radius: 0 };
}

// Moves projectiles, hits the first live target they overlap, and removes
// them when they hit, run out of life, or leave the arena.
// `onHit(target, projectile)` and `onPop(x, y, radius)` report what happened.
export function updateProjectiles(pool, targets, arenaRadius, onHit, onPop, dt) {
  for (const p of pool.items) {
    if (!p.active) continue;
    p.prevX = p.x;
    p.prevY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    let hit = null;
    for (const t of targets) {
      if (t.alive && circlesOverlap(p.x, p.y, p.radius, t.x, t.y, t.radius)) {
        hit = t;
        break;
      }
    }
    if (hit) {
      onHit(hit, p);
      onPop(p.x, p.y, p.radius);
      pool.release(p);
    } else if (p.life <= 0 || Math.hypot(p.x, p.y) > arenaRadius) {
      onPop(p.x, p.y, p.radius);
      pool.release(p);
    }
  }
}
