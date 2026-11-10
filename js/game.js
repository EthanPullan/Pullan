// World state and the fixed-step update. Drawing lives in render/scene.js
// and browser wiring in main.js.

import { TUNING, PALETTE } from './data/tuning.js';
import { CLASSES, CLASS_LIST, START_CLASS } from './data/classes.js';
import { WEAPONS } from './data/weapons.js';
import { ENEMIES, ARENA_POPULATION } from './data/enemies.js';
import { createPlayer, updatePlayer, applyRecoil, setPlayerClass } from './entities/player.js';
import { createEnemy, updateEnemy, damageEnemy } from './entities/enemy.js';
import { createPool } from './systems/pool.js';
import { updateTrigger, fireWeapon } from './systems/weapons.js';
import { createProjectile, updateProjectiles } from './systems/projectiles.js';
import { circlesOverlap, pushApart } from './systems/collision.js';
import { takeDamage } from './systems/economy.js';
import { createPickup, spawnBurst, updatePickups } from './systems/pickups.js';
import { createSpawner, updateSpawner, spawnPoint } from './systems/spawning.js';
import { evaluateEvolution } from './systems/evolution.js';
import { updateDrones } from './systems/drones.js';
import { createPop, spawnPop, updatePops } from './render/effects.js';

const combat = TUNING.combat;
const pickupSettings = TUNING.pickups;

export function createGame(rng) {
  const player = createPlayer(CLASSES[START_CLASS]);
  const game = {
    rng,
    time: 0,
    player,
    playerTargets: [player], // what enemy shots can hit: the player and any drones
    kills: 0,
    path: {}, // class chosen at each tier, restored when re-evolving
    pendingChoice: null, // class ids to choose between; the game pauses until one is picked
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
  game.playerShotEvents = {
    onHit: (enemy, shot) => {
      knockBack(enemy, shot);
      hitEnemy(game, enemy, shot.damage);
    },
    onPop: (x, y, r) => spawnPop(game.pops, x, y, r, combat.shotPopSeconds, PALETTE.player),
    onExplode: (shot) => {
      for (const e of game.enemies) {
        if (e.alive && Math.hypot(e.x - shot.x, e.y - shot.y) < shot.explodeRadius + e.radius) {
          hitEnemy(game, e, shot.explodeDamage);
        }
      }
      spawnPop(game.pops, shot.x, shot.y, shot.explodeRadius * 0.6, combat.deathPopSeconds, PALETTE.pickup);
    },
  };
  game.enemyShotEvents = {
    // Drones absorb enemy shots; only the player takes damage.
    onHit: (target, shot) => {
      if (target === player) hurtPlayer(game, shot.damage);
    },
    onPop: (x, y, r) => spawnPop(game.pops, x, y, r, combat.shotPopSeconds, PALETTE.danger),
  };
  game.onDroneHit = (enemy, damage) => hitEnemy(game, enemy, damage);
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

function hitEnemy(game, enemy, damage) {
  if (damageEnemy(enemy, damage, combat.hitFlashSeconds)) killEnemy(game, enemy);
}

function killEnemy(game, enemy) {
  game.kills++;
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

function changeClass(game, classId) {
  const { player } = game;
  setPlayerClass(player, CLASSES[classId]);
  game.playerTargets = [player, ...player.drones];
  const evo = TUNING.evolution;
  player.morph = evo.morphSeconds;
  player.invuln = Math.max(player.invuln, evo.morphInvulnSeconds);
  spawnPop(game.pops, player.x, player.y, player.radius * 1.8, evo.morphSeconds, PALETTE.player);
}

// Applies the player's pick from `game.pendingChoice` and resumes play.
export function chooseClass(game, classId) {
  if (!game.pendingChoice || !game.pendingChoice.includes(classId)) return;
  game.path[CLASSES[classId].tier] = classId;
  game.pendingChoice = null;
  changeClass(game, classId);
}

function checkEvolution(game) {
  const { player } = game;
  const result = evaluateEvolution(player.classId, player.bubbles, game.path, CLASSES, CLASS_LIST, TUNING.evolution);
  if (!result) return;
  if (result.type === 'choose') game.pendingChoice = result.options;
  else changeClass(game, result.classId);
}

// Debug: add (or with a negative amount, remove) bubbles without spilling.
export function grantBubbles(game, amount) {
  game.player.bubbles = Math.max(0, game.player.bubbles + amount);
}

// `controls`: moveX, moveY (-1..1), aimX, aimY (world units), fire (bool).
// Does nothing while a class choice is pending.
export function updateGame(game, controls, dt) {
  if (game.pendingChoice) return;
  const { player } = game;
  const arenaRadius = TUNING.arena.radius;
  game.time += dt;

  updatePlayer(player, controls.moveX, controls.moveY, controls.aimX, controls.aimY, TUNING, dt);
  const weapon = WEAPONS[player.weapon];
  const shots = updateTrigger(player.trigger, controls.fire, weapon, dt);
  for (let i = 0; i < shots; i++) {
    fireWeapon(game.playerShots, weapon, player.x, player.y, player.aim, player.muzzle, game.rng);
    applyRecoil(player, weapon.recoil);
  }

  for (const e of game.enemies) updateEnemy(e, game, dt);
  resolveContacts(game);
  const cls = CLASSES[player.classId];
  if (cls.drones) updateDrones(player, cls.drones, game.enemies, game.onDroneHit, dt);

  updateProjectiles(game.playerShots, game.enemies, arenaRadius, game.playerShotEvents, dt);
  updateProjectiles(game.enemyShots, game.playerTargets, arenaRadius, game.enemyShotEvents, dt);
  removeDead(game.enemies);

  updatePickups(game.pickups, player, player.pickupRadius, pickupSettings, arenaRadius, game.onCollect, dt);
  updateSpawner(game.spawner, game.enemies, game.spawnEnemy, TUNING.spawning.respawnSeconds, dt);
  updatePops(game.pops, dt);
  checkEvolution(game);
}
