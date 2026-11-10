import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../js/systems/pool.js';
import { createProjectile, updateProjectiles } from '../js/systems/projectiles.js';
import { fireWeapon } from '../js/systems/weapons.js';
import { createRng } from '../js/rng.js';
import { WEAPONS } from '../js/data/weapons.js';

const DT = 1 / 60;
const target = (x, y, r = 15) => ({ x, y, radius: r, alive: true });

function run(weapon, targets, seconds, angle = 0) {
  const pool = createPool(16, createProjectile);
  fireWeapon(pool, weapon, 0, 0, angle, 0, createRng(1));
  const hits = [];
  let explosions = 0;
  const events = {
    onHit: (t) => hits.push(t),
    onPop: () => {},
    onExplode: () => { explosions++; },
  };
  for (let i = 0; i < seconds / DT; i++) updateProjectiles(pool, targets, 5000, events, DT);
  return { hits, explosions, pool };
}

test('a plain shot hits the first target and stops', () => {
  const a = target(100, 0);
  const b = target(200, 0);
  const { hits } = run(WEAPONS.starter, [a, b], 1);
  assert.deepEqual(hits, [a]);
});

test('a piercing shot passes through up to `pierce` extra targets, once each', () => {
  const line = [1, 2, 3, 4, 5, 6, 7].map((i) => target(i * 80, 0));
  const { hits } = run(WEAPONS.harpoon, line, 1.1);
  assert.equal(hits.length, WEAPONS.harpoon.pierce + 1);
  assert.equal(new Set(hits).size, hits.length);
});

test('an exploding shot reports an explosion on impact', () => {
  const { hits, explosions } = run(WEAPONS.shell, [target(100, 0)], 1);
  assert.equal(hits.length, 1);
  assert.equal(explosions, 1);
});

test('a homing shot curves onto a target off to the side', () => {
  const side = target(250, 150);
  const { hits } = run({ ...WEAPONS.seeker, spread: 0 }, [side], 2.4);
  assert.deepEqual(hits, [side]);
  const plain = run({ ...WEAPONS.starter, spread: 0 }, [target(250, 150)], 1.2);
  assert.equal(plain.hits.length, 0);
});

test('homing ignores targets beyond its range', () => {
  const far = target(0, WEAPONS.seeker.homingRange + 200);
  const { hits } = run({ ...WEAPONS.seeker, spread: 0 }, [far], 2.4);
  assert.equal(hits.length, 0);
});

test('a reused projectile does not keep the last weapon’s special fields', () => {
  const pool = createPool(1, createProjectile);
  fireWeapon(pool, WEAPONS.harpoon, 0, 0, 0, 0, createRng(1));
  pool.release(pool.items[0]);
  fireWeapon(pool, WEAPONS.starter, 0, 0, 0, 0, createRng(1));
  const p = pool.items[0];
  assert.equal(p.pierce, 0);
  assert.equal(p.turnRate, 0);
  assert.equal(p.explodeRadius, 0);
});

test('parallel barrels fire side by side, `width` apart', () => {
  const pool = createPool(4, createProjectile);
  fireWeapon(pool, { ...WEAPONS.twin, spread: 0 }, 0, 0, 0, 10, createRng(1));
  const [a, b] = pool.items.filter((p) => p.active);
  assert.ok(Math.abs(Math.abs(a.y - b.y) - WEAPONS.twin.width) < 1e-9);
  assert.ok(Math.abs(a.x - 10) < 1e-9 && Math.abs(b.x - 10) < 1e-9);
});
