// A uniform grid for finding nearby things quickly. Items are bucketed by
// position once per step; a query then looks only at the 3×3 block of
// cells around a point, instead of at every item. `cellSize` must be at
// least the largest distance a query cares about. No browser references.

export function createGrid(cellSize) {
  return { cellSize, cells: new Map(), used: [], scratch: [] };
}

const key = (cx, cy) => (cx + 32768) * 65536 + (cy + 32768);

// Re-buckets `items` (anything with x, y). Bucket arrays are reused between
// steps, so rebuilding allocates nothing once the grid has warmed up.
export function rebuildGrid(grid, items) {
  for (const bucket of grid.used) bucket.length = 0;
  grid.used.length = 0;
  for (const item of items) {
    const k = key(Math.floor(item.x / grid.cellSize), Math.floor(item.y / grid.cellSize));
    let bucket = grid.cells.get(k);
    if (!bucket) {
      bucket = [];
      grid.cells.set(k, bucket);
    }
    if (bucket.length === 0) grid.used.push(bucket);
    bucket.push(item);
  }
}

// Everything in the 3×3 cells around (x, y). The returned array is reused
// by the next call, so use it before querying again.
export function nearby(grid, x, y) {
  const out = grid.scratch;
  out.length = 0;
  const cx = Math.floor(x / grid.cellSize);
  const cy = Math.floor(y / grid.cellSize);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = grid.cells.get(key(cx + dx, cy + dy));
      if (bucket) for (const item of bucket) out.push(item);
    }
  }
  return out;
}
