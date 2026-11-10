import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFixedStep } from '../js/loop.js';

const STEP = 1 / 60;

test('one second of 60 Hz frames runs exactly 60 steps', () => {
  const stepper = createFixedStep(STEP, 0.25);
  let steps = 0;
  for (let i = 0; i < 60; i++) steps += stepper.advance(1 / 60).steps;
  assert.equal(steps, 60);
});

test('one second of 144 Hz frames runs 60 steps', () => {
  const stepper = createFixedStep(STEP, 0.25);
  let steps = 0;
  for (let i = 0; i < 144; i++) steps += stepper.advance(1 / 144).steps;
  assert.equal(steps, 60);
});

test('a long frame is clamped to 250 ms', () => {
  const stepper = createFixedStep(STEP, 0.25);
  assert.equal(stepper.advance(5).steps, 15);
});

test('alpha stays between 0 and 1', () => {
  const stepper = createFixedStep(STEP, 0.25);
  for (let i = 0; i < 500; i++) {
    const { alpha } = stepper.advance(Math.random() * 0.05);
    assert.ok(alpha >= 0 && alpha < 1, `alpha ${alpha}`);
  }
});

test('negative elapsed time runs no steps', () => {
  const stepper = createFixedStep(STEP, 0.25);
  assert.equal(stepper.advance(-1).steps, 0);
});
