import { rgba } from './color.js';

// Drifting specks in the water. Each layer moves at a fraction of the
// camera's speed, so nearer layers slide past faster than distant ones.
export function createSpecks(rng, settings) {
  return settings.layers.map((layer) => ({
    ...layer,
    specks: Array.from({ length: layer.count }, () => ({
      x: rng.range(0, settings.tileSize),
      y: rng.range(0, settings.tileSize),
      r: rng.range(layer.minSize, layer.maxSize),
    })),
  }));
}

const mod = (a, n) => ((a % n) + n) % n;

// Draws in screen space; the pattern repeats every `tileSize` units.
export function drawSpecks(ctx, layers, camX, camY, view, tileSize, color) {
  for (const layer of layers) {
    const ox = camX * layer.depth;
    const oy = camY * layer.depth;
    ctx.beginPath();
    for (const s of layer.specks) {
      for (let x = mod(s.x - ox, tileSize); x < view.w + s.r; x += tileSize) {
        for (let y = mod(s.y - oy, tileSize); y < view.h + s.r; y += tileSize) {
          ctx.moveTo(x + s.r, y);
          ctx.arc(x, y, s.r, 0, Math.PI * 2);
        }
      }
    }
    ctx.fillStyle = rgba(color, layer.alpha);
    ctx.fill();
  }
}

// Larger bubbles drifting slowly upward through the water, swaying as they
// rise. Like the specks, they repeat every `tileSize` units and move with
// the camera at a fraction of its speed.
export function createAmbient(rng, settings) {
  return Array.from({ length: settings.ambientCount }, () => ({
    x: rng.range(0, settings.tileSize),
    y: rng.range(0, settings.tileSize),
    r: rng.range(2, 6),
    rise: rng.range(12, 36),
    sway: rng.range(4, 12),
    swaySpeed: rng.range(0.5, 1.4),
    phase: rng.range(0, Math.PI * 2),
    depth: rng.range(0.3, 0.7),
  }));
}

export function drawAmbient(ctx, bubbles, camX, camY, view, tileSize, time, color) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(color, 0.22);
  ctx.fillStyle = rgba(color, 0.05);
  ctx.beginPath();
  for (const b of bubbles) {
    const bx = mod(b.x + Math.sin(time * b.swaySpeed + b.phase) * b.sway - camX * b.depth, tileSize);
    const by = mod(b.y - time * b.rise - camY * b.depth, tileSize);
    for (let x = bx; x < view.w + b.r; x += tileSize) {
      for (let y = by; y < view.h + b.r; y += tileSize) {
        ctx.moveTo(x + b.r, y);
        ctx.arc(x, y, b.r, 0, Math.PI * 2);
      }
    }
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Darkens the screen's edges.
export function drawVignette(ctx, view, strength) {
  const cx = view.w / 2;
  const cy = view.h / 2;
  const outer = Math.hypot(cx, cy);
  const grad = ctx.createRadialGradient(cx, cy, outer * 0.45, cx, cy, outer);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, view.w, view.h);
}
