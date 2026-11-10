// Every tunable number lives here. Units: world units, seconds, radians.

export const TUNING = {
  sim: {
    stepHz: 60,
    maxFrameSeconds: 0.25,
  },
  view: {
    logicalHeight: 720,
  },
  player: {
    accel: 900, // units/s² from rest
    topSpeed: 220, // units/s
    releaseDrag: 2.5, // how fast you slow down with no keys held; lower glides further
    hullTurnRate: 6, // rad/s the hull turns toward the direction of travel
    hullTurnMinSpeed: 15, // below this speed the hull holds its heading
  },
  camera: {
    follow: 6, // higher follows more tightly
    lead: 0.22, // share of the cursor's distance from screen centre the camera shifts by
    maxLead: 150,
  },
  arena: {
    radius: 1000,
    edgeBounce: 0.3, // share of outward speed returned when hitting the membrane
  },
  lighting: {
    playerGlowRadius: 280,
    playerGlowAlpha: 0.1,
  },
  background: {
    tileSize: 2048,
    layers: [
      { depth: 0.25, count: 110, minSize: 0.6, maxSize: 1.4, alpha: 0.22 },
      { depth: 0.5, count: 70, minSize: 1.0, maxSize: 2.0, alpha: 0.32 },
      { depth: 0.8, count: 40, minSize: 1.5, maxSize: 2.8, alpha: 0.42 },
    ],
  },
};

export const PALETTE = {
  abyss: '#030d18',
  water: '#0a2236',
  player: '#5ef2e0',
  enemy: '#ff6b9a',
  pickup: '#ffe58a',
  danger: '#ff4d2e',
  membrane: '#2fd3c7',
  speck: '#9fd8ff',
};
