// Sound events, screen shake and hit-pause, through the real game update.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, debugSpawn, hurtPlayer } from '../js/game.js';
import { createRng } from '../js/rng.js';
import { TUNING } from '../js/data/tuning.js';

const T2 = TUNING.evolution.thresholds[2];

const DT = 1 / 60;
const idle = { moveX: 0, moveY: 0, aimX: 0, aimY: -1000, fire: false, ability: false };

function setup() {
  const game = createGame(createRng(4));
  game.enemies.length = 0;
  Object.assign(game.player, { x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, invuln: 1e9, aim: -Math.PI / 2 });
  debugSpawn(game, 'drifter', 900); // keeps the arena from counting as cleared
  game.sounds.length = 0;
  return game;
}

function run(game, seconds, controls = idle) {
  for (let i = 0; i < seconds / DT; i++) updateGame(game, controls, DT);
}

const types = (game) => game.sounds.map((s) => s.type);

test('firing queues a shot sound and a muzzle puff', () => {
  const game = setup();
  run(game, DT, { ...idle, fire: true });
  assert.ok(types(game).includes('shot'));
  assert.ok(game.particles.activeCount >= 3);
});

test('killing an enemy queues a pop and bursts into particles', () => {
  const game = setup();
  debugSpawn(game, 'chaser', 200);
  const chaser = game.enemies.at(-1);
  game.playerShotEvents.onHit(chaser, { damage: 1, vx: 1, vy: 0, knockback: 0 });
  assert.deepEqual(types(game), ['hit']);
  game.playerShotEvents.onHit(chaser, { damage: 99, vx: 1, vy: 0, knockback: 0 });
  assert.ok(types(game).includes('pop'));
  assert.ok(game.particles.activeCount > 6);
});

test('collecting a bubble queues a pickup sound', () => {
  const game = setup();
  Object.assign(game.pickups.spawn(), { x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, delay: 0, age: 0, value: 1 });
  run(game, DT);
  assert.ok(types(game).includes('pickup'));
});

test('evolving and devolving queue their own sounds', () => {
  const game = setup();
  game.path = { 2: 'skitter' };
  game.player.bubbles = T2;
  run(game, DT);
  assert.ok(types(game).includes('evolve'));
  game.sounds.length = 0;
  game.player.bubbles = 5;
  run(game, DT);
  assert.ok(types(game).includes('devolve'));
});

test('a boss winding up an attack sounds a warning', () => {
  const game = setup();
  debugSpawn(game, 'bloom', 500);
  run(game, 4);
  assert.ok(types(game).includes('warning'));
});

test('getting hurt shakes the screen and holds the game still for a moment', () => {
  const game = setup();
  game.player.invuln = 0;
  game.player.bubbles = 10;
  hurtPlayer(game, 2);
  assert.ok(types(game).includes('hurt'));
  assert.ok(game.shake > 0.3);
  const t = game.time;
  run(game, 0.03);
  assert.equal(game.time, t, 'held still during the hit-pause');
  run(game, 0.1);
  assert.ok(game.time > t, 'then carries on');
  run(game, 1);
  assert.equal(game.shake, 0, 'shake fades out');
});

test('moving fast leaves a trail', () => {
  const game = setup();
  run(game, 1, { ...idle, moveX: 1 });
  assert.ok(game.particles.activeCount > 5);
  assert.ok(TUNING.effects.trailInterval > 0);
});
