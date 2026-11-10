import { classRadius } from '../data/classes.js';
import { stepMovement, constrainToArena, turnToward } from '../systems/movement.js';

export function createPlayer(cls) {
  const player = {
    x: 0, y: 0, vx: 0, vy: 0,
    heading: 0, // hull direction
    aim: 0, // turret direction
    prevX: 0, prevY: 0, prevHeading: 0, prevAim: 0,
    classId: null, radius: 0,
  };
  setPlayerClass(player, cls);
  return player;
}

export function setPlayerClass(player, cls) {
  player.classId = cls.id;
  player.radius = classRadius(cls);
}

export function updatePlayer(player, moveX, moveY, aimX, aimY, tuning, dt) {
  player.prevX = player.x;
  player.prevY = player.y;
  player.prevHeading = player.heading;
  player.prevAim = player.aim;

  const p = tuning.player;
  stepMovement(player, moveX, moveY, p, dt);
  constrainToArena(player, player.radius, tuning.arena.radius, tuning.arena.edgeBounce);

  if (Math.hypot(player.vx, player.vy) > p.hullTurnMinSpeed) {
    const travel = Math.atan2(player.vy, player.vx);
    player.heading = turnToward(player.heading, travel, p.hullTurnRate * dt);
  }
  player.aim = Math.atan2(aimY - player.y, aimX - player.x);
}
