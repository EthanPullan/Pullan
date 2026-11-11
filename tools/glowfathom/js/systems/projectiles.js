import { circlesOverlap } from './collision.js';
import { turnToward } from './movement.js';

export function createProjectile() {
  return {
    x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0,
    life: 0, damage: 0, radius: 0, knockback: 0,
    turnRate: 0, homingRange: 0, // homing
    pierce: 0, lastHit: null, // piercing
    explodeRadius: 0, explodeDamage: 0, // exploding
  };
}

function nearestTarget(p, targets, range) {
  let best = null;
  let bestD = range;
  for (const t of targets) {
    if (!t.alive) continue;
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

// Moves projectiles, hits the first live target they overlap, and removes
// them when they hit, run out of life, or leave the arena.
// `events.onHit(target, p)`, `events.onPop(x, y, radius)` and, for exploding
// shots, `events.onExplode(p)` report what happened.
export function updateProjectiles(pool, targets, arenaRadius, events, dt) {
  for (const p of pool.items) {
    if (!p.active) continue;
    p.prevX = p.x;
    p.prevY = p.y;

    if (p.turnRate > 0) {
      const t = nearestTarget(p, targets, p.homingRange);
      if (t) {
        const speed = Math.hypot(p.vx, p.vy);
        const angle = turnToward(Math.atan2(p.vy, p.vx), Math.atan2(t.y - p.y, t.x - p.x), p.turnRate * dt);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    let hit = null;
    for (const t of targets) {
      if (t.alive && t !== p.lastHit && circlesOverlap(p.x, p.y, p.radius, t.x, t.y, t.radius)) {
        hit = t;
        break;
      }
    }
    if (hit) {
      events.onHit(hit, p);
      if (p.explodeRadius > 0) events.onExplode(p);
      events.onPop(p.x, p.y, p.radius);
      if (p.pierce > 0) {
        p.pierce--;
        p.lastHit = hit;
      } else {
        pool.release(p);
      }
    } else if (p.life <= 0 || Math.hypot(p.x, p.y) > arenaRadius) {
      events.onPop(p.x, p.y, p.radius);
      pool.release(p);
    }
  }
}
