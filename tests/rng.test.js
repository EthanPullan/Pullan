import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, seedFromQuery } from '../js/rng.js';

test('the same seed gives the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test('different seeds give different sequences', () => {
  assert.notEqual(createRng(1).next(), createRng(2).next());
});

test('values fall in [0, 1) and range respects its bounds', () => {
  const rng = createRng(7);
  for (let i = 0; i < 10000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1);
    const r = rng.range(-5, 5);
    assert.ok(r >= -5 && r < 5);
  }
});

test('seed is read from the query string', () => {
  assert.equal(seedFromQuery('?seed=1234'), 1234);
  assert.equal(typeof seedFromQuery('?seed=abc'), 'number');
});
