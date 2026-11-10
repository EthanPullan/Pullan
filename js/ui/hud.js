import { rgba } from '../render/color.js';
import { CLASSES } from '../data/classes.js';
import { TUNING } from '../data/tuning.js';
import { progressScale } from '../systems/evolution.js';
import { abilityReadiness } from '../systems/abilities.js';

// Top-right: bubble count, a progress bar toward the next form with a red
// mark where you would devolve, and the ability cooldown. Drawn in logical
// screen units.
const BAR_WIDTH = 220;

export function drawHud(ctx, game, view, palette) {
  const { player } = game;
  const right = view.w - 24;
  const text = String(player.bubbles);
  ctx.save();
  ctx.font = '600 26px ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const y = 34;
  ctx.fillStyle = '#e8fbff';
  ctx.fillText(text, right, y);

  const width = ctx.measureText(text).width;
  const bx = right - width - 20;
  ctx.beginPath();
  ctx.arc(bx, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = rgba(palette.pickup, 0.3);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.pickup;
  ctx.stroke();

  const cls = CLASSES[player.classId];
  drawProgress(ctx, cls, player.bubbles, right, y + 26, palette);
  if (cls.ability) drawAbility(ctx, cls.ability, player.abilityState, right, y + 74, palette);
  drawBossBar(ctx, game, view, palette);
  ctx.restore();
}

function drawProgress(ctx, cls, bubbles, right, top, palette) {
  const scale = progressScale(cls, bubbles, TUNING.evolution);
  const left = right - BAR_WIDTH;
  ctx.font = '14px ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8fbff';
  ctx.fillText(cls.name, left, top);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(232, 251, 255, 0.65)';
  ctx.fillText(scale.next === null ? 'final form' : `next form at ${scale.next}`, right, top);

  const barY = top + 12;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(left, barY, BAR_WIDTH, 8);
  ctx.fillStyle = palette.pickup;
  ctx.fillRect(left, barY, BAR_WIDTH * scale.fill, 8);
  if (scale.devolveMark !== null) {
    ctx.fillStyle = palette.danger;
    ctx.fillRect(left + BAR_WIDTH * scale.devolveMark - 1, barY - 3, 2, 14);
  }
}

// The right-click ability: its name and a bar that fills as it recharges.
function drawAbility(ctx, ability, state, right, y, palette) {
  const ready = abilityReadiness(state, ability);
  const width = 110;
  const left = right - width;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(left, y - 4, width, 8);
  ctx.fillStyle = ready >= 1 ? palette.player : rgba(palette.player, 0.45);
  ctx.fillRect(left, y - 4, width * ready, 8);
  ctx.textAlign = 'right';
  ctx.fillStyle = ready >= 1 ? '#e8fbff' : 'rgba(232, 251, 255, 0.6)';
  ctx.fillText(`Right click · ${ability.name}`, left - 10, y);
}

// Name and health of a boss in this arena, across the top of the screen.
function drawBossBar(ctx, game, view, palette) {
  const boss = game.enemies.find((e) => e.def.boss && e.alive);
  if (!boss) return;
  const width = Math.min(420, view.w * 0.5);
  const left = (view.w - width) / 2;
  const y = 30;
  ctx.textAlign = 'center';
  ctx.font = '600 16px ui-rounded, system-ui, sans-serif';
  ctx.fillStyle = '#e8fbff';
  ctx.fillText(boss.def.name, view.w / 2, y - 12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(left, y, width, 8);
  ctx.fillStyle = palette.danger;
  ctx.fillRect(left, y, width * Math.max(0, boss.health / boss.def.health), 8);
  // Mark where the second phase begins.
  for (const phase of boss.def.phases.slice(1)) {
    ctx.fillStyle = '#e8fbff';
    ctx.fillRect(left + width * phase.below - 1, y - 3, 2, 14);
  }
}
