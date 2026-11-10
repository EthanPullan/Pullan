import { rgba } from '../render/color.js';
import { TUNING } from '../data/tuning.js';
import { cellKey, difficultyOf } from '../world.js';

const CELL = 14;
const GAP = 3;

// The arena grid in the bottom-right corner. Redder cells are harder;
// outlined cells have been visited; the bright cell is where you are, with
// a dot for your position inside it. Drawn in logical screen units.
export function drawMinimap(ctx, game, view, palette) {
  const { world, cell, player } = game;
  const span = world.size * CELL + (world.size - 1) * GAP;
  const x0 = view.w - 24 - span;
  const y0 = view.h - 24 - span;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.roundRect(x0 - 10, y0 - 10, span + 20, span + 20, 10);
  ctx.fill();

  for (let row = 0; row < world.size; row++) {
    for (let col = 0; col < world.size; col++) {
      const x = x0 + col * (CELL + GAP);
      const y = y0 + row * (CELL + GAP);
      const here = col === cell.col && row === cell.row;
      const visited = world.visited.has(cellKey({ col, row }));
      const difficulty = difficultyOf(world, { col, row });
      ctx.fillStyle = here ? rgba(palette.player, 0.55) : rgba(palette.danger, 0.06 + difficulty * 0.09);
      ctx.fillRect(x, y, CELL, CELL);
      if (visited || here) {
        ctx.strokeStyle = rgba(palette.player, here ? 1 : 0.6);
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }
  }

  const cx = x0 + cell.col * (CELL + GAP) + CELL / 2;
  const cy = y0 + cell.row * (CELL + GAP) + CELL / 2;
  const scale = CELL / 2 / TUNING.arena.radius;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + player.x * scale, cy + player.y * scale, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
