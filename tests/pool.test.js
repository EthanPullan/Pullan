import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../js/systems/pool.js';

test('spawn returns null when full and the pool never grows', () => {
  const pool = createPool(3, () => ({}));
  assert.ok(pool.spawn());
  assert.ok(pool.spawn());
  assert.ok(pool.spawn());
  assert.equal(pool.spawn(), null);
  assert.equal(pool.items.length, 3);
  assert.equal(pool.activeCount, 3);
});

test('released objects are reused', () => {
  const pool = createPool(1, () => ({}));
  const a = pool.spawn();
  pool.release(a);
  assert.equal(pool.activeCount, 0);
  assert.equal(pool.spawn(), a);
});

test('releasing twice does not free a slot twice', () => {
  const pool = createPool(2, () => ({}));
  const a = pool.spawn();
  pool.release(a);
  pool.release(a);
  assert.equal(pool.activeCount, 0);
  pool.spawn();
  pool.spawn();
  assert.equal(pool.spawn(), null);
});
