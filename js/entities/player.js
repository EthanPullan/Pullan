import { classRadius } from '../data/classes.js';
import { TUNING } from '../data/tuning.js';
import { stepMovement, constrainToArena, turnToward } from '../systems/movement.js';
import { createTrigger } from '../systems/weapons.js';

export function createPlayer(cls) {
  const player = {
    x: 0, y: 0, vx: 0, vy: 0,
    heading: 0, // hull direction
    aim: 0, // turret direction
    prevX: 0, prevY: 0, prevHeading: 0, prevAim: 0,
    classId: null, radius: 0,
    muzzle: 0, // distance from centre to the gun tip
    weapon: null, // id in weapons.js
    move: { accel: 0, topSpeed: 0, releaseDrag: 0 },
    pickupRadius: 0,
    drones: [], // Halo only
    droneAngle: 0,
    trigger: createTrigger(),
    alive: true, // lets enemy shots treat the player like any other target
    bubbles: 0,
    invuln: 0, // seconds of immunity left
    blink: 0, // seconds of damage blinking left
    morph: 0, // seconds of transformation animation left
  };
  setPlayerClass(player, cls);
  return player;
}

export function setPlayerClass(player, cls) {
  player.classId = cls.id;
  player.radius = classRadius(cls);
  player.muzzle = Math.max(...cls.guns.map((g) => g.x + g.r));
  player.weapon = cls.weapon;
  player.move.accel = cls.stats.accel;
  player.move.topSpeed = cls.stats.topSpeed;
  player.move.releaseDrag = TUNING.player.releaseDrag;
  player.pickupRadius = cls.stats.pickupRadius;
  const count = cls.drones ? cls.drones.count : 0;
  player.drones = Array.from({ length: count }, () => ({
    x: player.x, y: player.y, prevX: player.x, prevY: player.y,
    radius: cls.drones.radius, alive: true, cooldown: 0,
  }));
}

// Pushes the player opposite to the aim, once per shot fired.
export function applyRecoil(player, amount) {
  player.vx -= Math.cos(player.aim) * amount;
  player.vy -= Math.sin(player.aim) * amount;
}

export function updatePlayer(player, moveX, moveY, aimX, aimY, tuning, dt) {
  player.prevX = player.x;
  player.prevY = player.y;
  player.prevHeading = player.heading;
  player.prevAim = player.aim;
  player.invuln = Math.max(0, player.invuln - dt);
  player.blink = Math.max(0, player.blink - dt);
  player.morph = Math.max(0, player.morph - dt);

  const p = tuning.player;
  stepMovement(player, moveX, moveY, player.move, dt);
  constrainToArena(player, player.radius, tuning.arena.radius, tuning.arena.edgeBounce);

  if (Math.hypot(player.vx, player.vy) > p.hullTurnMinSpeed) {
    const travel = Math.atan2(player.vy, player.vx);
    player.heading = turnToward(player.heading, travel, p.hullTurnRate * dt);
  }
  player.aim = Math.atan2(aimY - player.y, aimX - player.x);
}
