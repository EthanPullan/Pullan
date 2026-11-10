import { rgba } from './color.js';

// Draws the arena interior and its wobbling membrane, centred on the origin.
export function drawArena(ctx, radius, time, palette) {
  const water = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  water.addColorStop(0, rgba(palette.water, 0.9));
  water.addColorStop(1, rgba(palette.water, 0.35));
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  const points = 180;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = radius + Math.sin(a * 7 + time * 0.8) * 4 + Math.sin(a * 13 - time * 1.3) * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = rgba(palette.membrane, 0.07);
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = rgba(palette.membrane, 0.18);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = rgba(palette.membrane, 0.85);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Light given off by a creature, added on top of what is beneath it.
export function drawGlow(ctx, x, y, radius, color, alpha) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, rgba(color, alpha));
  grad.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}
