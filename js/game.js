// World state and the fixed-step update. Drawing lives in render/scene.js
// and browser wiring in main.js.

import { TUNING, PALETTE } from './data/tuning.js';
import { CLASSES, START_CLASS } from './data/classes.js';
import { WEAPONS } from './data/weapons.js';
import { ENEMIES, ARENA_POPULATION } from './data/enemies.js';
import { createPlayer, updatePlayer, applyRecoil } from './entities/player.js';
import { createEnemy, updateEnemy, damageEnemy } from './entities/enemy.js';
import { createPool } from './systems/pool.js';
import { updateTrigger, fireWeapon } from './systems/weapons.js';
import { createProjectile, updateProjectiles } from './systems/projectiles.js';
import { circlesOverlap, pushApart } from './systems/collision.js';
import { takeDamage } from './systems/economy.js';
import { createPickup, spawnBurst, updatePickups } from './systems/pickups.js';
import { createSpawner, updateSpawner, spawnPoint } from './systems/spawning.js';
import { createPop, spawnPop, updatePops } from './render/effects.js';

const combat = TUNING.combat;
const pickupSettings = TUNING.pickups;

export function createGame(rng) {
  const player = createPlayer(CLASSES[START_CLASS]);
  const game = {
    rng,
    time: 0,
    player,
    playerTargets: [player], // what enemy shots can hit
    enemies: [],
    playerShots: createPool(combat.projectilePoolSize, createProjectile),
    enemyShots: createPool(combat.enemyShotPoolSize, createProjectile),
    pickups: createPool(pickupSettings.poolSize, createPickup),
    pops: createPool(combat.popPoolSize, createPop),
    spawner: createSpawner(ARENA_POPULATION),
  };

  // Event handlers are made once here, so the update loop allocates none.
  game.spawnEnemy = (id) => {
    const at = spawnPoint(player, TUNING.arena.radius, TUNING.spawning.edgeMargin,
      TUNING.spawning.minDistanceFromPlayer, rng);
    game.enemies.push(createEnemy(ENEMIES[id], at.x, at.y, rng));
  };
  game.onPlayerShotHit = (enemy, shot) => {
    knockBack(enemy, shot);
    if (damageEnemy(enemy, shot.damage, combat.hitFlashSeconds)) killEnemy(game, enemy);
  };
  game.onPlayerShotPop = (x, y, r) => spawnPop(game.pops, x, y, r, combat.shotPopSeconds, PALETTE.player);
  game.onEnemyShotHit = (target, shot) => hurtPlayer(game, shot.damage);
  game.onEnemyShotPop = (x, y, r) => spawnPop(game.pops, x, y, r, combat.shotPopSeconds, PALETTE.danger);
  game.onCollect = (value) => {
    player.bubbles += value;
  };

  updateSpawner(game.spawner, game.enemies, game.spawnEnemy, TUNING.spawning.respawnSeconds, 0, true);
  return game;
}

function knockBack(target, shot) {
  const speed = Math.hypot(shot.vx, shot.vy) || 1;
  target.vx += (shot.vx / speed) * shot.knockback;
  target.vy += (shot.vy / speed) * shot.knockback;
}

function killEnemy(game, enemy) {
  spawnBurst(game.pickups, enemy.x, enemy.y, enemy.def.drops,
    pickupSettings.dropSpeedMin, pickupSettings.dropSpeedMax, 0, game.rng);
  spawnPop(game.pops, enemy.x, enemy.y, enemy.radius * combat.deathPopScale,
    combat.deathPopSeconds, PALETTE.enemy);
}

export function hurtPlayer(game, damage) {
  const { player } = game;
  if (player.invuln > 0) return;
  const { lost, spilled } = takeDamage(player.bubbles, damage);
  player.bubbles -= lost;
  spawnBurst(game.pickups, player.x, player.y, spilled,
    pickupSettings.spillSpeedMin, pickupSettings.spillSpeedMax, pickupSettings.spillCollectDelay, game.rng);
  player.invuln = TUNING.player.invulnSeconds;
  player.blink = TUNING.player.invulnSeconds;
  spawnPop(game.pops, player.x, player.y, player.radius * 1.2, combat.deathPopSeconds, PALETTE.danger);
}

// Touching enemies are pushed out of the player. Harmful ones deal their
// contact damage and are thrown back so they don't sit on top of you.
function resolveContacts(game) {
  const { player } = game;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    if (!circlesOverlap(player.x, player.y, player.radius, e.x, e.y, e.radius)) continue;
    const n = pushApart(player, e);
    if (!n || e.def.contactDamage <= 0) continue;
    e.vx = n.x * combat.contactKnockback;
    e.vy = n.y * combat.contactKnockback;
    e.stun = combat.contactStunSeconds;
    hurtPlayer(game, e.def.contactDamage);
  }
}

function removeDead(enemies) {
  let kept = 0;
  for (const e of enemies) if (e.alive) enemies[kept++] = e;
  enemies.length = kept;
}

// `controls`: moveX, moveY (-1..1), aimX, aimY (world units), fire (bool).
export function updateGame(game, controls, dt) {
  const { player } = game;
  const arenaRadius = TUNING.arena.radius;
  game.time += dt;

  updatePlayer(player, controls.moveX, controls.moveY, controls.aimX, controls.aimY, TUNING, dt);
  const weapon = WEAPONS.starter;
  const shots = updateTrigger(player.trigger, controls.fire, weapon, dt);
  for (let i = 0; i < shots; i++) {
    fireWeapon(game.playerShots, weapon, player.x, player.y, player.aim, player.muzzle, game.rng);
    applyRecoil(player, weapon.recoil);
  }

  for (const e of game.enemies) updateEnemy(e, game, dt);
  resolveContacts(game);

  updateProjectiles(game.playerShots, game.enemies, arenaRadius, game.onPlayerShotHit, game.onPlayerShotPop, dt);
  updateProjectiles(game.enemyShots, game.playerTargets, arenaRadius, game.onEnemyShotHit, game.onEnemyShotPop, dt);
  removeDead(game.enemies);

  updatePickups(game.pickups, player, TUNING.player.pickupRadius, pickupSettings, arenaRadius, game.onCollect, dt);
  updateSpawner(game.spawner, game.enemies, game.spawnEnemy, TUNING.spawning.respawnSeconds, dt);
  updatePops(game.pops, dt);
}
