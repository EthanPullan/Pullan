// World state and the fixed-step update. Drawing lives in render/scene.js
// and browser wiring in main.js.

import { TUNING, PALETTE } from './data/tuning.js';
import { CLASSES, CLASS_LIST, START_CLASS } from './data/classes.js';
import { WEAPONS } from './data/weapons.js';
import { ENEMIES, BOSSES, ROSTERS } from './data/enemies.js';
import {
  createWorld, cellKey, difficultyOf, exitDirection, neighbour, entryPosition, rosterFor,
} from './world.js';
import { createPlayer, updatePlayer, applyRecoil, setPlayerClass } from './entities/player.js';
import { createEnemy, updateEnemy, damageEnemy, contactDamageOf } from './entities/enemy.js';
import { createPool } from './systems/pool.js';
import { updateTrigger, fireWeapon } from './systems/weapons.js';
import { createProjectile, updateProjectiles } from './systems/projectiles.js';
import { circlesOverlap, pushApart } from './systems/collision.js';
import { takeDamage } from './systems/economy.js';
import { createPickup, spawnBurst, updatePickups } from './systems/pickups.js';
import { populate, spawnPoint } from './systems/spawning.js';
import { evaluateEvolution } from './systems/evolution.js';
import { updateDrones } from './systems/drones.js';
import { constrainToArena } from './systems/movement.js';
import { updateAbility } from './systems/abilities.js';
import { createParticle, spawnRing, spawnDots, updateParticles } from './systems/particles.js';

const combat = TUNING.combat;
const pickupSettings = TUNING.pickups;
// Enemy types that spawn and refill as a whole pack.
const PACKS = Object.values(ENEMIES).filter((e) => e.groupSize).map((e) => e.id);
const PACK_SPREAD = 80;

export function createGame(rng) {
  const player = createPlayer(CLASSES[START_CLASS]);
  const world = createWorld(TUNING.world.size);
  const game = {
    world,
    cell: { ...world.centre }, // the arena you are in
    history: [], // arenas you came from, most recent last; ejection returns to them
    transition: null, // set while fading between arenas
    arenaId: 0, // increases on every arena entry, so the camera knows to snap
    rng,
    time: 0,
    player,
    playerTargets: [player], // what enemy shots can hit: the player and any drones
    kills: 0,
    sounds: [], // sound events since main.js last played them: { type, size }
    shake: 0, // screen shake, 0 to 1, decaying
    hitPause: 0, // seconds the simulation holds still after a big impact
    trailTimer: 0,
    saveDue: false, // set when the run should be saved
    unlocked: new Set([START_CLASS]), // every form reached at least once, for the class tree
    defeated: new Set(), // ids of bosses beaten
    victoryPending: false, // true while the victory screen is up; the game pauses
    victoryShown: false,
    path: {}, // class chosen at each tier, restored when re-evolving
    pendingChoice: null, // class ids to choose between; the game pauses until one is picked
    enemies: [],
    playerShots: createPool(combat.projectilePoolSize, createProjectile),
    enemyShots: createPool(combat.enemyShotPoolSize, createProjectile),
    pickups: createPool(pickupSettings.poolSize, createPickup),
    particles: createPool(TUNING.effects.particlePoolSize, createParticle),
  };

  // Event handlers are made once here, so the update loop allocates none.
  // Adds `count` enemies of a type at one random point away from the player;
  // packs are scattered a little around it.
  game.spawnEnemy = (id, count = 1) => {
    const at = spawnPoint(player, TUNING.arena.radius, TUNING.spawning.edgeMargin,
      TUNING.spawning.minDistanceFromPlayer, rng);
    for (let i = 0; i < count; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = count > 1 ? rng.next() * PACK_SPREAD : 0;
      addEnemy(game, ENEMIES[id], at.x + Math.cos(a) * r, at.y + Math.sin(a) * r);
    }
  };
  game.executeAttack = (e, attack) => executeAttack(game, e, attack);
  game.onPhaseChange = (e) => {
    spawnRing(game.particles, e.x, e.y, e.radius * 2, combat.deathPopSeconds * 2, PALETTE.danger);
    impact(game, 0.6, 0.1);
    sound(game, 'warning');
  };
  // A boss winding up an attack sounds a warning.
  game.onAttackStart = (e) => {
    if (e.def.boss) sound(game, 'warning');
  };
  game.playerShotEvents = {
    onHit: (enemy, shot) => {
      knockBack(enemy, shot);
      hitEnemy(game, enemy, shot.damage);
    },
    onPop: (x, y, r) => spawnRing(game.particles, x, y, r, combat.shotPopSeconds, PALETTE.player),
    onExplode: (shot) => {
      for (const e of game.enemies) {
        if (e.alive && Math.hypot(e.x - shot.x, e.y - shot.y) < shot.explodeRadius + e.radius) {
          hitEnemy(game, e, shot.explodeDamage);
        }
      }
      spawnRing(game.particles, shot.x, shot.y, shot.explodeRadius * 0.6, combat.deathPopSeconds, PALETTE.pickup);
      spawnDots(game.particles, game.rng, shot.x, shot.y, 14, {
        speedMin: 80, speedMax: 260, size: 2.5, life: 0.4, color: PALETTE.pickup,
      });
      impact(game, 0.25, 0);
      sound(game, 'explode');
    },
  };
  game.enemyShotEvents = {
    // Drones absorb enemy shots; only the player takes damage.
    onHit: (target, shot) => {
      if (target === player) hurtPlayer(game, shot.damage);
    },
    onPop: (x, y, r) => spawnRing(game.particles, x, y, r, combat.shotPopSeconds, PALETTE.danger),
  };
  game.onDroneHit = (enemy, damage) => hitEnemy(game, enemy, damage);
  game.onCollect = (value) => {
    player.bubbles += value;
    sound(game, 'pickup');
  };

  populate(rosterFor(0, ROSTERS), PACKS, game.spawnEnemy);
  return game;
}

