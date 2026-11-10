// Arena movement rules, run through the real game update.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, hurtPlayer } from '../js/game.js';
import { createRng } from '../js/rng.js';
import { TUNING } from '../js/data/tuning.js';

const DT = 1 / 60;

// A game with no enemies, an immune player, standing at (x, y) in `cell`.
function setup(cell, x, y) {
  const game = createGame(createRng(1));
  game.cell = { ...cell };
  game.enemies.length = 0;
  Object.assign(game.player, { x, y, prevX: x, prevY: y, vx: 0, vy: 0, invuln: 1e9 });
  return game;
}

function hold(game, moveX, moveY, seconds) {
  const controls = { moveX, moveY, aimX: 0, aimY: 0, fire: false };
  for (let i = 0; i < seconds / DT; i++) updateGame(game, controls, DT);
}

test('pushing east through the centre arena\'s membrane enters the arena to the east', () => {
  const game = setup({ col: 3, row: 3 }, 800, 100);
  hold(game, 1, 0, 2);
  assert.deepEqual(game.cell, { col: 4, row: 3 });
  assert.ok(game.player.x < 0, 'appears on the west edge');
  assert.deepEqual(game.history, [{ col: 3, row: 3 }]);
  assert.ok(game.enemies.length > 0, 'the new arena is populated');
});

test('an outer membrane is solid: pushing into it keeps you in the arena', () => {
  const game = setup({ col: 6, row: 3 }, 800, 0);
  hold(game, 1, 0, 3);
  assert.deepEqual(game.cell, { col: 6, row: 3 });
  assert.equal(game.transition, null);
  assert.ok(Math.hypot(game.player.x, game.player.y) <= TUNING.arena.radius - game.player.radius + 1e-6);
});

test('sliding along a membrane toward another quarter does not cross through the first', () => {
  // Hold W against the west membrane: slide up into the north quarter and
  // cross north, never west.
  const game = setup({ col: 6, row: 3 }, -880, 0);
  hold(game, 0, -1, 6);
  assert.deepEqual(game.history, [{ col: 6, row: 3 }]);
  assert.deepEqual(game.cell, { col: 6, row: 2 });
});

test('drifting into a membrane without pushing toward it bounces instead of crossing', () => {
  const game = setup({ col: 3, row: 3 }, 900, 0);
  game.player.vx = 200;
  hold(game, 0, 0, 1);
  assert.deepEqual(game.cell, { col: 3, row: 3 });
});

test('a hit at 0 bubbles ejects you to the arena you came from, at its centre', () => {
  const game = setup({ col: 3, row: 3 }, 800, 0);
  hold(game, 1, 0, 2);
  assert.deepEqual(game.cell, { col: 4, row: 3 });
  game.player.invuln = 0;
  game.player.bubbles = 1;
  hurtPlayer(game, 2);
  hold(game, 0, 0, TUNING.world.transitionSeconds + DT);
  assert.deepEqual(game.cell, { col: 3, row: 3 });
  assert.deepEqual([game.player.x, game.player.y], [0, 0]);
  assert.ok(game.player.invuln > TUNING.world.ejectInvulnSeconds - 0.1);
  assert.deepEqual(game.history, []);
});

test('a hit that leaves bubbles over 0 does not eject', () => {
  const game = setup({ col: 3, row: 3 }, 0, 0);
  game.player.invuln = 0;
  game.player.bubbles = 5;
  hurtPlayer(game, 2);
  assert.equal(game.transition, null);
});

test('crossing clears shots and pickups from the old arena', () => {
  const game = setup({ col: 3, row: 3 }, 800, 0);
  game.pickups.spawn();
  game.playerShots.spawn();
  hold(game, 1, 0, 2);
  assert.equal(game.pickups.activeCount, 0);
  assert.equal(game.playerShots.activeCount, 0);
});

test('a cleared arena stays clear while you stay, and refills when you come back', () => {
  const game = setup({ col: 3, row: 3 }, 0, 0);
  hold(game, 1, 0, 0.5); // a moment in the centre arena, then cross east
  game.player.x = 800;
  hold(game, 1, 0, 2);
  assert.deepEqual(game.cell, { col: 4, row: 3 });
  const full = game.enemies.length;
  assert.ok(full > 0);
  for (const e of game.enemies) e.alive = false;
  hold(game, 0, 0, 30);
  assert.equal(game.enemies.length, 0, 'nothing respawned in 30 s');
  game.player.x = -800;
  hold(game, -1, 0, 2); // back west, then east again
  game.player.x = 800;
  hold(game, 1, 0, 2);
  assert.deepEqual(game.cell, { col: 4, row: 3 });
  assert.equal(game.enemies.length, full);
});

test('dropped bubbles stay in the arena until collected', () => {
  const game = setup({ col: 3, row: 3 }, 0, 0);
  game.pickups.spawn();
  Object.assign(game.pickups.items.find((p) => p.active), { x: 500, y: 0, delay: 0, age: 0 });
  hold(game, 0, 0, 60);
  assert.equal(game.pickups.activeCount, 1);
});
