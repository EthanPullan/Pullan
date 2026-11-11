import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEvolution } from '../js/systems/evolution.js';
import { CLASSES, CLASS_LIST, START_CLASS } from '../js/data/classes.js';
import { TUNING } from '../js/data/tuning.js';

const rules = TUNING.evolution;

// Evolution thresholds, read from the data so rebalancing doesn't break tests.
const T2 = TUNING.evolution.thresholds[2];
const T3 = TUNING.evolution.thresholds[3];
const D2 = T2 * TUNING.evolution.devolveFraction; // devolve below these
const D3 = T3 * TUNING.evolution.devolveFraction;
const evaluate = (classId, bubbles, path = {}) =>
  evaluateEvolution(classId, bubbles, path, CLASSES, CLASS_LIST, rules);

// Applies evaluations until nothing changes, taking `picks[tier]` whenever
// a choice is needed. Returns the class and how many changes happened.
function settle(classId, bubbles, path, picks = {}) {
  let changes = 0;
  for (;;) {
    const r = evaluate(classId, bubbles, path);
    if (!r) return { classId, changes };
    if (r.type === 'choose') {
      const tier = CLASSES[classId].tier + 1;
      assert.ok(picks[tier], `a choice was needed at tier ${tier}`);
      path[tier] = picks[tier];
      classId = picks[tier];
    } else {
      classId = r.classId;
    }
    changes++;
  }
}

test('thresholds rise with each tier, and devolving is at 80%', () => {
  assert.equal(rules.thresholds[1], 0);
  assert.ok(T2 > 0 && T3 > T2);
  assert.equal(rules.devolveFraction, 0.8);
});

test('reaching tier 2 offers the three tier-2 classes', () => {
  assert.equal(evaluate(START_CLASS, T2 - 1), null);
  assert.deepEqual(evaluate(START_CLASS, T2), { type: 'choose', options: ['skitter', 'barnacle', 'brood'] });
});

test('reaching tier 3 offers that branch\'s two classes', () => {
  assert.equal(evaluate('barnacle', T3 - 1), null);
  assert.deepEqual(evaluate('barnacle', T3), { type: 'choose', options: ['depthcharge', 'harpoon'] });
});

test('final forms never evolve further', () => {
  assert.equal(evaluate('halo', 10000), null);
});

test('devolving happens below 80% of the tier threshold, not at it', () => {
  assert.equal(evaluate('skitter', D2), null);
  assert.deepEqual(evaluate('skitter', D2 - 1), { type: 'devolve', classId: 'mote' });
  assert.equal(evaluate('needlejet', D3), null);
  assert.deepEqual(evaluate('needlejet', D3 - 1), { type: 'devolve', classId: 'skitter' });
});

test('the starter class never devolves', () => {
  assert.equal(evaluate(START_CLASS, 0), null);
});

test('a big loss devolves through every tier it falls below', () => {
  assert.deepEqual(settle('shoal', 5, { 2: 'brood', 3: 'shoal' }), { classId: 'mote', changes: 2 });
});

test('a big gain can cross two tiers, asking at each', () => {
  const path = {};
  const result = settle(START_CLASS, T3 + 10, path, { 2: 'brood', 3: 'halo' });
  assert.equal(result.classId, 'halo');
  assert.deepEqual(path, { 2: 'brood', 3: 'halo' });
});

test('re-evolving after a devolution restores the earlier choice without asking', () => {
  const path = { 2: 'barnacle' };
  assert.deepEqual(evaluate(START_CLASS, T2, path), { type: 'evolve', classId: 'barnacle' });
  const path3 = { 2: 'skitter', 3: 'spindrift' };
  assert.deepEqual(evaluate('skitter', T3, path3), { type: 'evolve', classId: 'spindrift' });
});

test('a total oscillating around a threshold changes class only once', () => {
  const path = { 2: 'skitter' };
  let classId = START_CLASS;
  let changes = 0;
  for (const bubbles of [T2 - 1, T2, T2 + 1, T2 - 1, T2, T2 - 2, D2 + 1, D2, D2 + 1, T2 - 1, T2, D2, T2 + 1, D2]) {
    const r = evaluate(classId, bubbles, path);
    if (r) {
      classId = r.classId;
      changes++;
    }
  }
  assert.equal(changes, 1);
  assert.equal(classId, 'skitter');
});

test('the HUD progress bar runs to the next form, marking the devolve point', async () => {
  const { progressScale } = await import('../js/systems/evolution.js');
  assert.deepEqual(progressScale(CLASSES.mote, T2 / 2, rules), { max: T2, next: T2, fill: 0.5, devolveMark: null });
  const t2 = progressScale(CLASSES.skitter, T3 / 2, rules);
  assert.equal(t2.max, T3);
  assert.equal(t2.fill, 0.5);
  assert.ok(Math.abs(t2.devolveMark - D2 / T3) < 1e-9);
  const t3 = progressScale(CLASSES.halo, T3 * 2, rules);
  assert.equal(t3.next, null);
  assert.equal(t3.fill, 1);
  assert.ok(Math.abs(t3.devolveMark - D3 / (T3 * 1.5)) < 1e-9);
});
