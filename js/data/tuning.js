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
    // Top speed, acceleration and pickup radius are per class, in classes.js.
    releaseDrag: 2.5, // how fast you slow down with no keys held; lower glides further
    hullTurnRate: 6, // rad/s the hull turns toward the direction of travel
    hullTurnMinSpeed: 15, // below this speed the hull holds its heading
    invulnSeconds: 1, // after taking a hit
  },
  camera: {
    follow: 6, // higher follows more tightly
    lead: 0.22, // share of the cursor's distance from screen centre the camera shifts by
    maxLead: 150,
  },
  combat: {
    projectilePoolSize: 512,
    enemyShotPoolSize: 256,
    contactKnockback: 260, // units/s a touching enemy is thrown back
    contactStunSeconds: 0.5, // it drifts without steering for this long
    popPoolSize: 256,
    hitFlashSeconds: 0.1,
    shotPopSeconds: 0.18,
    deathPopSeconds: 0.35,
    deathPopScale: 1.4, // death ring size relative to the target's radius
  },
  pickups: {
    poolSize: 512,
    radius: 5,
    drag: 3,
    dropSpeedMin: 60, // scatter speed when an enemy bursts
    dropSpeedMax: 160,
    spillSpeedMin: 280, // scatter speed when the player is hit, flung past
    spillSpeedMax: 420, // the pickup radius so they must be chased
    spillCollectDelay: 1, // seconds before spilled bubbles can be collected
    magnetAccel: 1800,
    magnetMaxSpeed: 520,
  },
  spawning: {
    minDistanceFromPlayer: 450,
    edgeMargin: 80,
  },
  steering: {
    separationPadding: 14, // enemies start pushing apart this far before touching
    separationWeight: 1.6,
    edgeMargin: 120, // enemies turn back this far inside the membrane
  },
  evolution: {
    thresholds: { 1: 0, 2: 20, 3: 60 }, // bubbles needed to reach each tier
    devolveFraction: 0.8, // devolve below this share of your tier's threshold
    morphSeconds: 0.6, // length of the transformation animation
    morphInvulnSeconds: 1,
  },
  arena: {
    radius: 1000,
    edgeBounce: 0.3, // share of outward speed returned when hitting the membrane
  },
  world: {
    size: 7, // arenas per side
    transitionSeconds: 0.4, // fade between arenas; the game pauses meanwhile
    entryInset: 120, // how far inside the membrane you appear in the next arena
    historyLimit: 64, // arenas remembered for ejection
    solidBounce: 0.6, // share of outward speed returned by an outer, solid membrane
    ejectInvulnSeconds: 2, // immunity after being ejected at 0 bubbles
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
  wall: '#6f8597', // solid outer membranes
  speck: '#9fd8ff',
};
