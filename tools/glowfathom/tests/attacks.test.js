import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAttackState, updateAttacks, windupProgress, phaseFor } from '../js/systems/attacks.js';

const DT = 1 / 60;
const shot = { type: 'shoot', windup: 0.5, interval: 2 };

function run(attacks, seconds, canStart = () => true, delay = 1) {
  const state = createAttackState(delay);
  const events = [];
  for (let i = 1; i <= Math.round(seconds / DT); i++) {
    const ev = updateAttacks(state, attacks, canStart, DT);
    if (ev) events.push({ t: +(i * DT).toFixed(3), kind: ev.kind, type: ev.attack.type });
  }
  return events;
}

test('an attack winds up before it executes', () => {
  const events = run([shot], 1.6);
  assert.deepEqual(events.map((e) => e.kind), ['start', 'execute']);
  assert.ok(Math.abs(events[0].t - 1) < 0.02, `start at ${events[0].t}`);
  assert.ok(Math.abs(events[1].t - events[0].t - shot.windup) < 0.02);
});

test('attacks repeat after their interval', () => {
  const executes = run([shot], 10).filter((e) => e.kind === 'execute');
  // First at 1.5 s, then every windup + interval = 2.5 s.
  assert.equal(executes.length, 4);
  assert.ok(Math.abs(executes[1].t - executes[0].t - 2.5) < 0.05);
});

test('a list of attacks is used in turn', () => {
  const ring = { type: 'ring', windup: 0.2, interval: 1 };
  const types = run([shot, ring], 10).filter((e) => e.kind === 'execute').map((e) => e.type);
  assert.deepEqual(types.slice(0, 4), ['shoot', 'ring', 'shoot', 'ring']);
});

test('an attack waits while it cannot start, then starts at once', () => {
  let allowed = false;
  const state = createAttackState(0);
  for (let i = 0; i < 300; i++) assert.equal(updateAttacks(state, [shot], () => allowed, DT), null);
  allowed = true;
  assert.equal(updateAttacks(state, [shot], () => allowed, DT).kind, 'start');
});

test('wind-up progress runs from 0 to 1', () => {
  const state = createAttackState(0);
  updateAttacks(state, [shot], () => true, DT);
  assert.ok(windupProgress(state) < 0.05);
  for (let i = 0; i < 15; i++) updateAttacks(state, [shot], () => true, DT);
  assert.ok(Math.abs(windupProgress(state) - 0.5) < 0.05);
});

test('boss phase changes at the configured health', () => {
  const phases = [{ attacks: [] }, { below: 0.5, attacks: [] }];
  assert.equal(phaseFor(phases, 1), 0);
  assert.equal(phaseFor(phases, 0.51), 0);
  assert.equal(phaseFor(phases, 0.5), 1);
  assert.equal(phaseFor(phases, 0.1), 1);
  const three = [{}, { below: 0.66 }, { below: 0.33 }];
  assert.deepEqual([1, 0.6, 0.3].map((f) => phaseFor(three, f)), [0, 1, 2]);
});
