import { test } from 'node:test';
import assert from 'node:assert/strict';
import { separation, seek, keepDistance, steerVelocity, containment } from '../js/systems/steering.js';

const DT = 1 / 60;

test('separation pushes overlapping enemies apart', () => {
  const a = { x: 0, y: 0, vx: 0, vy: 0, radius: 15, alive: true };
  const b = { x: 5, y: 0, vx: 0, vy: 0, radius: 15, alive: true };
  const all = [a, b];
  for (let i = 0; i < 180; i++) {
    for (const e of all) {
      const push = separation(e, all, 14);
      steerVelocity(e, push.x * 150, push.y * 150, 3, DT);
    }
    for (const e of all) {
      e.x += e.vx * DT;
      e.y += e.vy * DT;
    }
  }
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 30, `distance ${Math.hypot(a.x - b.x, a.y - b.y)}`);
});

test('separation ignores dead neighbours and itself', () => {
  const a = { x: 0, y: 0, radius: 15, alive: true };
  const dead = { x: 1, y: 0, radius: 15, alive: false };
  assert.deepEqual(separation(a, [a, dead], 14), { x: 0, y: 0 });
});

test('seek points at the target at full speed', () => {
  const v = seek({ x: 0, y: 0 }, 30, 40, 100);
  assert.ok(Math.abs(v.x - 60) < 1e-9 && Math.abs(v.y - 80) < 1e-9);
});

test('keepDistance approaches when far, backs off when close', () => {
  const far = keepDistance({ x: 0, y: 0 }, 1000, 0, 350, 100, 1);
  const near = keepDistance({ x: 0, y: 0 }, 100, 0, 350, 100, 1);
  assert.ok(far.x > 0);
  assert.ok(near.x < 0);
});

test('containment pulls inward only near the edge', () => {
  assert.deepEqual(containment({ x: 0, y: 0 }, 1000, 120), { x: 0, y: 0 });
  assert.ok(containment({ x: 950, y: 0 }, 1000, 120).x < 0);
});
