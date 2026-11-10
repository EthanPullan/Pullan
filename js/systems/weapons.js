// Firing rules. No browser references, so these can be tested in Node.

export function createTrigger() {
  return { cooldown: 0 };
}

// Returns how many shots to fire this step. Called once per fixed step, so
// the rate is the same at any frame rate. Releasing the trigger does not
// bank shots: pressing again fires one shot immediately, not a burst.
export function updateTrigger(trigger, held, weapon, dt) {
  let shots = 0;
  if (held) {
    while (trigger.cooldown <= 1e-9) {
      shots++;
      trigger.cooldown += 1 / weapon.fireRate;
    }
  }
  trigger.cooldown -= dt;
  // While held, a negative cooldown carries the part of a step already
  // waited, keeping rates that don't divide the step evenly accurate.
  if (!held && trigger.cooldown < 0) trigger.cooldown = 0;
  return shots;
}

// Spawns one volley from (x, y) toward `angle`, starting `muzzle` units out.
// A single projectile lands randomly within the spread; several projectiles
// are fanned evenly across it.
export function fireWeapon(pool, weapon, x, y, angle, muzzle, rng) {
  for (let i = 0; i < weapon.count; i++) {
    const offset = weapon.count > 1
      ? (i / (weapon.count - 1) - 0.5) * weapon.spread
      : (rng.next() - 0.5) * weapon.spread;
    const a = angle + offset;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const p = pool.spawn();
    if (!p) return;
    p.x = x + cos * muzzle;
    p.y = y + sin * muzzle;
    p.prevX = p.x;
    p.prevY = p.y;
    p.vx = cos * weapon.speed;
    p.vy = sin * weapon.speed;
    p.life = weapon.lifetime;
    p.damage = weapon.damage;
    p.radius = weapon.radius;
    p.knockback = weapon.knockback;
  }
}
