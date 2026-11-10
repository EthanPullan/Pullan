// Enemy and boss definitions.
//   behaviour      how it moves: 'wander', 'chase', 'strafe' (circle at
//                  preferredDistance), 'flee', 'static', or 'part' (rides
//                  on a boss)
//   health         hits of 1 damage to destroy
//   speed, accel   top speed (units/s) and acceleration from rest (units/s²)
//   drops          bubbles released on death
//   contactDamage  bubbles knocked out of the player on touch (0 = harmless)
//   minDifficulty  the lowest arena difficulty it appears at (99 = never in
//                  a roster; spawned by something else)
//   groupSize      spawns as a pack of this size
//   heavy          the player is pushed off it, not the other way round
//   stopToAttack   stands still while winding up
//   attacks        used in turn; see systems/attacks.js. Every attack winds
//                  up for `windup` seconds with a visible warning first.
//     shoot     fires `weapon` at the player; `lockAim` fixes the aim when
//               the wind-up starts and shows an aim line `line` units long
//     ring      fires `weapon` (a full circle of shots), rotating by `spin`
//     dash      charges along a locked line at `speed` for `duration` s,
//               dealing `damage` on contact
//     summon    adds `count` of `enemy` nearby, keeping at most `cap` alive
//     mine      drops a mine, keeping at most `cap` alive
//     blast     explodes, hurting the player within `radius`; the enemy dies
//   `range` limits how near the player must be for an attack to start.

import { c, ring, barrel } from './shapes.js';

