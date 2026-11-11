import { rgba } from './color.js';

// Hull and guns are each drawn once into an offscreen canvas and reused.
// The cache is keyed by pixel density, so call clearSpriteCache on resize.
const cache = new Map();

export function clearSpriteCache() {
  cache.clear();
}

function makeCanvas(size) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function buildSprite(circles, color, pxPerUnit) {
  const pad = 10;
  const extent = Math.max(...circles.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)) + c.r)) + pad;
  const size = Math.ceil(extent * 2 * pxPerUnit);
  const canvas = makeCanvas(size);
  const g = canvas.getContext('2d');
  g.scale(pxPerUnit, pxPerUnit);
  g.translate(extent, extent);

  const outline = () => {
    g.beginPath();
    for (const c of circles) {
      g.moveTo(c.x + c.r, c.y);
      g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    }
  };

  // Soft outer glow.
  g.shadowColor = color;
  g.shadowBlur = 14 * pxPerUnit;
  g.fillStyle = rgba(color, 0.15);
  outline();
  g.fill();
  g.shadowBlur = 0;

  // Bubble bodies: faint centres, bright rims.
  for (const c of circles) {
    const grad = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    grad.addColorStop(0, rgba(color, 0.08));
    grad.addColorStop(0.7, rgba(color, 0.25));
    grad.addColorStop(1, rgba(color, 0.7));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    g.fill();
  }
  g.lineWidth = 1.4;
  g.strokeStyle = rgba(color, 0.95);
  outline();
  g.stroke();

  return { canvas, extent };
}

function getSprites(cls, color, pxPerUnit) {
  const key = `${cls.id}|${color}|${pxPerUnit}`;
  let sprites = cache.get(key);
  if (!sprites) {
    sprites = {
      hull: buildSprite(cls.hull, color, pxPerUnit),
      guns: cls.guns.length ? buildSprite(cls.guns, color, pxPerUnit) : null,
    };
    cache.set(key, sprites);
  }
  return sprites;
}

function drawSprite(ctx, sprite, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const e = sprite.extent;
  ctx.drawImage(sprite.canvas, -e, -e, e * 2, e * 2);
  ctx.restore();
}

// Highlights are drawn live, not baked in, so they stay at the upper left
// as the tank turns, as if lit from one direction.
function drawHighlights(ctx, circles, x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  ctx.beginPath();
  for (const c of circles) {
    if (c.r < 5) continue;
    const hx = x + cos * c.x - sin * c.y - c.r * 0.38;
    const hy = y + sin * c.x + cos * c.y - c.r * 0.42;
    ctx.moveTo(hx + c.r * 0.22, hy);
    ctx.ellipse(hx, hy, c.r * 0.22, c.r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();
}

export function drawTank(ctx, cls, color, x, y, heading, aim, pxPerUnit) {
  const sprites = getSprites(cls, color, pxPerUnit);
  drawSprite(ctx, sprites.hull, x, y, heading);
  if (sprites.guns) drawSprite(ctx, sprites.guns, x, y, aim);
  drawHighlights(ctx, cls.hull, x, y, heading);
}
