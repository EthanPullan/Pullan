// Helpers for sketching bodies out of circles, shared by classes and enemies.

export const c = (x, y, r) => ({ x, y, r });

export function ring(count, dist, r, phase = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = phase + (i / count) * Math.PI * 2;
    return c(Math.cos(a) * dist, Math.sin(a) * dist, r);
  });
}

// A tapering line of circles along `angle`, starting `start` units from the
// centre, shifted sideways by `side`.
export function barrel(angle, start, length, r0, r1, side = 0) {
  const count = Math.max(2, Math.round(length / (r0 * 1.2)) + 1);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const d = start + t * length;
    return c(cos * d - sin * side, sin * d + cos * side, r0 + (r1 - r0) * t);
  });
}
