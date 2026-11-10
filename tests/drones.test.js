import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateDrones } from '../js/systems/drones.js';
import { CLASSES } from '../js/data/classes.js';

const settings = CLASSES.halo.drones;
const makePlayer = () => ({
  x: 0, y: 0, droneAngle: 0,
  drones: Array.from({ length: settings.count }, () => ({ x: 0, y: 0, prevX: 0, prevY: 0, radius: settings.radius, cooldown: 0 })),
});

test('drones orbit at the configured radius, evenly spaced', () => {
  const player = makePlayer();
  updateDrones(player, settings, [], () => {}, 1 / 60);
  for (const d of player.drones) assert.ok(Math.abs(Math.hypot(d.x, d.y) - settings.orbitRadius) < 1e-9);
  const [a, b] = player.drones;
  const gap = Math.abs(Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x));
  assert.ok(Math.abs(gap - (Math.PI * 2) / settings.count) < 1e-9);
});

test('a drone touching an enemy hurts it once per cooldown', () => {
  const player = makePlayer();
  // A big enemy covering the whole orbit, so every drone touches it every step.
  const enemy = { x: 0, y: 0, radius: 200, alive: true };
  let hits = 0;
  const seconds = 2;
  for (let i = 0; i < seconds * 60; i++) updateDrones(player, settings, [enemy], () => { hits++; }, 1 / 60);
  const perDrone = Math.ceil(seconds / settings.hitCooldown);
  assert.ok(Math.abs(hits - perDrone * settings.count) <= settings.count, `hits ${hits}`);
});
