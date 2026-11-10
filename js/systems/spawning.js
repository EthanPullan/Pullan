// Fills an arena from its roster when you enter it. Arenas are not topped
// up while you stay, so a cleared arena stays clear until you come back.
// `spawn(typeId, count)` is called once per enemy, or once per pack (with
// the pack's size) for types listed in `packs`.
export function populate(roster, packs, spawn) {
  for (const [id, count] of Object.entries(roster)) {
    if (packs.includes(id)) spawn(id, count);
    else for (let i = 0; i < count; i++) spawn(id, 1);
  }
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
