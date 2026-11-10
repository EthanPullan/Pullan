import { TUNING, PALETTE } from '../data/tuning.js';
import { CLASSES } from '../data/classes.js';
import { lerpAngle } from '../systems/movement.js';
import { drawTank } from './tank.js';
import { drawArena, drawGlow } from './arena.js';
import { drawSpecks, drawAmbient } from './background.js';
import { drawParticles, drawProjectiles, drawPickups } from './effects.js';
import { drawCollisionCircle } from '../ui/debug.js';
import { rgba } from './color.js';
import { solidSides } from '../world.js';
import { windupProgress } from '../systems/attacks.js';

const lerp = (a, b, t) => a + (b - a) * t;

function easeOutBack(t) {
  const c1 = 1.70158;
  const u = t - 1;
  return 1 + (c1 + 1) * u * u * u + c1 * u * u;
}

// Every attack winds up before it lands. While it does, a danger-coloured
// ring tightens around the enemy; locked shots and dashes also show their
// line, and blasts show their radius.
function drawWarnings(ctx, game, alpha) {
  ctx.save();
  for (const e of game.enemies) {
    const attack = e.attack.active;
    if (!attack || !e.alive) continue;
    const p = windupProgress(e.attack);
    const x = lerp(e.prevX, e.x, alpha);
    const y = lerp(e.prevY, e.y, alpha);
    ctx.strokeStyle = rgba(PALETTE.danger, 0.3 + 0.6 * p);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, e.radius + 6 + 14 * (1 - p), 0, Math.PI * 2);
    ctx.stroke();

    if (attack.lockAim || attack.type === 'dash') {
      const length = attack.line || attack.speed * attack.duration;
      const cos = Math.cos(e.attack.aim);
      const sin = Math.sin(e.attack.aim);
      ctx.strokeStyle = rgba(PALETTE.danger, 0.15 + 0.5 * p);
      ctx.lineWidth = attack.type === 'dash' ? e.radius * 2 * (0.3 + 0.4 * p) : 1.5 + 2 * p;
      ctx.beginPath();
      ctx.moveTo(x + cos * e.radius, y + sin * e.radius);
      ctx.lineTo(x + cos * (e.radius + length), y + sin * (e.radius + length));
      ctx.stroke();
    }
    if (attack.type === 'blast') {
      ctx.fillStyle = rgba(PALETTE.danger, 0.08 + 0.17 * p);
      ctx.beginPath();
      ctx.arc(x, y, attack.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function enemyColor(e) {
  if (e.flash > 0) return '#ffffff';
  // Mines turn from enemy pink to danger red once armed.
  if (e.def.armSeconds !== undefined && e.age >= e.def.armSeconds) return PALETTE.danger;
  return PALETTE.enemy;
}

function drawShield(ctx, player, x, y, time) {
  if (player.shield <= 0) return;
  ctx.save();
  ctx.strokeStyle = rgba(PALETTE.player, 0.5 + 0.3 * Math.sin(time * 12));
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, player.radius + 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDrones(ctx, player, alpha) {
  if (!player.drones.length) return;
  ctx.save();
  ctx.lineWidth = 1.5;
  for (const d of player.drones) {
    const x = lerp(d.prevX, d.x, alpha);
    const y = lerp(d.prevY, d.y, alpha);
    drawGlow(ctx, x, y, d.radius * 3, PALETTE.player, 0.25);
    ctx.beginPath();
    ctx.arc(x, y, d.radius, 0, Math.PI * 2);
    ctx.fillStyle = rgba(PALETTE.player, 0.3);
    ctx.fill();
    ctx.strokeStyle = PALETTE.player;
    ctx.stroke();
  }
  ctx.restore();
}

// Draws one frame of the world. `alpha` interpolates between the last two
// simulation steps; `cam` is the interpolated camera position.
export function renderScene(ctx, game, cam, view, backdrop, alpha, showDebug) {
  const s = view.pxPerUnit;
  const worldTransform = () => ctx.setTransform(s, 0, 0, s, (view.w / 2 - cam.x) * s, (view.h / 2 - cam.y) * s);
  const { player } = game;
  const px = lerp(player.prevX, player.x, alpha);
  const py = lerp(player.prevY, player.y, alpha);

  worldTransform();
  drawArena(ctx, TUNING.arena.radius, game.time, PALETTE, solidSides(game.world, game.cell));

  // Background specks are in screen space, over the water and under the tanks.
  ctx.setTransform(s, 0, 0, s, 0, 0);
  drawSpecks(ctx, backdrop.specks, cam.x, cam.y, view, TUNING.background.tileSize, PALETTE.speck);
  drawAmbient(ctx, backdrop.ambient, cam.x, cam.y, view, TUNING.background.tileSize, game.time, PALETTE.speck);

  worldTransform();
  drawGlow(ctx, px, py, TUNING.lighting.playerGlowRadius, PALETTE.player, TUNING.lighting.playerGlowAlpha);
  drawPickups(ctx, game.pickups, alpha, PALETTE.pickup, TUNING.pickups);

  for (const e of game.enemies) {
    drawTank(
      ctx, e.def, enemyColor(e),
      lerp(e.prevX, e.x, alpha), lerp(e.prevY, e.y, alpha),
      lerpAngle(e.prevHeading, e.heading, alpha), lerpAngle(e.prevAim, e.aim, alpha), s,
    );
  }

  drawWarnings(ctx, game, alpha);
  drawProjectiles(ctx, game.enemyShots, alpha, PALETTE.danger);
  drawProjectiles(ctx, game.playerShots, alpha, PALETTE.player);
  drawParticles(ctx, game.particles, alpha);

  drawDrones(ctx, player, alpha);
  drawShield(ctx, player, px, py, game.time);

  // Blink while recovering from a hit.
  const visible = player.blink <= 0 || Math.floor(player.blink * 15) % 2 === 0;
  if (visible) {
    // Transformation: flash white, then grow from 40% size with a slight overshoot.
    const morphSeconds = TUNING.evolution.morphSeconds;
    const t = player.morph > 0 ? 1 - player.morph / morphSeconds : 1;
    const scale = 0.4 + 0.6 * easeOutBack(t);
    const color = t < 0.25 ? '#ffffff' : PALETTE.player;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(scale, scale);
    drawTank(
      ctx, CLASSES[player.classId], color, 0, 0,
      lerpAngle(player.prevHeading, player.heading, alpha),
      lerpAngle(player.prevAim, player.aim, alpha), s,
    );
    ctx.restore();
  }

  if (showDebug) {
    drawCollisionCircle(ctx, px, py, player.radius);
    for (const d of player.drones) drawCollisionCircle(ctx, lerp(d.prevX, d.x, alpha), lerp(d.prevY, d.y, alpha), d.radius);
    for (const e of game.enemies) {
      drawCollisionCircle(ctx, lerp(e.prevX, e.x, alpha), lerp(e.prevY, e.y, alpha), e.radius);
    }
    for (const pool of [game.playerShots, game.enemyShots]) {
      for (const p of pool.items) {
        if (p.active) drawCollisionCircle(ctx, lerp(p.prevX, p.x, alpha), lerp(p.prevY, p.y, alpha), p.radius);
      }
    }
  }
}
