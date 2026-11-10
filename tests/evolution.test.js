import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEvolution } from '../js/systems/evolution.js';
import { CLASSES, CLASS_LIST, START_CLASS } from '../js/data/classes.js';
import { TUNING } from '../js/data/tuning.js';

const rules = TUNING.evolution;
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

test('the thresholds are 20 and 60, devolving at 80%', () => {
  assert.equal(rules.thresholds[2], 20);
  assert.equal(rules.thresholds[3], 60);
  assert.equal(rules.devolveFraction, 0.8);
});

test('reaching tier 2 offers the three tier-2 classes', () => {
  assert.equal(evaluate(START_CLASS, 19), null);
  assert.deepEqual(evaluate(START_CLASS, 20), { type: 'choose', options: ['skitter', 'barnacle', 'brood'] });
});

test('reaching tier 3 offers that branch\'s two classes', () => {
  assert.equal(evaluate('barnacle', 59), null);
  assert.deepEqual(evaluate('barnacle', 60), { type: 'choose', options: ['depthcharge', 'harpoon'] });
});

test('final forms never evolve further', () => {
  assert.equal(evaluate('halo', 10000), null);
});

test('devolving happens below 80% of the tier threshold, not at it', () => {
  assert.equal(evaluate('skitter', 16), null);
  assert.deepEqual(evaluate('skitter', 15), { type: 'devolve', classId: 'mote' });
  assert.equal(evaluate('needlejet', 48), null);
  assert.deepEqual(evaluate('needlejet', 47), { type: 'devolve', classId: 'skitter' });
});

test('the starter class never devolves', () => {
  assert.equal(evaluate(START_CLASS, 0), null);
});

test('a big loss devolves through every tier it falls below', () => {
  assert.deepEqual(settle('shoal', 5, { 2: 'brood', 3: 'shoal' }), { classId: 'mote', changes: 2 });
});

test('a big gain can cross two tiers, asking at each', () => {
  const path = {};
  const result = settle(START_CLASS, 70, path, { 2: 'brood', 3: 'halo' });
  assert.equal(result.classId, 'halo');
  assert.deepEqual(path, { 2: 'brood', 3: 'halo' });
});

test('re-evolving after a devolution restores the earlier choice without asking', () => {
  const path = { 2: 'barnacle' };
  assert.deepEqual(evaluate(START_CLASS, 20, path), { type: 'evolve', classId: 'barnacle' });
  const path3 = { 2: 'skitter', 3: 'spindrift' };
  assert.deepEqual(evaluate('skitter', 60, path3), { type: 'evolve', classId: 'spindrift' });
});

test('a total oscillating around a threshold changes class only once', () => {
  const path = { 2: 'skitter' };
  let classId = START_CLASS;
  let changes = 0;
  for (const bubbles of [19, 20, 21, 19, 20, 18, 17, 16, 17, 19, 20, 16, 21, 16]) {
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
  assert.deepEqual(progressScale(CLASSES.mote, 10, rules), { max: 20, next: 20, fill: 0.5, devolveMark: null });
  const t2 = progressScale(CLASSES.skitter, 30, rules);
  assert.equal(t2.max, 60);
  assert.equal(t2.fill, 0.5);
  assert.ok(Math.abs(t2.devolveMark - 16 / 60) < 1e-9);
  const t3 = progressScale(CLASSES.halo, 200, rules);
  assert.equal(t3.next, null);
  assert.equal(t3.fill, 1);
  assert.ok(Math.abs(t3.devolveMark - 48 / 90) < 1e-9);
});
