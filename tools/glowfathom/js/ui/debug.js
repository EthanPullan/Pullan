// F3 overlay: frame rate, entity counts, seed and collision circles.

export function createDebug() {
  return { enabled: false, fps: 0, frames: 0, elapsed: 0 };
}

export function tickFps(debug, elapsedSeconds) {
  debug.frames++;
  debug.elapsed += elapsedSeconds;
  if (debug.elapsed >= 0.5) {
    debug.fps = debug.frames / debug.elapsed;
    debug.frames = 0;
    debug.elapsed = 0;
  }
}

export function drawDebugText(ctx, lines) {
  ctx.save();
  ctx.font = '13px ui-monospace, Menlo, Consolas, monospace';
  ctx.textBaseline = 'top';
  const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(8, 8, width, lines.length * 17 + 10);
  ctx.fillStyle = '#d8f6ff';
  lines.forEach((line, i) => ctx.fillText(line, 16, 14 + i * 17));
  ctx.restore();
}

export function drawCollisionCircle(ctx, x, y, r) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
