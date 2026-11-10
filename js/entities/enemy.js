import { classRadius } from '../data/classes.js';
import { WEAPONS } from '../data/weapons.js';
import { TUNING } from '../data/tuning.js';
import { constrainToArena, turnToward } from '../systems/movement.js';
import { createTrigger, updateTrigger, fireWeapon } from '../systems/weapons.js';
import {
  steerVelocity, seek, keepDistance, wanderAngle, separation, containment,
} from '../systems/steering.js';

export function createEnemy(def, x, y, rng) {
  const heading = rng.next() * Math.PI * 2;
  return {
    def, x, y, vx: 0, vy: 0,
    prevX: x, prevY: y,
    heading, prevHeading: heading,
    aim: heading, prevAim: heading,
    radius: classRadius(def),
    muzzle: def.guns.length ? Math.max(...def.guns.map((g) => g.x + g.r)) : 0,
    health: def.health,
    alive: true,
    flash: 0,
    stun: 0, // seconds left drifting without steering
    trigger: createTrigger(),
    wander: heading,
    orbitDir: rng.next() < 0.5 ? -1 : 1,
  };
}

function desiredVelocity(e, player, rng, dt) {
  const { def } = e;
  switch (def.behaviour) {
    case 'chase':
      return seek(e, player.x, player.y, def.speed);
    case 'strafe':
      return keepDistance(e, player.x, player.y, def.preferredDistance, def.speed, e.orbitDir);
    case 'wander':
    default:
      e.wander = wanderAngle(e.wander, def.wanderJitter, rng, dt);
      return { x: Math.cos(e.wander) * def.speed, y: Math.sin(e.wander) * def.speed };
  }
}

// `world` holds player, enemies, rng and the enemy shot pool.
export function updateEnemy(e, world, dt) {
  const { def } = e;
  const { player, enemies, rng } = world;
  const steer = TUNING.steering;
  const arenaRadius = TUNING.arena.radius;

  e.prevX = e.x;
  e.prevY = e.y;
  e.prevHeading = e.heading;
  e.prevAim = e.aim;
  e.flash = Math.max(0, e.flash - dt);
  e.stun = Math.max(0, e.stun - dt);

  let dx = 0;
  let dy = 0;
  if (e.stun <= 0) {
    const want = desiredVelocity(e, player, rng, dt);
    const apart = separation(e, enemies, steer.separationPadding);
    const inward = containment(e, arenaRadius, steer.edgeMargin);
    // A wanderer turned back by the edge keeps its new heading.
    if (def.behaviour === 'wander' && (inward.x || inward.y)) {
      e.wander = turnToward(e.wander, Math.atan2(inward.y, inward.x), 3 * dt);
    }
    dx = want.x + (apart.x * steer.separationWeight + inward.x) * def.speed;
    dy = want.y + (apart.y * steer.separationWeight + inward.y) * def.speed;
    const len = Math.hypot(dx, dy);
    const max = def.speed * 1.3;
    if (len > max) {
      dx *= max / len;
      dy *= max / len;
    }
  }
  steerVelocity(e, dx, dy, def.accel / def.speed, dt);
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  constrainToArena(e, e.radius, arenaRadius, 0.3);

  if (Math.hypot(e.vx, e.vy) > 10) {
    e.heading = turnToward(e.heading, Math.atan2(e.vy, e.vx), 5 * dt);
  }

  if (def.weapon) {
    e.aim = Math.atan2(player.y - e.y, player.x - e.x);
    const inRange = Math.hypot(player.x - e.x, player.y - e.y) < def.fireRange;
    const weapon = WEAPONS[def.weapon];
    const shots = updateTrigger(e.trigger, inRange && e.stun <= 0, weapon, dt);
    for (let i = 0; i < shots; i++) {
      fireWeapon(world.enemyShots, weapon, e.x, e.y, e.aim, e.muzzle, rng);
    }
  } else {
    e.aim = e.heading;
  }
}

// Returns true if this hit destroyed the enemy.
export function damageEnemy(e, amount, flashSeconds) {
  e.health -= amount;
  e.flash = flashSeconds;
  if (e.health > 0) return false;
  e.alive = false;
  return true;
}
