// Enemies, bosses and abilities, run through the real game update.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, debugSpawn, hurtPlayer } from '../js/game.js';
import { createRng } from '../js/rng.js';
import { ENEMIES, BOSSES, ROSTERS } from '../js/data/enemies.js';
import { TUNING } from '../js/data/tuning.js';

const DT = 1 / 60;
const idle = { moveX: 0, moveY: 0, aimX: 0, aimY: -1000, fire: false, ability: false };

function setup() {
  const game = createGame(createRng(2));
  game.enemies.length = 0;
  Object.assign(game.player, { x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, invuln: 1e9, aim: -Math.PI / 2 });
  return game;
}

function run(game, seconds, controls = idle) {
  for (let i = 0; i < seconds / DT; i++) updateGame(game, controls, DT);
}

const alive = (game, id) => game.enemies.filter((e) => e.alive && e.def.id === id);

function kill(game, e) {
  // Lethal damage through the normal path: a shot the size of its health.
  game.playerShotEvents.onHit(e, { damage: e.health + 1, vx: 1, vy: 0, knockback: 0 });
}

test('there are two bosses, in outer-ring corner arenas', () => {
  assert.equal(BOSSES.length, 2);
  for (const b of BOSSES) assert.ok([0, 6].includes(b.cell.col) && [0, 6].includes(b.cell.row), b.id);
  for (const b of BOSSES) assert.equal(b.phases.length, 2, b.id);
});

test('every roster enemy and attack refers to things that exist', async () => {
  const { WEAPONS } = await import('../js/data/weapons.js');
  for (const def of Object.values(ENEMIES)) {
    const lists = def.phases ? def.phases.map((p) => p.attacks) : [def.attacks];
    for (const attacks of lists) {
      for (const a of attacks) {
        assert.ok(a.windup > 0, `${def.id} ${a.type} has a wind-up warning`);
        if (a.weapon) assert.ok(WEAPONS[a.weapon], `${def.id} weapon ${a.weapon}`);
        if (a.enemy) assert.ok(ENEMIES[a.enemy], `${def.id} summons ${a.enemy}`);
      }
    }
    if (def.parts) assert.ok(ENEMIES[def.parts.enemy]);
  }
  assert.ok(ROSTERS[3].carrier && ROSTERS[3].minelayer && ROSTERS[2].sniper && ROSTERS[2].charger);
});

test('entering a boss arena brings the boss and its parts, and nothing else', () => {
  const game = setup();
  const boss = BOSSES[0];
  game.transition = { t: 0, cell: boss.cell, entry: { x: 0, y: 800 }, kind: 'cross', swapped: false };
  run(game, TUNING.world.transitionSeconds + DT);
  assert.equal(alive(game, boss.id).length, 1);
  assert.equal(alive(game, boss.parts.enemy).length, boss.parts.count);
  assert.equal(game.enemies.length, 1 + boss.parts.count);
});

test('beating a boss marks it defeated, removes its parts and drops its payout', () => {
  const game = setup();
  debugSpawn(game, 'bloom');
  const boss = alive(game, 'bloom')[0];
  kill(game, boss);
  run(game, DT);
  assert.ok(game.defeated.has('bloom'));
  assert.equal(game.enemies.filter((e) => e.alive).length, 0);
  const payout = ENEMIES.bloom.drops + ENEMIES.bloom.parts.count * ENEMIES.bloomPod.drops;
  assert.equal(game.pickups.activeCount, payout);
  assert.equal(game.victoryPending, false);
});

test('beating both bosses shows the victory screen once, and the game pauses for it', () => {
  const game = setup();
  for (const b of BOSSES) {
    debugSpawn(game, b.id);
    kill(game, alive(game, b.id)[0]);
  }
  assert.equal(game.victoryPending, true);
  const t = game.time;
  run(game, 1);
  assert.equal(game.time, t);
});

