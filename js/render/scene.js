import { TUNING, PALETTE } from '../data/tuning.js';
import { CLASSES } from '../data/classes.js';
import { lerpAngle } from '../systems/movement.js';
import { drawTank } from './tank.js';
import { drawArena, drawGlow } from './arena.js';
import { drawSpecks } from './background.js';
import { drawPops, drawProjectiles, drawPickups } from './effects.js';
import { drawCollisionCircle } from '../ui/debug.js';
import { rgba } from './color.js';

const lerp = (a, b, t) => a + (b - a) * t;

function easeOutBack(t) {
  const c1 = 1.70158;
  const u = t - 1;
  return 1 + (c1 + 1) * u * u * u + c1 * u * u;
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
export function renderScene(ctx, game, cam, view, specks, alpha, showDebug) {
  const s = view.pxPerUnit;
  const worldTransform = () => ctx.setTransform(s, 0, 0, s, (view.w / 2 - cam.x) * s, (view.h / 2 - cam.y) * s);
  const { player } = game;
  const px = lerp(player.prevX, player.x, alpha);
  const py = lerp(player.prevY, player.y, alpha);

  worldTransform();
  drawArena(ctx, TUNING.arena.radius, game.time, PALETTE);

  // Background specks are in screen space, over the water and under the tanks.
  ctx.setTransform(s, 0, 0, s, 0, 0);
  drawSpecks(ctx, specks, cam.x, cam.y, view, TUNING.background.tileSize, PALETTE.speck);

  worldTransform();
  drawGlow(ctx, px, py, TUNING.lighting.playerGlowRadius, PALETTE.player, TUNING.lighting.playerGlowAlpha);
  drawPickups(ctx, game.pickups, alpha, PALETTE.pickup, TUNING.pickups);

  for (const e of game.enemies) {
    drawTank(
      ctx, e.def, e.flash > 0 ? '#ffffff' : PALETTE.enemy,
      lerp(e.prevX, e.x, alpha), lerp(e.prevY, e.y, alpha),
      lerpAngle(e.prevHeading, e.heading, alpha), lerpAngle(e.prevAim, e.aim, alpha), s,
    );
  }

  drawProjectiles(ctx, game.enemyShots, alpha, PALETTE.danger);
  drawProjectiles(ctx, game.playerShots, alpha, PALETTE.player);
  drawPops(ctx, game.pops);

  drawDrones(ctx, player, alpha);

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
