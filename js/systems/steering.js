// Steering rules for enemies. Each returns a desired velocity or a push
// vector. No browser references, so these can be tested in Node.

// Moves velocity toward (dvx, dvy) exponentially, like the player's movement.
export function steerVelocity(body, dvx, dvy, rate, dt) {
  const keep = Math.exp(-rate * dt);
  body.vx = dvx + (body.vx - dvx) * keep;
  body.vy = dvy + (body.vy - dvy) * keep;
}

export function seek(from, tx, ty, speed) {
  const dx = tx - from.x;
  const dy = ty - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return { x: 0, y: 0 };
  return { x: (dx / d) * speed, y: (dy / d) * speed };
}

// Moves toward or away from the target to sit at `preferred` distance,
// while circling it in direction `orbitDir` (+1 or -1).
export function keepDistance(from, tx, ty, preferred, speed, orbitDir) {
  const dx = tx - from.x;
  const dy = ty - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return { x: speed, y: 0 };
  const nx = dx / d;
  const ny = dy / d;
  const radial = Math.max(-1, Math.min(1, (d - preferred) / (preferred * 0.3)));
  const x = nx * radial - ny * orbitDir * 0.8;
  const y = ny * radial + nx * orbitDir * 0.8;
  const len = Math.hypot(x, y);
  return { x: (x / len) * speed, y: (y / len) * speed };
}

export function wanderAngle(angle, jitter, rng, dt) {
  return angle + (rng.next() * 2 - 1) * jitter * dt;
}

// Push away from every live neighbour closer than the two radii plus
// `padding`, stronger the closer it is. Returns an unscaled vector.
export function separation(self, others, padding) {
  let x = 0;
  let y = 0;
  for (const o of others) {
    if (o === self || !o.alive) continue;
    const range = self.radius + o.radius + padding;
    const dx = self.x - o.x;
    const dy = self.y - o.y;
    const d = Math.hypot(dx, dy);
    if (d >= range) continue;
    const strength = 1 - d / range;
    if (d < 1e-6) {
      x += strength; // exactly on top of each other: pick a direction
    } else {
      x += (dx / d) * strength;
      y += (dy / d) * strength;
    }
  }
  return { x, y };
}

// Pull toward the centre once within `margin` of the arena edge.
export function containment(body, arenaRadius, margin) {
  const d = Math.hypot(body.x, body.y);
  const start = arenaRadius - margin;
  if (d <= start || d < 1e-6) return { x: 0, y: 0 };
  const over = (d - start) / margin;
  return { x: (-body.x / d) * over, y: (-body.y / d) * over };
}
