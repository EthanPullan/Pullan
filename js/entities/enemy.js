import { classRadius } from '../data/classes.js';
import { TUNING } from '../data/tuning.js';
import { attacksOf } from '../data/enemies.js';
import { constrainToArena, turnToward } from '../systems/movement.js';
import { createAttackState, updateAttacks, phaseFor } from '../systems/attacks.js';
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
    age: 0,
    flash: 0,
    stun: 0, // seconds left drifting without steering
    wander: heading,
    orbitDir: rng.next() < 0.5 ? -1 : 1,
    // Attacks start after a random delay so a group doesn't fire in unison.
    // Mines have no extra delay: arming is their delay.
    attack: createAttackState(def.armSeconds !== undefined ? 0 : 0.5 + rng.next() * 1.5),
    phase: 0, // boss phase
    dash: 0, // seconds of dash left
    dashDamage: 0,
    spin: 0, // rotation of a boss's parts
    ringAngle: 0, // rotation of ring attacks
    owner: null, // the enemy that summoned or dropped this one
    children: 0, // how many of this enemy's summons are alive
    parent: null, // the boss a part rides on
    partAngle: 0,
  };
}

export function contactDamageOf(e) {
  return e.dash > 0 ? e.dashDamage : e.def.contactDamage;
}

function desiredVelocity(e, player, rng, dt) {
  const { def } = e;
  switch (def.behaviour) {
    case 'chase':
      return seek(e, player.x, player.y, def.speed);
    case 'strafe':
      return keepDistance(e, player.x, player.y, def.preferredDistance, def.speed, e.orbitDir);
    case 'flee':
      if (Math.hypot(player.x - e.x, player.y - e.y) < def.fleeDistance) {
        const toward = seek(e, player.x, player.y, def.speed);
        return { x: -toward.x, y: -toward.y };
      }
      e.wander = wanderAngle(e.wander, def.wanderJitter, rng, dt);
      return { x: Math.cos(e.wander) * def.speed, y: Math.sin(e.wander) * def.speed };
    case 'static':
      return { x: 0, y: 0 };
    case 'wander':
    default:
      e.wander = wanderAngle(e.wander, def.wanderJitter, rng, dt);
      return { x: Math.cos(e.wander) * def.speed, y: Math.sin(e.wander) * def.speed };
  }
}

// Whether `attack` may start now.
function canStart(e, attack, player) {
  const d = Math.hypot(player.x - e.x, player.y - e.y);
  if (attack.range && d > attack.range) return false;
  if (attack.cap !== undefined && e.children >= attack.cap) return false;
  if (attack.type === 'blast') return e.age >= e.def.armSeconds && d < attack.triggerRange;
  return true;
}

function updatePart(e) {
  const boss = e.parent;
  if (!boss.alive) {
    e.alive = false;
    return;
  }
  const a = boss.spin + e.partAngle;
  const dist = boss.def.parts.distance;
  e.x = boss.x + Math.cos(a) * dist;
  e.y = boss.y + Math.sin(a) * dist;
  e.heading = a;
  e.aim = a;
}

function steer(e, world, dt) {
  const { def } = e;
  const { player, enemies, rng } = world;
  const steerSettings = TUNING.steering;
  const arenaRadius = TUNING.arena.radius;

  if (e.dash > 0) {
    // Dashing: keep the locked velocity.
    e.dash -= dt;
  } else {
    let dx = 0;
    let dy = 0;
    const holding = def.stopToAttack && e.attack.active;
    if (e.stun <= 0 && !holding) {
      const want = desiredVelocity(e, player, rng, dt);
      const apart = separation(e, enemies, steerSettings.separationPadding);
      const inward = containment(e, arenaRadius, steerSettings.edgeMargin);
      // A wanderer turned back by the edge keeps its new heading.
      if ((def.behaviour === 'wander' || def.behaviour === 'flee') && (inward.x || inward.y)) {
        e.wander = turnToward(e.wander, Math.atan2(inward.y, inward.x), 3 * dt);
      }
      dx = want.x + (apart.x * steerSettings.separationWeight + inward.x) * Math.max(def.speed, 60);
      dy = want.y + (apart.y * steerSettings.separationWeight + inward.y) * Math.max(def.speed, 60);
      const len = Math.hypot(dx, dy);
      const max = Math.max(def.speed, 60) * 1.3;
      if (len > max) {
        dx *= max / len;
        dy *= max / len;
      }
    }
    steerVelocity(e, dx, dy, def.accel / Math.max(def.speed, 60), dt);
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  constrainToArena(e, e.radius, arenaRadius, 0.3);

  if (Math.hypot(e.vx, e.vy) > 10) {
    e.heading = turnToward(e.heading, Math.atan2(e.vy, e.vx), 5 * dt);
  }
}

// `world` is the game: player, enemies, rng, `executeAttack(e, attack)`,
// `onAttackStart(e, attack)` and `onPhaseChange(e)`.
export function updateEnemy(e, world, dt) {
  const { def } = e;
  const { player } = world;

  e.prevX = e.x;
  e.prevY = e.y;
  e.prevHeading = e.heading;
  e.prevAim = e.aim;
  e.age += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.stun = Math.max(0, e.stun - dt);

  if (def.lifetime && e.age >= def.lifetime) {
    e.alive = false;
    e.expired = true; // removed without dropping anything
    return;
  }
  if (def.behaviour === 'part') {
    updatePart(e);
    return;
  }
  if (def.parts) e.spin += def.parts.spin * dt;

  if (def.phases) {
    const phase = phaseFor(def.phases, e.health / def.health);
    if (phase !== e.phase) {
      e.phase = phase;
      e.attack = createAttackState(0.6);
      world.onPhaseChange(e);
    }
  }

  steer(e, world, dt);

  const toPlayer = Math.atan2(player.y - e.y, player.x - e.x);
  const event = updateAttacks(e.attack, attacksOf(def, e.phase), (a) => canStart(e, a, player), dt);
  if (event && event.kind === 'start') {
    e.attack.aim = toPlayer;
    world.onAttackStart(e, event.attack);
  }
  if (event && event.kind === 'execute') world.executeAttack(e, event.attack);

  if (def.guns.length) {
    const locked = e.attack.active && e.attack.active.lockAim;
    e.aim = locked ? e.attack.aim : toPlayer;
  } else {
    e.aim = e.heading;
  }
}

// Returns true if this hit destroyed the enemy.
export function damageEnemy(e, amount, flashSeconds) {
  if (!e.alive) return false;
  e.health -= amount;
  e.flash = flashSeconds;
  if (e.health > 0) return false;
  e.alive = false;
  return true;
}