test('a boss switches phase at half health', () => {
  const game = setup();
  debugSpawn(game, 'warden', 600);
  const boss = alive(game, 'warden')[0];
  run(game, 0.1);
  assert.equal(boss.phase, 0);
  boss.health = ENEMIES.warden.health * 0.5;
  run(game, DT);
  assert.equal(boss.phase, 1);
});

test('a carrier never keeps more than its cap of swarmlings, and they drop nothing', () => {
  const game = setup();
  debugSpawn(game, 'carrier', 300);
  run(game, 40);
  const cap = ENEMIES.carrier.attacks[0].cap;
  const children = alive(game, 'swarmling');
  assert.equal(children.length, cap);
  kill(game, children[0]);
  assert.equal(game.pickups.activeCount, 0);
});

test('an armed mine near the player winds up, then blasts and is gone', () => {
  const game = setup();
  game.player.invuln = 0;
  game.player.bubbles = 10;
  debugSpawn(game, 'mine', 40);
  game.player.aim = Math.PI / 2;
  debugSpawn(game, 'drifter', 700); // an enemy left, so spilled bubbles aren't pulled back
  run(game, ENEMIES.mine.armSeconds + 0.2);
  assert.equal(game.player.bubbles, 10, 'the blast waits for its wind-up');
  run(game, 1);
  assert.equal(alive(game, 'mine').length, 0);
  assert.equal(game.player.bubbles, 10 - ENEMIES.mine.attacks[0].damage);
});

test('a charger hurts only while dashing', () => {
  const game = setup();
  game.player.invuln = 0;
  game.player.bubbles = 15; // below 20, so no evolution choice pauses the game
  debugSpawn(game, 'charger', 300);
  const c = alive(game, 'charger')[0];
  const before = game.player.bubbles;
  let sawDash = false;
  for (let i = 0; i < 6 / DT && game.player.bubbles === before; i++) {
    updateGame(game, idle, DT);
    if (c.dash > 0) sawDash = true;
  }
  assert.ok(sawDash, 'the charger dashed');
  assert.equal(before - game.player.bubbles, ENEMIES.charger.attacks[0].damage);
});

test('a shockwave hurts and pushes enemies in range only', () => {
  const game = setup();
  game.path = { 2: 'barnacle', 3: 'depthcharge' };
  game.player.bubbles = 60;
  run(game, 0.1);
  assert.equal(game.player.classId, 'depthcharge');
  debugSpawn(game, 'charger', 120);
  debugSpawn(game, 'charger', 600);
  const [near, far] = alive(game, 'charger');
  run(game, DT, { ...idle, ability: true });
  assert.equal(near.health, ENEMIES.charger.health - 4);
  assert.equal(far.health, ENEMIES.charger.health);
});

test('the shield makes the player immune for its duration', () => {
  const game = setup();
  game.path = { 2: 'brood', 3: 'halo' };
  game.player.bubbles = 60;
  run(game, 1.1); // evolve and let the morph immunity pass
  game.player.invuln = 0;
  run(game, DT, { ...idle, ability: true });
  hurtPlayer(game, 5);
  assert.equal(game.player.bubbles, 60);
  run(game, 2.6);
  hurtPlayer(game, 5);
  assert.equal(game.player.bubbles, 55);
});

test('Burst fires a full ring of 16 shots', () => {
  const game = setup();
  game.path = { 2: 'skitter', 3: 'spindrift' };
  game.player.bubbles = 60;
  run(game, 0.1);
  assert.equal(game.player.classId, 'spindrift');
  const before = game.playerShots.activeCount;
  run(game, DT, { ...idle, ability: true });
  assert.equal(game.playerShots.activeCount - before, 16);
});

test('Dash throws the player forward and makes them briefly immune', () => {
  const game = setup();
  game.path = { 2: 'skitter', 3: 'needlejet' };
  game.player.bubbles = 60;
  run(game, 1.1);
  game.player.invuln = 0;
  run(game, DT, { ...idle, moveX: 1, ability: true });
  assert.ok(game.player.vx > 600, `vx ${game.player.vx}`);
  assert.ok(game.player.invuln > 0.3);
});
