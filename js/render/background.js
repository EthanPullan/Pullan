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
