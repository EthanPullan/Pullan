// Tank classes: names, tree position and body sketches.
// Coordinates are in tank-local units with +x pointing forward.
// `hull` turns with the direction of travel; `guns` turns toward the cursor.
// Stats and weapons are added in Phase 5.

const c = (x, y, r) => ({ x, y, r });

function ring(count, dist, r, phase = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = phase + (i / count) * Math.PI * 2;
    return c(Math.cos(a) * dist, Math.sin(a) * dist, r);
  });
}

// A tapering line of circles along `angle`, starting `start` units from the
// centre, shifted sideways by `side`.
function barrel(angle, start, length, r0, r1, side = 0) {
  const count = Math.max(2, Math.round(length / (r0 * 1.2)) + 1);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const d = start + t * length;
    return c(cos * d - sin * side, sin * d + cos * side, r0 + (r1 - r0) * t);
  });
}

export const START_CLASS = 'mote';

export const CLASS_LIST = [
  {
    id: 'mote', name: 'Mote', tier: 1, branch: null, parent: null,
    blurb: 'A newborn spark. One small gun.',
    hull: [c(0, 0, 16), c(-15, -11, 6), c(-15, 11, 6), c(-22, 0, 4)],
    guns: [c(0, 0, 7), ...barrel(0, 10, 14, 5, 4)],
  },

  // Rapid branch
  {
    id: 'skitter', name: 'Skitter', tier: 2, branch: 'rapid', parent: 'mote',
    blurb: 'Quick and light. Twin guns.',
    hull: [c(4, 0, 14), c(-14, 0, 10), c(-27, 0, 6), c(-36, 0, 3.5), c(8, -15, 6), c(8, 15, 6)],
    guns: [c(0, 0, 6), ...barrel(0, 8, 16, 4, 3.5, -7), ...barrel(0, 8, 16, 4, 3.5, 7)],
  },
  {
    id: 'spindrift', name: 'Spindrift', tier: 3, branch: 'rapid', parent: 'skitter',
    blurb: 'Sprays a wide fan of shots.',
    hull: [c(2, 0, 16), c(-16, 0, 11), c(-30, 0, 7), c(6, -19, 8), c(6, 19, 8), c(-8, -26, 5), c(-8, 26, 5)],
    guns: [
      c(0, 0, 7),
      ...barrel(0, 9, 18, 4.5, 3.5),
      ...barrel(-0.4, 9, 15, 4, 3), ...barrel(0.4, 9, 15, 4, 3),
      ...barrel(-0.8, 8, 12, 3.5, 3), ...barrel(0.8, 8, 12, 3.5, 3),
    ],
  },
  {
    id: 'needlejet', name: 'Needlejet', tier: 3, branch: 'rapid', parent: 'skitter',
    blurb: 'A tight, relentless stream.',
    hull: [c(6, 0, 12), c(-10, 0, 11), c(-24, 0, 8), c(-36, 0, 5), c(-45, 0, 3), c(10, -13, 5), c(10, 13, 5)],
    guns: [c(0, 0, 6), ...barrel(0, 8, 34, 4, 2.5)],
  },

  // Heavy branch
  {
    id: 'barnacle', name: 'Barnacle', tier: 2, branch: 'heavy', parent: 'mote',
    blurb: 'Slow and sturdy. One big cannon.',
    hull: [c(0, 0, 26), ...ring(8, 27, 7, Math.PI / 8)],
    guns: [c(0, 0, 11), ...barrel(0, 14, 18, 8, 7)],
  },
  {
    id: 'depthcharge', name: 'Depthcharge', tier: 3, branch: 'heavy', parent: 'barnacle',
    blurb: 'Shells that burst on impact.',
    hull: [c(0, 0, 28), ...ring(10, 30, 7)],
    guns: [c(0, 0, 12), ...barrel(0, 14, 16, 7, 6), c(36, 0, 10)],
  },
  {
    id: 'harpoon', name: 'Harpoon', tier: 3, branch: 'heavy', parent: 'barnacle',
    blurb: 'Shots that pierce straight through.',
    hull: [c(0, 0, 25), ...ring(6, 26, 8, Math.PI / 6), c(-34, 0, 9)],
    guns: [c(0, 0, 10), ...barrel(0, 12, 42, 6, 3.5)],
  },

  // Swarm branch
  {
    id: 'brood', name: 'Brood', tier: 2, branch: 'swarm', parent: 'mote',
    blurb: 'Launches small seekers from its pods.',
    hull: [c(0, 0, 18), c(-6, -20, 9), c(-6, 20, 9), c(-24, 0, 9), c(-20, -14, 5), c(-20, 14, 5)],
    guns: [c(0, 0, 8), ...barrel(0, 10, 12, 6, 5)],
  },
  {
    id: 'shoal', name: 'Shoal', tier: 3, branch: 'swarm', parent: 'brood',
    blurb: 'Floods the water with weak seekers.',
    hull: [c(0, 0, 19), ...ring(7, 25, 7.5, Math.PI / 7)],
    guns: [c(0, 0, 8), ...barrel(0, 10, 10, 6, 5), ...barrel(-0.5, 10, 8, 4, 3.5), ...barrel(0.5, 10, 8, 4, 3.5)],
  },
  {
    id: 'halo', name: 'Halo', tier: 3, branch: 'swarm', parent: 'brood',
    blurb: 'Circled by orbiting drones.',
    hull: [c(0, 0, 20), ...ring(12, 34, 4)],
    guns: [c(0, 0, 9), ...barrel(0, 11, 14, 6, 4.5)],
  },
];

export const CLASSES = Object.fromEntries(CLASS_LIST.map((cls) => [cls.id, cls]));

// Radius of the smallest circle around the origin that contains the hull.
export function classRadius(cls) {
  return Math.max(...cls.hull.map((p) => Math.hypot(p.x, p.y) + p.r));
}
