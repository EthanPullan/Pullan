import { rgba } from '../render/color.js';

// Bubble count in the top-right corner. Drawn in logical screen units.
export function drawHud(ctx, game, view, palette) {
  const text = String(game.player.bubbles);
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
  ctx.restore();
}