const ENEMY_LIST = [
  {
    id: 'drifter', name: 'Drifter', behaviour: 'wander',
    health: 2, speed: 60, accel: 120, drops: 1, contactDamage: 0, minDifficulty: 0,
    wanderJitter: 2.5, // rad/s of random heading change
    hull: [c(0, 0, 13), c(-13, -9, 5), c(-17, 0, 4), c(-13, 9, 5), c(-24, -4, 3), c(-24, 4, 3)],
    guns: [],
    attacks: [],
  },
  {
    id: 'chaser', name: 'Chaser', behaviour: 'chase',
    health: 4, speed: 150, accel: 400, drops: 2, contactDamage: 2, minDifficulty: 0,
    hull: [c(6, 0, 11), c(-8, -9, 7), c(-8, 9, 7), c(-18, -15, 4), c(-18, 15, 4), c(18, 0, 5)],
    guns: [],
    attacks: [],
  },
  {
    id: 'strafer', name: 'Strafer', behaviour: 'strafe', preferredDistance: 350,
    health: 6, speed: 130, accel: 300, drops: 3, contactDamage: 0, minDifficulty: 1,
    hull: [c(0, 0, 15), ...ring(6, 19, 5)],
    guns: [c(0, 0, 6), ...barrel(0, 8, 14, 4.5, 3.5)],
    attacks: [{ type: 'shoot', weapon: 'strafer', windup: 0.4, interval: 1.2, range: 550 }],
  },
  {
    id: 'swarmling', name: 'Swarmling', behaviour: 'chase', groupSize: 10,
    health: 1, speed: 190, accel: 500, drops: 1, contactDamage: 1, minDifficulty: 1,
    hull: [c(3, 0, 6), c(-5, -4, 3.5), c(-5, 4, 3.5)],
    guns: [],
    attacks: [],
  },
  {
    id: 'sniper', name: 'Sniper', behaviour: 'strafe', preferredDistance: 650, stopToAttack: true,
    health: 5, speed: 70, accel: 150, drops: 4, contactDamage: 0, minDifficulty: 2,
    hull: [c(0, 0, 12), c(-14, 0, 8), c(-24, 0, 5), c(4, -12, 5), c(4, 12, 5)],
    guns: [c(0, 0, 5), ...barrel(0, 7, 30, 3.5, 2.5)],
    attacks: [{ type: 'shoot', weapon: 'sniper', windup: 1, interval: 2.5, range: 900, lockAim: true, line: 1000 }],
  },
  {
    id: 'charger', name: 'Charger', behaviour: 'chase', stopToAttack: true,
    health: 10, speed: 90, accel: 200, drops: 5, contactDamage: 0, minDifficulty: 2,
    hull: [c(8, 0, 15), c(-10, -11, 10), c(-10, 11, 10), c(-24, 0, 8), c(24, 0, 6), c(20, -10, 4), c(20, 10, 4)],
    guns: [],
    attacks: [{ type: 'dash', windup: 0.8, interval: 2.5, range: 450, speed: 600, duration: 0.6, damage: 3 }],
  },
  {
    id: 'carrier', name: 'Carrier', behaviour: 'wander', heavy: true,
    health: 25, speed: 50, accel: 80, drops: 10, contactDamage: 0, minDifficulty: 3,
    wanderJitter: 1,
    hull: [c(0, 0, 30), ...ring(8, 32, 9), c(-44, 0, 8)],
    guns: [],
    attacks: [{ type: 'summon', enemy: 'swarmling', count: 1, cap: 6, windup: 0.5, interval: 3 }],
  },
  {
    id: 'minelayer', name: 'Mine-layer', behaviour: 'flee', fleeDistance: 500,
    health: 8, speed: 160, accel: 350, drops: 5, contactDamage: 0, minDifficulty: 3,
    wanderJitter: 2,
    hull: [c(4, 0, 12), c(-10, 0, 10), c(-22, -6, 5), c(-22, 6, 5), c(10, -10, 5), c(10, 10, 5)],
    guns: [],
    attacks: [{ type: 'mine', cap: 4, windup: 0.3, interval: 2 }],
  },
  {
    // Dropped by mine-layers. Harmless until armed; then a player within
    // `triggerRange` starts a fuse, shown as the blast radius.
    id: 'mine', name: 'Mine', behaviour: 'static', noContact: true,
    health: 1, speed: 0, accel: 300, drops: 0, contactDamage: 0, minDifficulty: 99,
    armSeconds: 1, lifetime: 15,
    hull: [c(0, 0, 7), ...ring(4, 8, 3, Math.PI / 4)],
    guns: [],
    attacks: [{ type: 'blast', windup: 0.6, interval: 99, triggerRange: 70, radius: 90, damage: 3 }],
  },

  // Boss parts: they ride on a boss, shield it, and can be shot off.
  {
    id: 'bloomPod', name: 'Bloom pod', behaviour: 'part', heavy: true,
    health: 12, speed: 0, accel: 1, drops: 3, contactDamage: 1, minDifficulty: 99,
    hull: [c(0, 0, 14), ...ring(5, 13, 5)],
    guns: [],
    attacks: [],
  },
  {
    id: 'wardenGun', name: 'Warden gun', behaviour: 'part', heavy: true,
    health: 15, speed: 0, accel: 1, drops: 3, contactDamage: 1, minDifficulty: 99,
    hull: [c(0, 0, 12), c(14, 0, 8), c(24, 0, 5)],
    guns: [],
    attacks: [],
  },

  // Bosses: one each in two corner arenas. Each has parts and two phases.
  {
    id: 'bloom', name: 'The Bloom', boss: true, cell: { col: 0, row: 0 },
    behaviour: 'strafe', preferredDistance: 380, heavy: true,
    health: 160, speed: 60, accel: 100, drops: 40, contactDamage: 2, minDifficulty: 99,
    hull: [c(0, 0, 42), ...ring(10, 40, 10)],
    guns: [],
    parts: { enemy: 'bloomPod', count: 6, distance: 72, spin: 0.4 },
    phases: [
      { attacks: [{ type: 'ring', weapon: 'bloomSpore', windup: 1, interval: 2.6, spin: 0 }] },
      {
        below: 0.5,
        attacks: [
          { type: 'ring', weapon: 'bloomSporeDense', windup: 0.7, interval: 1.6, spin: 0.25 },
          { type: 'summon', enemy: 'swarmling', count: 3, cap: 9, windup: 0.8, interval: 2 },
        ],
      },
    ],
  },
  {
    id: 'warden', name: 'The Warden', boss: true, cell: { col: 6, row: 6 },
    behaviour: 'strafe', preferredDistance: 420, heavy: true, stopToAttack: true,
    health: 200, speed: 90, accel: 160, drops: 50, contactDamage: 2, minDifficulty: 99,
    hull: [c(0, 0, 38), ...ring(6, 38, 13, Math.PI / 6), c(-50, 0, 12)],
    guns: [],
    parts: { enemy: 'wardenGun', count: 3, distance: 66, spin: 0.8 },
    phases: [
      {
        attacks: [{ type: 'shoot', weapon: 'wardenBolt', windup: 0.8, interval: 2.2, range: 900, lockAim: true, line: 700 }],
      },
      {
        below: 0.5,
        attacks: [
          { type: 'dash', windup: 1, interval: 1.5, range: 700, speed: 650, duration: 0.7, damage: 4 },
          { type: 'shoot', weapon: 'wardenBolt', windup: 0.6, interval: 1.5, range: 900, lockAim: true, line: 700 },
        ],
      },
    ],
  },
];

export const ENEMIES = Object.fromEntries(ENEMY_LIST.map((e) => [e.id, e]));
export const BOSSES = ENEMY_LIST.filter((e) => e.boss);

// The attacks an enemy uses right now: its boss phase's, or its own.
export function attacksOf(def, phase) {
  return def.phases ? def.phases[phase].attacks : def.attacks;
}

// How many of each enemy an arena holds, by difficulty (0 at the centre,
// 3 at the outer ring). An arena is filled from its roster each time you
// enter and is not topped up while you stay. Packs (swarmlings) count their
// whole group.
// Boss arenas hold only their boss until it is defeated.
export const ROSTERS = [
  { drifter: 5, chaser: 2 },
  { drifter: 3, chaser: 3, strafer: 2, swarmling: 10 },
  { drifter: 2, chaser: 3, strafer: 3, swarmling: 10, sniper: 2, charger: 2 },
  { drifter: 2, chaser: 3, strafer: 3, swarmling: 10, sniper: 2, charger: 2, carrier: 1, minelayer: 2 },
];
