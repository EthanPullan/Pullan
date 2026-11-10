import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../js/systems/pool.js';
import { createPickup, spawnBurst, updatePickups } from '../js/systems/pickups.js';
import { createRng } from '../js/rng.js';
import { ENEMIES } from '../js/data/enemies.js';
import { TUNING } from '../js/data/tuning.js';

const settings = TUNING.pickups;
const active = (pool) => pool.items.filter((p) => p.active);

test('each enemy drops its configured number of bubbles', () => {
  for (const def of Object.values(ENEMIES)) {
    const pool = createPool(64, createPickup);
    const n = spawnBurst(pool, 0, 0, def.drops, 60, 160, 0, createRng(1));
    assert.equal(n, def.drops, def.id);
    assert.equal(active(pool).reduce((sum, p) => sum + p.value, 0), def.drops, def.id);
  }
});

test('a full pool spawns only what fits', () => {
  const pool = createPool(2, createPickup);
  assert.equal(spawnBurst(pool, 0, 0, 5, 60, 160, 0, createRng(1)), 2);
});

test('touching a ready pickup collects it; a delayed one waits', () => {
  const player = { x: 0, y: 0, radius: 20 };
  const pool = createPool(4, createPickup);
  spawnBurst(pool, 0, 0, 1, 0, 0, 0, createRng(1));
  spawnBurst(pool, 0, 0, 1, 0, 0, 1, createRng(1));
  let collected = 0;
  updatePickups(pool, player, 120, settings, 1000, (v) => { collected += v; }, 1 / 60);
  assert.equal(collected, 1);
  assert.equal(active(pool).length, 1);
});

test('pickups inside the pickup radius are drawn in and collected', () => {
  const player = { x: 0, y: 0, radius: 20 };
  const pool = createPool(1, createPickup);
  spawnBurst(pool, 100, 0, 1, 0, 0, 0, createRng(1));
  let collected = 0;
  for (let i = 0; i < 120 && !collected; i++) {
    updatePickups(pool, player, 120, settings, 1000, (v) => { collected += v; }, 1 / 60);
  }
  assert.equal(collected, 1);
});

test('pickups outside the radius are left alone and never expire', () => {
  const player = { x: 0, y: 0, radius: 20 };
  const pool = createPool(1, createPickup);
  spawnBurst(pool, 300, 0, 1, 0, 0, 0, createRng(1));
  for (let i = 0; i < 60 * 120; i++) {
    updatePickups(pool, player, 120, settings, 1000, () => assert.fail('collected'), 1 / 60);
  }
  assert.equal(active(pool).length, 1);
});
