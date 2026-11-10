// Enemy definitions. Phase 3 has only a stationary target dummy;
// Phase 4 adds the real enemies.

const c = (x, y, r) => ({ x, y, r });

export const DUMMY = {
  id: 'dummy',
  health: 5,
  respawnSeconds: 3,
  hull: [
    c(0, 0, 16),
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return c(Math.cos(a) * 18, Math.sin(a) * 18, 6);
    }),
  ],
  guns: [],
};

export const DUMMY_POSITIONS = [
  [0, -320],
  [300, -150],
  [-300, -150],
  [220, 260],
  [-220, 260],
];
