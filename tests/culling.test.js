import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onScreen } from '../js/render/scene.js';

const view = { w: 1280, h: 720 };
const cam = { x: 100, y: -50 };

test('things in view, or overlapping its edge, are drawn', () => {
  assert.ok(onScreen(100, -50, 10, cam, view));
  assert.ok(onScreen(100 + 640 + 30, -50, 10, cam, view), 'just past the right edge, inside the margin');
  assert.ok(onScreen(100, -50 - 360 - 60, 40, cam, view), 'a big body poking in from above');
});

test('things well off screen are skipped', () => {
  assert.ok(!onScreen(100 + 640 + 200, -50, 10, cam, view));
  assert.ok(!onScreen(100, -50 + 360 + 200, 10, cam, view));
});
