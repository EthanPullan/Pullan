import { rgba } from '../render/color.js';
import { CLASSES } from '../data/classes.js';
import { TUNING } from '../data/tuning.js';
import { devolveBelow } from '../systems/evolution.js';

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
  ctx.restore();
}
