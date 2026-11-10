import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepMovement, constrainToArena, turnToward } from '../js/systems/movement.js';
import { TUNING } from '../js/data/tuning.js';

const P = TUNING.player;
const DT = 1 / 60;
const body = () => ({ x: 0, y: 0, vx: 0, vy: 0 });
const speed = (b) => Math.hypot(b.vx, b.vy);

test('speed converges on the top speed and never exceeds it', () => {
  const b = body();
  for (let i = 0; i < 600; i++) {
    stepMovement(b, 1, 0, P, DT);
    assert.ok(speed(b) <= P.topSpeed + 1e-9, `step ${i}: ${speed(b)}`);
  }
  assert.ok(P.topSpeed - speed(b) < 0.01, `final speed ${speed(b)}`);
});

test('initial acceleration matches the configured value', () => {
  const b = body();
  stepMovement(b, 1, 0, P, 1e-4);
  const accel = b.vx / 1e-4;
  assert.ok(Math.abs(accel - P.accel) / P.accel < 0.01, `accel ${accel}`);
});

test('diagonal movement is not faster than straight movement', () => {
  const straight = body();
  const diagonal = body();
  for (let i = 0; i < 600; i++) {
    stepMovement(straight, 1, 0, P, DT);
    stepMovement(diagonal, 1, 1, P, DT);
  }
  assert.ok(Math.abs(speed(diagonal) - speed(straight)) < 1e-6);
});

test('releasing the keys glides to a stop', () => {
  const b = { x: 0, y: 0, vx: P.topSpeed, vy: 0 };
  let distance = 0;
  for (let i = 0; i < 600; i++) {
    const before = b.x;
    stepMovement(b, 0, 0, P, DT);
    distance += b.x - before;
  }
  assert.ok(speed(b) < 0.1);
  assert.ok(distance > 20, `glide distance ${distance}`);
});

test('the arena keeps a body inside and removes outward speed', () => {
  const b = { x: 2000, y: 0, vx: 100, vy: 30 };
  constrainToArena(b, 20, 1000, 0);
  assert.ok(Math.abs(Math.hypot(b.x, b.y) - 980) < 1e-9);
  assert.ok(Math.abs(b.vx) < 1e-9);
  assert.equal(b.vy, 30);
});

test('turnToward takes the short way round and stops at the target', () => {
  assert.ok(turnToward(3.0, -3.0, 0.1) > 3.0);
  assert.equal(turnToward(0, 0.05, 0.1), 0.05);
});
