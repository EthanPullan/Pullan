import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrigger, updateTrigger, fireWeapon } from '../js/systems/weapons.js';
import { createPool } from '../js/systems/pool.js';
import { createProjectile } from '../js/systems/projectiles.js';
import { createRng } from '../js/rng.js';
import { WEAPONS } from '../js/data/weapons.js';

const DT = 1 / 60;

function shotsOver(seconds, weapon, held = () => true) {
  const trigger = createTrigger();
  let shots = 0;
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) shots += updateTrigger(trigger, held(i), weapon, DT);
  return shots;
}

test('10 seconds of holding fires at the weapon rate', () => {
  assert.equal(shotsOver(10, WEAPONS.starter), 10 * WEAPONS.starter.fireRate);
});

test('a rate that does not divide the step evenly still averages correctly', () => {
  const weapon = { ...WEAPONS.starter, fireRate: 7 };
  assert.equal(shotsOver(10, weapon), 70);
});

test('not holding the trigger fires nothing', () => {
  assert.equal(shotsOver(10, WEAPONS.starter, () => false), 0);
});

test('a pause does not bank shots for a burst', () => {
  const trigger = createTrigger();
  for (let i = 0; i < 120; i++) updateTrigger(trigger, false, WEAPONS.starter, DT);
  assert.equal(updateTrigger(trigger, true, WEAPONS.starter, DT), 1);
});

test('a volley spawns `count` projectiles fanned across the spread', () => {
  const pool = createPool(16, createProjectile);
  const weapon = { ...WEAPONS.starter, count: 3, spread: 1 };
  fireWeapon(pool, weapon, 0, 0, 0, 10, createRng(1));
  const active = pool.items.filter((p) => p.active);
  assert.equal(active.length, 3);
  const angles = active.map((p) => Math.atan2(p.vy, p.vx)).sort((a, b) => a - b);
  assert.ok(Math.abs(angles[0] + 0.5) < 1e-9);
  assert.ok(Math.abs(angles[1]) < 1e-9);
  assert.ok(Math.abs(angles[2] - 0.5) < 1e-9);
  for (const p of active) assert.ok(Math.abs(Math.hypot(p.x, p.y) - 10) < 1e-9);
});
