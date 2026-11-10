// Keeps the arena stocked: whenever fewer of an enemy type are alive than
// the population asks for, one is added after `respawnSeconds`.

export function createSpawner(population) {
  return {
    population,
    timers: Object.fromEntries(Object.keys(population).map((id) => [id, 0])),
  };
}

// A random point inside the arena, at least `minDistance` from the player.
// Falls back to the opposite side of the arena if no point is found.
export function spawnPoint(player, arenaRadius, edgeMargin, minDistance, rng) {
  const maxR = arenaRadius - edgeMargin;
  for (let tries = 0; tries < 30; tries++) {
    const a = rng.next() * Math.PI * 2;
    const r = Math.sqrt(rng.next()) * maxR;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (Math.hypot(x - player.x, y - player.y) >= minDistance) return { x, y };
  }
  const d = Math.hypot(player.x, player.y) || 1;
  return { x: (-player.x / d) * maxR, y: (-player.y / d) * maxR };
}

// Calls `spawn(typeId)` for each enemy due. `immediate` fills every gap at
// once, used when the arena is first populated.
export function updateSpawner(spawner, enemies, spawn, respawnSeconds, dt, immediate = false) {
  for (const [id, wanted] of Object.entries(spawner.population)) {
    let alive = 0;
    for (const e of enemies) if (e.alive && e.def.id === id) alive++;
    if (alive >= wanted) {
      spawner.timers[id] = respawnSeconds;
      continue;
    }
    if (immediate) {
      for (let i = alive; i < wanted; i++) spawn(id);
      continue;
    }
    spawner.timers[id] -= dt;
    if (spawner.timers[id] <= 0) {
      spawn(id);
      spawner.timers[id] = respawnSeconds;
    }
  }
}
