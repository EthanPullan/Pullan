import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeDamage } from '../js/systems/economy.js';

test('a hit removes bubbles equal to its damage and spills half, rounded down', () => {
  assert.deepEqual(takeDamage(10, 2), { lost: 2, spilled: 1 });
  assert.deepEqual(takeDamage(10, 3), { lost: 3, spilled: 1 });
  assert.deepEqual(takeDamage(10, 1), { lost: 1, spilled: 0 });
  assert.deepEqual(takeDamage(10, 4), { lost: 4, spilled: 2 });
});

test('a hit never removes more bubbles than the player has', () => {
  assert.deepEqual(takeDamage(1, 5), { lost: 1, spilled: 0 });
  assert.deepEqual(takeDamage(0, 5), { lost: 0, spilled: 0 });
});
