import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, rebuildGrid, nearby } from '../js/systems/spatial.js';
import { separation } from '../js/systems/steering.js';
import { createRng } from '../js/rng.js';
import { ENEMIES } from '../js/data/enemies.js';
import { classRadius } from '../js/data/classes.js';
import { SEPARATION_CELL } from '../js/game.js';

test('nearby finds everything within one cell size, wherever it falls', () => {
  const rng = createRng(1);
  const items = Array.from({ length: 400 }, () => ({ x: rng.range(-1000, 1000), y: rng.range(-1000, 1000) }));
  const grid = createGrid(100);
  rebuildGrid(grid, items);
  for (const probe of items.slice(0, 50)) {
    const found = new Set(nearby(grid, probe.x, probe.y));
    for (const other of items) {
      if (Math.hypot(other.x - probe.x, other.y - probe.y) <= 100) assert.ok(found.has(other));
    }
  }
});

test('rebuilding forgets old positions', () => {
  const grid = createGrid(100);
  const a = { x: 0, y: 0 };
  rebuildGrid(grid, [a]);
  a.x = 5000;
  rebuildGrid(grid, [a]);
  assert.deepEqual(nearby(grid, 0, 0), []);
  assert.deepEqual(nearby(grid, 5000, 0), [a]);
});

test('the grid cell covers the widest separation range in the game', () => {
  const radii = Object.values(ENEMIES).map((d) => classRadius(d));
  const widest = 2 * Math.max(...radii) + 14;
  assert.ok(SEPARATION_CELL >= widest, `cell ${SEPARATION_CELL} < widest range ${widest}`);
});

test('separation from grid neighbours matches separation from everyone', () => {
  const rng = createRng(2);
  const enemies = Array.from({ length: 300 }, () => ({
    x: rng.range(-600, 600), y: rng.range(-600, 600), radius: rng.range(6, 50), alive: true,
  }));
  const grid = createGrid(SEPARATION_CELL);
  rebuildGrid(grid, enemies);
  for (const e of enemies) {
    const all = separation(e, enemies, 14);
    const near = separation(e, nearby(grid, e.x, e.y), 14);
    assert.ok(Math.abs(all.x - near.x) < 1e-9 && Math.abs(all.y - near.y) < 1e-9);
  }
});
