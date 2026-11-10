import { rgba } from '../render/color.js';
import { CLASSES } from '../data/classes.js';
import { TUNING } from '../data/tuning.js';
import { devolveBelow } from '../systems/evolution.js';
import { abilityReadiness } from '../systems/abilities.js';

// Bubble count and current form in the top-right corner.
// Drawn in logical screen units. Phase 8 replaces the text with a bar.
export function drawHud(ctx, game, view, palette) {
  const { player } = game;
  const text = String(player.bubbles);
  ctx.save();
  ctx.font = '600 26px ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const x = view.w - 24;
  const y = 34;
  ctx.fillStyle = '#e8fbff';
  ctx.fillText(text, x, y);

  const width = ctx.measureText(text).width;
  const bx = x - width - 20;
  ctx.beginPath();
  ctx.arc(bx, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = rgba(palette.pickup, 0.3);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.pickup;
  ctx.stroke();

  const cls = CLASSES[player.classId];
  const rules = TUNING.evolution;
  const parts = [cls.name];
  const up = rules.thresholds[cls.tier + 1];
  if (up !== undefined) parts.push(`evolves at ${up}`);
  const down = devolveBelow(cls, rules);
  if (down !== null) parts.push(`devolves below ${down}`);
  ctx.font = '14px ui-rounded, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232, 251, 255, 0.7)';
  ctx.fillText(parts.join('  ·  '), x, y + 28);

  if (cls.ability) drawAbility(ctx, cls.ability, player.abilityState, x, y + 52, palette);
  drawBossBar(ctx, game, view, palette);
  ctx.restore();
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
