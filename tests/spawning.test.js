import { test } from 'node:test';
import assert from 'node:assert/strict';
import { populate } from '../js/systems/spawning.js';

test('an arena is filled from its roster: singles one by one, packs in one call', () => {
  const calls = [];
  populate({ chaser: 3, swarmling: 10 }, ['swarmling'], (id, n) => calls.push([id, n]));
  assert.deepEqual(calls, [['chaser', 1], ['chaser', 1], ['chaser', 1], ['swarmling', 10]]);
});

test('an empty roster spawns nothing', () => {
  const calls = [];
  populate({}, [], (id, n) => calls.push([id, n]));
  assert.deepEqual(calls, []);
});