// Heavy enemies (bosses, their parts, carriers) are not pushed by shots.
function knockBack(target, shot) {
  if (target.def.heavy) return;
  const speed = Math.hypot(shot.vx, shot.vy) || 1;
  target.vx += (shot.vx / speed) * shot.knockback;
  target.vy += (shot.vy / speed) * shot.knockback;
}

// Adds an enemy, and a boss's parts around it. Returns the enemy.
function addEnemy(game, def, x, y) {
  const e = createEnemy(def, x, y, game.rng);
  game.enemies.push(e);
  if (def.parts) {
    const { enemy, count, distance } = def.parts;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const part = createEnemy(ENEMIES[enemy], x + Math.cos(a) * distance, y + Math.sin(a) * distance, game.rng);
      part.parent = e;
      part.partAngle = a;
      game.enemies.push(part);
    }
  }
  return e;
}

// Adds an enemy that `owner` summoned or dropped. These drop no bubbles,
// so a carrier can't be farmed forever.
function addChild(game, owner, def, x, y) {
  const child = addEnemy(game, def, x, y);
  child.owner = owner;
  child.noDrops = true;
  owner.children++;
  return child;
}

function executeAttack(game, e, attack) {
  const { player, rng } = game;
  switch (attack.type) {
    case 'shoot': {
      const angle = attack.lockAim ? e.attack.aim : Math.atan2(player.y - e.y, player.x - e.x);
      fireWeapon(game.enemyShots, WEAPONS[attack.weapon], e.x, e.y, angle, e.muzzle || e.radius, rng);
      break;
    }
    case 'ring':
      fireWeapon(game.enemyShots, WEAPONS[attack.weapon], e.x, e.y, e.ringAngle, e.radius, rng);
      e.ringAngle += attack.spin;
      break;
    case 'dash':
      e.dash = attack.duration;
      e.dashDamage = attack.damage;
      e.vx = Math.cos(e.attack.aim) * attack.speed;
      e.vy = Math.sin(e.attack.aim) * attack.speed;
      break;
    case 'summon':
      for (let i = 0; i < attack.count && e.children < attack.cap; i++) {
        const a = rng.next() * Math.PI * 2;
        const r = e.radius + 20;
        addChild(game, e, ENEMIES[attack.enemy], e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
      }
      break;
    case 'mine':
      addChild(game, e, ENEMIES.mine, e.x, e.y);
      break;
    case 'blast':
      if (Math.hypot(player.x - e.x, player.y - e.y) < attack.radius + player.radius) hurtPlayer(game, attack.damage);
      spawnRing(game.particles, e.x, e.y, attack.radius * 0.6, combat.deathPopSeconds, PALETTE.danger);
      impact(game, 0.4, 0);
      sound(game, 'explode');
      e.alive = false;
      e.expired = true;
      break;
    default:
      break;
  }
}

// Spawns any enemy or boss `distance` units in front of the player.
// For the debug spawn menu.
export function debugSpawn(game, id, distance = 350) {
  const { player } = game;
  addEnemy(game, ENEMIES[id], player.x + Math.cos(player.aim) * distance, player.y + Math.sin(player.aim) * distance);
}

// Dismisses the victory screen; play continues.
export function dismissVictory(game) {
  game.victoryPending = false;
}

function hitEnemy(game, enemy, damage) {
  if (damageEnemy(enemy, damage, combat.hitFlashSeconds)) killEnemy(game, enemy);
  else if (enemy.alive) sound(game, 'hit');
}

// --- Feel: sounds, shake and hit-pause -------------------------------------

// Queues a sound for main.js to play. `size` scales pitch (bigger is lower).
function sound(game, type, size = 1) {
  game.sounds.push({ type, size });
}

// A jolt: adds screen shake (0 to 1) and holds the simulation still for
// `pause` seconds, so big hits land with weight.
function impact(game, shake, pause) {
  game.shake = Math.min(1, game.shake + shake);
  game.hitPause = Math.max(game.hitPause, pause);
}

function killEnemy(game, enemy) {
  game.kills++;
  if (!enemy.noDrops) {
    spawnBurst(game.pickups, enemy.x, enemy.y, enemy.def.drops,
      pickupSettings.dropSpeedMin, pickupSettings.dropSpeedMax, 0, game.rng);
  }
  if (enemy.def.boss) defeatBoss(game, enemy);
  spawnRing(game.particles, enemy.x, enemy.y, enemy.radius * combat.deathPopScale,
    combat.deathPopSeconds, PALETTE.enemy);
  spawnDots(game.particles, game.rng, enemy.x, enemy.y, Math.round(6 + enemy.radius / 2), {
    speedMin: 60, speedMax: 220, size: 2.5, life: 0.5, color: PALETTE.enemy,
  });
  sound(game, 'pop', enemy.radius / 15);
  if (enemy.def.boss) impact(game, 1, 0.18);
  else if (enemy.def.heavy) impact(game, 0.3, 0.04);
}

function defeatBoss(game, boss) {
  game.defeated.add(boss.def.id);
  for (const part of game.enemies) {
    if (part.parent === boss && part.alive) {
      part.alive = false;
      killEnemy(game, part);
    }
  }
  if (game.defeated.size === BOSSES.length && !game.victoryShown) {
    game.victoryPending = true;
    game.victoryShown = true;
  }
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
  spawnRing(game.particles, player.x, player.y, player.radius * 1.2, combat.deathPopSeconds, PALETTE.danger);
  spawnDots(game.particles, game.rng, player.x, player.y, 10, {
    speedMin: 80, speedMax: 240, size: 2.5, life: 0.45, color: PALETTE.danger,
  });
  impact(game, 0.45, 0.06);
  sound(game, 'hurt');
  if (player.bubbles === 0 && !game.transition) eject(game);
}

// --- Arenas --------------------------------------------------------------

function startTransition(game, cell, entry, kind) {
  game.transition = { t: 0, cell, entry, kind, swapped: false };
}

// Hit with no bubbles left: back to the arena you came from, at its centre.
// In the starting arena, with nowhere to go back to, the arena is reset.
function eject(game) {
  const back = game.history.pop() || game.cell;
  startTransition(game, back, { x: 0, y: 0 }, 'eject');
}

// Touching a quarter of the membrane while holding a movement key toward it
// (D for east, A for west, W for north, S for south) crosses into the
// neighbouring arena, if there is one. Sliding along the membrane toward
// another quarter does not cross, so you can't bounce back and forth
// between two arenas. With no arena beyond, the membrane is solid.
function handleMembrane(game, moveX, moveY) {
  const { player } = game;
  const arenaRadius = TUNING.arena.radius;
  const d = Math.hypot(player.x, player.y);
  if (d <= arenaRadius - player.radius) return;
  const direction = exitDirection(player.x, player.y);
  const next = neighbour(game.world, game.cell, direction);
  const pushing = { east: moveX > 0, west: moveX < 0, south: moveY > 0, north: moveY < 0 }[direction];
  if (next && pushing) {
    const entry = entryPosition(player.x, player.y, direction, arenaRadius, TUNING.world.entryInset);
    startTransition(game, next, entry, 'cross');
  }
  const bounce = next ? TUNING.arena.edgeBounce : TUNING.world.solidBounce;
  constrainToArena(player, player.radius, arenaRadius, bounce);
}

function clearPool(pool) {
  for (const item of pool.items) pool.release(item);
}

function enterArena(game, cell, entry, kind) {
  const { player } = game;
  if (kind === 'cross') {
    game.history.push(game.cell);
    if (game.history.length > TUNING.world.historyLimit) game.history.shift();
  }
  game.cell = { ...cell };
  game.world.visited.add(cellKey(cell));
  game.arenaId++;
  game.saveDue = true; // main.js saves after every arena change

  game.enemies.length = 0;
  clearPool(game.playerShots);
  clearPool(game.enemyShots);
  clearPool(game.pickups);
  clearPool(game.particles);

  player.x = player.prevX = entry.x;
  player.y = player.prevY = entry.y;
  if (kind === 'eject' || kind === 'load') {
    player.vx = 0;
    player.vy = 0;
    player.invuln = TUNING.world.ejectInvulnSeconds;
    player.blink = TUNING.world.ejectInvulnSeconds;
  }
  for (const d of player.drones) {
    d.x = d.prevX = player.x;
    d.y = d.prevY = player.y;
  }

  // A boss arena holds only its boss until the boss is beaten.
  const boss = BOSSES.find((b) => b.cell.col === cell.col && b.cell.row === cell.row && !game.defeated.has(b.id));
  const roster = boss ? {} : rosterFor(difficultyOf(game.world, cell), ROSTERS);
  populate(roster, PACKS, game.spawnEnemy);
  if (boss) addEnemy(game, boss, 0, 0);
}

// The game pauses during the fade; the arena swaps at its midpoint.
function advanceTransition(game, dt) {
  const tr = game.transition;
  const duration = TUNING.world.transitionSeconds;
  tr.t += dt;
  if (!tr.swapped && tr.t >= duration / 2) {
    enterArena(game, tr.cell, tr.entry, tr.kind);
    tr.swapped = true;
  }
  if (tr.t >= duration) game.transition = null;
}

// Restores a checked save (see save.js) into a freshly created game: the
// form, bubbles, progress, and the arena, entered at its centre.
export function loadGame(game, save) {
  const { player } = game;
  game.path = { ...save.path };
  player.bubbles = save.bubbles;
  game.kills = save.kills;
  game.victoryShown = save.victoryShown;
  game.history = save.history.map((c) => ({ ...c }));
  game.world.visited = new Set(save.visited);
  game.defeated = new Set(save.defeated);
  game.unlocked = new Set(save.unlocked);
  setPlayerClass(player, CLASSES[save.classId]);
  game.playerTargets = [player, ...player.drones];
  enterArena(game, save.cell, { x: 0, y: 0 }, 'load');
}

// How dark the screen is: 0 normally, rising to 1 at the swap.
export function fadeAmount(game) {
  if (!game.transition) return 0;
  const half = TUNING.world.transitionSeconds / 2;
  return Math.max(0, 1 - Math.abs(game.transition.t - half) / half);
}

// Touching enemies are pushed out of the player. Harmful ones deal their
// contact damage and are thrown back so they don't sit on top of you.
function resolveContacts(game) {
  const { player } = game;
  for (const e of game.enemies) {
    if (!e.alive || e.def.noContact) continue;
    if (!circlesOverlap(player.x, player.y, player.radius, e.x, e.y, e.radius)) continue;
    const damage = contactDamageOf(e);
    if (e.def.heavy) {
      // Bosses and big enemies don't budge; the player is pushed off.
      const n = pushApart(e, player);
      if (n && damage > 0) {
        player.vx += n.x * combat.contactKnockback;
        player.vy += n.y * combat.contactKnockback;
        hurtPlayer(game, damage);
      }
      continue;
    }
    const n = pushApart(player, e);
    if (!n || damage <= 0) continue;
    e.dash = 0;
    e.vx = n.x * combat.contactKnockback;
    e.vy = n.y * combat.contactKnockback;
    e.stun = combat.contactStunSeconds;
    hurtPlayer(game, damage);
  }
}

function removeDead(enemies) {
  let kept = 0;
  for (const e of enemies) {
    if (e.alive) enemies[kept++] = e;
    else if (e.owner) e.owner.children--;
  }
  enemies.length = kept;
}

function useAbility(game, ability, controls) {
  const { player } = game;
  switch (ability.type) {
    case 'fire': {
      const weapon = WEAPONS[ability.weapon];
      fireWeapon(game.playerShots, weapon, player.x, player.y, player.aim, player.muzzle, game.rng);
      applyRecoil(player, weapon.recoil);
      break;
    }
    case 'dash': {
      // Dash the way you're steering, or toward the cursor if not moving.
      const len = Math.hypot(controls.moveX, controls.moveY);
      const dx = len ? controls.moveX / len : Math.cos(player.aim);
      const dy = len ? controls.moveY / len : Math.sin(player.aim);
      player.vx += dx * ability.impulse;
      player.vy += dy * ability.impulse;
      player.invuln = Math.max(player.invuln, ability.invulnSeconds);
      spawnRing(game.particles, player.x, player.y, player.radius, combat.shotPopSeconds * 2, PALETTE.player);
      break;
    }
    case 'shockwave':
      for (const e of game.enemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (!e.alive || d > ability.radius + e.radius) continue;
        if (!e.def.heavy && d > 0) {
          e.vx += ((e.x - player.x) / d) * ability.knockback;
          e.vy += ((e.y - player.y) / d) * ability.knockback;
          e.stun = combat.contactStunSeconds;
        }
        hitEnemy(game, e, ability.damage);
      }
      spawnRing(game.particles, player.x, player.y, ability.radius * 0.6, combat.deathPopSeconds * 1.5, PALETTE.player);
      impact(game, 0.4, 0.05);
      break;
    case 'shield':
      player.shield = ability.seconds;
      player.invuln = Math.max(player.invuln, ability.seconds);
      break;
    default:
      break;
  }
}

// A few dots out of the gun tip with each shot.
function muzzlePuff(game, weapon) {
  const { player } = game;
  const x = player.x + Math.cos(player.aim) * player.muzzle;
  const y = player.y + Math.sin(player.aim) * player.muzzle;
  spawnDots(game.particles, game.rng, x, y, 3, {
    speedMin: 60, speedMax: 160, size: 1.2 + weapon.radius * 0.15, life: 0.15,
    color: PALETTE.player, angle: player.aim, spread: 0.9, drag: 8,
  });
  sound(game, 'shot', weapon.radius / 5);
}

// Small bubbles left behind while moving fast.
function emitTrail(game, dt) {
  const { player } = game;
  const fx = TUNING.effects;
  game.trailTimer -= dt;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed < fx.trailMinSpeed || game.trailTimer > 0) return;
  game.trailTimer = fx.trailInterval;
  const back = Math.atan2(player.vy, player.vx) + Math.PI;
  spawnDots(game.particles, game.rng, player.x + Math.cos(back) * player.radius * 0.8,
    player.y + Math.sin(back) * player.radius * 0.8, 1, {
      speedMin: 10, speedMax: 40, size: 2.2, life: 0.6, color: PALETTE.player, angle: back, spread: 1.2, drag: 2,
    });
}

