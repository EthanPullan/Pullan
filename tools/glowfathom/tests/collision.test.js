import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circlesOverlap } from '../js/systems/collision.js';

test('overlapping circles are detected', () => {
  assert.equal(circlesOverlap(0, 0, 10, 15, 0, 10), true);
  assert.equal(circlesOverlap(0, 0, 10, 0, 0, 1), true);
});

test('separate circles are not', () => {
  assert.equal(circlesOverlap(0, 0, 10, 25, 0, 10), false);
  assert.equal(circlesOverlap(0, 0, 10, 15, 15, 10), false);
});

test('circles that only touch do not overlap', () => {
  assert.equal(circlesOverlap(0, 0, 10, 20, 0, 10), false);
});
