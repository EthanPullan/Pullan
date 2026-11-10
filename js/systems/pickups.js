// Collectable bubbles. No browser references, so these can be tested in Node.

import { constrainToArena } from './movement.js';

export function createPickup() {
  return { x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, age: 0, delay: 0, value: 1 };
}

// Scatters `count` pickups from (x, y) in random directions. Returns how
// many were spawned, which is fewer only if the pool is full.
export function spawnBurst(pool, x, y, count, speedMin, speedMax, delay, rng) {
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    const p = pool.spawn();
    if (!p) break;
    const angle = rng.next() * Math.PI * 2;
    const speed = speedMin + rng.next() * (speedMax - speedMin);
    p.x = x;
    p.y = y;
    p.prevX = x;
    p.prevY = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.age = 0;
    p.delay = delay;
    p.value = 1;
    spawned++;
  }
  return spawned;
}

// Attracts and collects pickups. They never expire: they stay until
// collected or until the player leaves the arena. `onCollect(value)` is
// called for each one the player touches once its collect delay has passed.
export function updatePickups(pool, player, magnetRadius, params, arenaRadius, onCollect, dt) {
  for (const p of pool.items) {
    if (!p.active) continue;
    p.prevX = p.x;
    p.prevY = p.y;
    p.age += dt;
    p.delay -= dt;

    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const d = Math.hypot(dx, dy);
    const ready = p.delay <= 0;
    if (ready && d < player.radius + params.radius) {
      onCollect(p.value);
      pool.release(p);
      continue;
    }

    if (ready && d < magnetRadius && d > 1e-6) {
      p.vx += (dx / d) * params.magnetAccel * dt;
      p.vy += (dy / d) * params.magnetAccel * dt;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > params.magnetMaxSpeed) {
        p.vx *= params.magnetMaxSpeed / speed;
        p.vy *= params.magnetMaxSpeed / speed;
      }
    } else {
      const keep = Math.exp(-params.drag * dt);
      p.vx *= keep;
      p.vy *= keep;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    constrainToArena(p, params.radius, arenaRadius, 0.5);
  }
}
