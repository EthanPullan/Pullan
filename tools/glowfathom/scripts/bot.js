// A scripted player for balance estimates. It drives the real game through
// the same controls a person uses: it fights the nearest enemy (aiming with
// simple lead and keeping its distance), waits for the bubbles to fly in
// once an arena is clear, then moves on. It picks harder arenas as it
// evolves, and heads for the nearest boss once it reaches its final form.
// It does not dodge, so it is a rough stand-in for a person.

import { chooseClass, dismissVictory } from '../js/game.js';
import { CLASSES } from '../js/data/classes.js';
import { WEAPONS } from '../js/data/weapons.js';
import { BOSSES } from '../js/data/enemies.js';
import { difficultyOf, neighbour, DIRECTIONS } from '../js/world.js';
import { TUNING } from '../js/data/tuning.js';
import { progressScale } from '../js/systems/evolution.js';

const FIGHT_LIMIT = 90; // seconds before giving up on an arena that won't clear
const COLLECT_WAIT = 1.5; // seconds to let bubbles fly in after a clear

export function createBot(path) {
  return { path, arenaId: -1, arenaTime: 0, clearTime: 0, exit: null, strafe: 1, strafeTime: 0 };
}

// Harder arenas as the form grows: tier 1 moves up to difficulty 1 halfway
// to its next form, tier 2 to difficulty 2 a third of the way.
function desiredDifficulty(game) {
  const cls = CLASSES[game.player.classId];
  const { fill } = progressScale(cls, game.player.bubbles, TUNING.evolution);
  if (cls.tier === 1) return fill >= 0.5 ? 1 : 0;
  if (cls.tier === 2) return fill >= 0.33 ? 2 : 1;
  return 3;
}

function chooseExit(game) {
  const { tier } = CLASSES[game.player.classId];
  const previous = game.history[game.history.length - 1];
  const boss = tier === 3 && BOSSES.find((b) => !game.defeated.has(b.id));
  let best = null;
  let bestScore = Infinity;
  for (const dir of Object.keys(DIRECTIONS)) {
    const next = neighbour(game.world, game.cell, dir);
    if (!next) continue;
    let score;
    if (boss) {
      score = Math.abs(next.col - boss.cell.col) + Math.abs(next.row - boss.cell.row);
    } else {
      score = Math.abs(difficultyOf(game.world, next) - desiredDifficulty(game));
      if (previous && next.col === previous.col && next.row === previous.row) score += 0.5;
    }
    score += game.rng.next() * 0.1;
    if (score < bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  return best;
}

// Returns the controls for this step, after handling any choice or
// victory screen the game is waiting on.
export function botControls(bot, game, dt) {
  if (game.pendingChoice) {
    const tier = CLASSES[game.pendingChoice[0]].tier;
    const want = bot.path[tier];
    chooseClass(game, game.pendingChoice.includes(want) ? want : game.pendingChoice[0]);
  }
  if (game.victoryPending) dismissVictory(game);

  if (game.arenaId !== bot.arenaId) {
    bot.arenaId = game.arenaId;
    bot.arenaTime = 0;
    bot.clearTime = 0;
    bot.exit = null;
  }
  bot.arenaTime += dt;
  bot.strafeTime += dt;
  if (bot.strafeTime > 2) {
    bot.strafeTime = 0;
    bot.strafe = -bot.strafe;
  }

  const { player } = game;
  const controls = { moveX: 0, moveY: 0, aimX: player.x + 1, aimY: player.y, fire: false, ability: false };

  let target = null;
  let best = Infinity;
  for (const e of game.enemies) {
    if (!e.alive || e.def.hazard) continue;
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < best) {
      best = d;
      target = e;
    }
  }

  if (target) {
    const speed = WEAPONS[player.weapon].speed;
    const t = best / speed;
    controls.aimX = target.x + target.vx * t;
    controls.aimY = target.y + target.vy * t;
    controls.fire = true;
    controls.ability = best < 400;
  }

  // Bosses are fought to the end; other arenas are left after a while.
  const bossHere = game.enemies.some((e) => e.alive && e.def.boss);
  const fighting = target && (bossHere || bot.arenaTime < FIGHT_LIMIT);
  if (fighting) {
    const dx = (target.x - player.x) / best;
    const dy = (target.y - player.y) / best;
    if (best > 320) {
      controls.moveX = dx;
      controls.moveY = dy;
    } else if (best < 200) {
      controls.moveX = -dx;
      controls.moveY = -dy;
    } else {
      controls.moveX = -dy * bot.strafe;
      controls.moveY = dx * bot.strafe;
    }
    // Near the membrane, let go of the key toward that quarter of it, or the
    // fight would carry the player into the next arena by accident. (A
    // person presses whole keys; this player steers with fractions, and any
    // fraction toward the edge counts as holding that key.)
    // Both keys are checked, since near a diagonal one step can carry the
    // player from one quarter of the membrane into the next.
    if (Math.hypot(player.x, player.y) > TUNING.arena.radius - player.radius - 80) {
      if (controls.moveX * player.x > 0) controls.moveX = 0;
      if (controls.moveY * player.y > 0) controls.moveY = 0;
    }
    return controls;
  }

  bot.clearTime += dt;
  if (bot.clearTime < COLLECT_WAIT && !target) return controls;
  if (!bot.exit) bot.exit = chooseExit(game);
  const { dc, dr } = DIRECTIONS[bot.exit];
  controls.moveX = dc;
  controls.moveY = dr;
  return controls;
}
