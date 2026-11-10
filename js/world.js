// The grid of arenas. No browser references, so this can be tested in Node.
//
// Cells are { col, row } with row 0 at the top. Each arena is a circle; the
// quarter of its membrane you leave through decides which neighbour you
// enter. Quarters facing off the grid are solid.

export const DIRECTIONS = {
  east: { dc: 1, dr: 0 },
  south: { dc: 0, dr: 1 },
  west: { dc: -1, dr: 0 },
  north: { dc: 0, dr: -1 },
};

export const cellKey = (cell) => `${cell.col},${cell.row}`;

export function createWorld(size) {
  const mid = Math.floor(size / 2);
  const centre = { col: mid, row: mid };
  return { size, centre, visited: new Set([cellKey(centre)]) };
}

export function inGrid(world, col, row) {
  return col >= 0 && row >= 0 && col < world.size && row < world.size;
}

// 0 at the centre, rising by one per ring outward.
export function difficultyOf(world, cell) {
  return Math.max(Math.abs(cell.col - world.centre.col), Math.abs(cell.row - world.centre.row));
}

// Which quarter of the membrane a point outside the centre is in.
// Screen y points down, so positive y is south.
export function exitDirection(x, y) {
  const a = Math.atan2(y, x);
  const q = Math.PI / 4;
  if (a >= -q && a <= q) return 'east';
  if (a > q && a <= 3 * q) return 'south';
  if (a < -q && a >= -3 * q) return 'north';
  return 'west';
}

export function neighbour(world, cell, direction) {
  const { dc, dr } = DIRECTIONS[direction];
  const col = cell.col + dc;
  const row = cell.row + dr;
  return inGrid(world, col, row) ? { col, row } : null;
}

// Directions whose membrane is solid because no arena lies beyond it.
export function solidSides(world, cell) {
  return Object.keys(DIRECTIONS).filter((d) => !neighbour(world, cell, d));
}

// Where you appear in the next arena: the mirror image of where you left,
// on the opposite edge, pulled `inset` units inside the membrane.
export function entryPosition(x, y, direction, arenaRadius, inset) {
  const ex = direction === 'east' || direction === 'west' ? -x : x;
  const ey = direction === 'north' || direction === 'south' ? -y : y;
  const d = Math.hypot(ex, ey) || 1;
  const r = Math.min(d, arenaRadius - inset);
  return { x: (ex / d) * r, y: (ey / d) * r };
}

// The enemy population for a difficulty. Difficulties beyond the last
// roster use the last one.
export function rosterFor(difficulty, rosters) {
  return rosters[Math.min(difficulty, rosters.length - 1)];
}
