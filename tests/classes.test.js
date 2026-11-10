import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_LIST, CLASSES, START_CLASS, classRadius } from '../js/data/classes.js';

test('there are 10 classes with unique ids and names', () => {
  assert.equal(CLASS_LIST.length, 10);
  assert.equal(new Set(CLASS_LIST.map((c) => c.id)).size, 10);
  assert.equal(new Set(CLASS_LIST.map((c) => c.name)).size, 10);
});

test('the tree is 1 starter, 3 tier-2 classes, 2 tier-3 classes under each', () => {
  const start = CLASSES[START_CLASS];
  assert.equal(start.tier, 1);
  assert.equal(start.parent, null);

  const tier2 = CLASS_LIST.filter((c) => c.tier === 2);
  assert.equal(tier2.length, 3);
  for (const t2 of tier2) {
    assert.equal(t2.parent, START_CLASS);
    const children = CLASS_LIST.filter((c) => c.parent === t2.id);
    assert.equal(children.length, 2, `${t2.id} should have 2 children`);
    for (const child of children) {
      assert.equal(child.tier, 3);
      assert.equal(child.branch, t2.branch);
    }
  }
});

test('every class has a hull and guns made of valid circles', () => {
  for (const cls of CLASS_LIST) {
    for (const part of [...cls.hull, ...cls.guns]) {
      assert.ok(Number.isFinite(part.x) && Number.isFinite(part.y), cls.id);
      assert.ok(part.r > 0, cls.id);
    }
    assert.ok(classRadius(cls) > 0);
  }
});

test('every class has stats and a weapon that exists', async () => {
  const { WEAPONS } = await import('../js/data/weapons.js');
  for (const cls of CLASS_LIST) {
    assert.ok(WEAPONS[cls.weapon], `${cls.id} weapon ${cls.weapon}`);
    for (const key of ['topSpeed', 'accel', 'pickupRadius']) {
      assert.ok(cls.stats[key] > 0, `${cls.id} ${key}`);
    }
  }
});

test('every tier has an evolution threshold', async () => {
  const { TUNING } = await import('../js/data/tuning.js');
  for (const cls of CLASS_LIST) assert.ok(TUNING.evolution.thresholds[cls.tier] !== undefined, cls.id);
});
