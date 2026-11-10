// Circles that only touch at one point do not count as overlapping.
export function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

// Moves `moving` out of `fixed` along the line between their centres, so
// they just touch. Returns the unit normal from fixed to moving, or null if
// they were not overlapping.
export function pushApart(fixed, moving) {
  const dx = moving.x - fixed.x;
  const dy = moving.y - fixed.y;
  const r = fixed.radius + moving.radius;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  const d = Math.sqrt(d2);
  const nx = d > 1e-6 ? dx / d : 1;
  const ny = d > 1e-6 ? dy / d : 0;
  moving.x = fixed.x + nx * r;
  moving.y = fixed.y + ny * r;
  return { x: nx, y: ny };
}
