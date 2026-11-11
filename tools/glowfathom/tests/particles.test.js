import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../js/systems/pool.js';
import { createParticle, spawnRing, spawnDots, updateParticles, RING, DOT } from '../js/systems/particles.js';
import { createRng } from '../js/rng.js';

const dots = { speedMin: 50, speedMax: 100, size: 2, life: 0.5, color: '#fff' };

test('rings and dots spawn with their kind', () => {
  const pool = createPool(16, createParticle);
  spawnRing(pool, 0, 0, 10, 0.3, '#fff');
  spawnDots(pool, createRng(1), 0, 0, 5, dots);
  const active = pool.items.filter((p) => p.active);
  assert.equal(active.filter((p) => p.kind === RING).length, 1);
  assert.equal(active.filter((p) => p.kind === DOT).length, 5);
});

test('particles expire after their life and the pool never grows', () => {
  const pool = createPool(8, createParticle);
  spawnDots(pool, createRng(1), 0, 0, 20, dots); // more than fit
  assert.equal(pool.activeCount, 8);
  for (let i = 0; i < 60; i++) updateParticles(pool, 1 / 60);
  assert.equal(pool.activeCount, 0);
  assert.equal(pool.items.length, 8);
});

test('dots move outward and slow down', () => {
  const pool = createPool(1, createParticle);
  spawnDots(pool, createRng(1), 0, 0, 1, { ...dots, life: 10, angle: 0, spread: 0 });
  const p = pool.items[0];
  const v0 = p.vx;
  updateParticles(pool, 0.1);
  assert.ok(p.x > 0);
  assert.ok(p.vx < v0);
});

test('a directed burst stays within its spread', () => {
  const pool = createPool(50, createParticle);
  spawnDots(pool, createRng(3), 0, 0, 50, { ...dots, angle: 0, spread: 0.5 });
  for (const p of pool.items) assert.ok(Math.abs(Math.atan2(p.vy, p.vx)) <= 0.25 + 1e-9);
});