function changeClass(game, classId) {
  const { player } = game;
  const previousTier = CLASSES[player.classId].tier;
  setPlayerClass(player, CLASSES[classId]);
  game.unlocked.add(classId);
  game.playerTargets = [player, ...player.drones];
  const evo = TUNING.evolution;
  player.morph = evo.morphSeconds;
  player.invuln = Math.max(player.invuln, evo.morphInvulnSeconds);
  spawnRing(game.particles, player.x, player.y, player.radius * 1.8, evo.morphSeconds, PALETTE.player);
  spawnDots(game.particles, game.rng, player.x, player.y, 30, {
    speedMin: 100, speedMax: 320, size: 3, life: 0.7, color: PALETTE.player,
  });
  sound(game, CLASSES[classId].tier > previousTier ? 'evolve' : 'devolve');
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

// `controls`: moveX, moveY (-1..1), aimX, aimY (world units), fire and
// ability (bools).
// Does nothing while a class choice or the victory screen is up, and only
// runs the fade while moving between arenas.
export function updateGame(game, controls, dt) {
  if (game.pendingChoice || game.victoryPending) return;
  const { player } = game;
  const arenaRadius = TUNING.arena.radius;
  game.shake = Math.max(0, game.shake - TUNING.effects.shakeDecay * dt);
  if (game.hitPause > 0) {
    game.hitPause -= dt;
    return;
  }
  game.time += dt;
  if (game.transition) {
    advanceTransition(game, dt);
    return;
  }

  updatePlayer(player, controls.moveX, controls.moveY, controls.aimX, controls.aimY, TUNING, dt);
  handleMembrane(game, controls.moveX, controls.moveY);
  const weapon = WEAPONS[player.weapon];
  const shots = updateTrigger(player.trigger, controls.fire, weapon, dt);
  for (let i = 0; i < shots; i++) {
    fireWeapon(game.playerShots, weapon, player.x, player.y, player.aim, player.muzzle, game.rng);
    applyRecoil(player, weapon.recoil);
    muzzlePuff(game, weapon);
  }
  emitTrail(game, dt);

  const cls = CLASSES[player.classId];
  if (updateAbility(player.abilityState, cls.ability, controls.ability, dt)) {
    useAbility(game, cls.ability, controls);
    sound(game, 'ability');
  }

  for (const e of game.enemies) updateEnemy(e, game, dt);
  resolveContacts(game);
  if (cls.drones) updateDrones(player, cls.drones, game.enemies, game.onDroneHit, dt);

  updateProjectiles(game.playerShots, game.enemies, arenaRadius, game.playerShotEvents, dt);
  updateProjectiles(game.enemyShots, game.playerTargets, arenaRadius, game.enemyShotEvents, dt);
  removeDead(game.enemies);

  const cleared = !game.enemies.some((e) => e.alive && !e.def.hazard);
  updatePickups(game.pickups, player, player.pickupRadius, pickupSettings, arenaRadius, game.onCollect, dt, cleared);
  updateParticles(game.particles, dt);
  checkEvolution(game);
}
