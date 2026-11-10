// Enemy definitions.
//   behaviour      'wander', 'chase' or 'strafe'
//   health         hits of 1 damage to destroy
//   speed, accel   top speed (units/s) and acceleration from rest (units/s²)
//   drops          bubbles released on death
//   contactDamage  bubbles knocked out of the player on touch (0 = harmless)
//   weapon         id in weapons.js, or null
//   minDifficulty  the lowest arena difficulty it appears at

import { c, ring, barrel } from './shapes.js';

export const ENEMIES = {
  drifter: {
    id: 'drifter', name: 'Drifter', behaviour: 'wander',
    health: 2, speed: 60, accel: 120, drops: 1, contactDamage: 0, weapon: null, minDifficulty: 0,
    wanderJitter: 2.5, // rad/s of random heading change
    hull: [c(0, 0, 13), c(-13, -9, 5), c(-17, 0, 4), c(-13, 9, 5), c(-24, -4, 3), c(-24, 4, 3)],
    guns: [],
  },
  chaser: {
    id: 'chaser', name: 'Chaser', behaviour: 'chase',
    health: 4, speed: 150, accel: 400, drops: 2, contactDamage: 2, weapon: null, minDifficulty: 0,
    hull: [c(6, 0, 11), c(-8, -9, 7), c(-8, 9, 7), c(-18, -15, 4), c(-18, 15, 4), c(18, 0, 5)],
    guns: [],
  },
  strafer: {
    id: 'strafer', name: 'Strafer', behaviour: 'strafe',
    health: 6, speed: 130, accel: 300, drops: 3, contactDamage: 0, weapon: 'strafer', minDifficulty: 1,
    preferredDistance: 350,
    fireRange: 550,
    hull: [c(0, 0, 15), ...ring(6, 19, 5)],
    guns: [c(0, 0, 6), ...barrel(0, 8, 14, 4.5, 3.5)],
  },
};

// How many of each enemy an arena holds, by difficulty (0 at the centre,
// 3 at the outer ring). An arena is filled from its roster on entry and
// tops itself up while you stay. Phase 7 adds the remaining enemies.
export const ROSTERS = [
  { drifter: 5, chaser: 2 },
  { drifter: 3, chaser: 3, strafer: 2 },
  { drifter: 2, chaser: 4, strafer: 4 },
  { drifter: 2, chaser: 5, strafer: 5 },
];
