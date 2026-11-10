// Weapon definitions, one per class plus enemy weapons.
//   fireRate      shots per second
//   damage        per projectile
//   speed         units/s
//   spread        total cone in radians; several projectiles fan across it
//   count         projectiles per shot
//   width         sideways spacing between parallel projectiles (optional)
//   lifetime      seconds before a projectile pops
//   radius        projectile size
//   recoil        units/s pushed back onto the shooter per shot
//   knockback     units/s pushed onto whatever the projectile hits
// Optional special behaviour:
//   turnRate, homingRange   seeks the nearest target within range (rad/s)
//   pierce                  extra targets it passes through before popping
//   explodeRadius, explodeDamage   bursts on impact, hurting everything near

export const WEAPONS = {
  // Tier 1
  starter: { fireRate: 4, damage: 1, speed: 520, spread: 0.04, count: 1, lifetime: 1.2, radius: 5, recoil: 8, knockback: 30 },

  // Rapid branch
  twin: { fireRate: 4.5, damage: 1, speed: 600, spread: 0.03, count: 2, width: 14, lifetime: 1.0, radius: 4, recoil: 5, knockback: 20 },
  spray: { fireRate: 4, damage: 1, speed: 540, spread: 0.9, count: 5, lifetime: 0.75, radius: 4, recoil: 8, knockback: 20 },
  stream: { fireRate: 14, damage: 1, speed: 760, spread: 0.06, count: 1, lifetime: 0.9, radius: 3.5, recoil: 2, knockback: 10 },

  // Heavy branch
  cannon: { fireRate: 1.8, damage: 5, speed: 480, spread: 0, count: 1, lifetime: 1.4, radius: 9, recoil: 45, knockback: 160 },
  shell: {
    fireRate: 1.4, damage: 5, speed: 420, spread: 0, count: 1, lifetime: 1.3, radius: 10, recoil: 55, knockback: 120,
    explodeRadius: 90, explodeDamage: 4,
  },
  harpoon: {
    fireRate: 1.8, damage: 7, speed: 820, spread: 0, count: 1, lifetime: 1.1, radius: 6, recoil: 45, knockback: 140,
    pierce: 4,
  },

  // Swarm branch
  seeker: {
    fireRate: 4, damage: 2, speed: 320, spread: 0.3, count: 1, lifetime: 2.4, radius: 6, recoil: 4, knockback: 30,
    turnRate: 3.5, homingRange: 450,
  },
  swarm: {
    fireRate: 4.3, damage: 1, speed: 300, spread: 0.9, count: 3, lifetime: 2.8, radius: 5, recoil: 4, knockback: 20,
    turnRate: 4, homingRange: 500,
  },
  halo: { fireRate: 3, damage: 2, speed: 520, spread: 0.03, count: 1, lifetime: 1.1, radius: 5, recoil: 6, knockback: 40 },

  // Right-click abilities (see `ability` in classes.js)
  burst: {
    fireRate: 1, damage: 2, speed: 500, spread: (Math.PI * 2 * 15) / 16, count: 16, lifetime: 0.8, radius: 5,
    recoil: 0, knockback: 60,
  },
  lance: {
    fireRate: 1, damage: 8, speed: 1200, spread: 0, count: 1, lifetime: 1, radius: 8, recoil: 120, knockback: 200,
    pierce: 20,
  },
  swarmBurst: {
    fireRate: 1, damage: 1, speed: 280, spread: (Math.PI * 2 * 11) / 12, count: 12, lifetime: 3, radius: 5,
    recoil: 0, knockback: 20, turnRate: 4.5, homingRange: 500,
  },

  // Enemies. They fire through attacks in enemies.js, so fireRate is unused.
  strafer: { fireRate: 1, damage: 1, speed: 300, spread: 0.15, count: 1, lifetime: 2, radius: 6, recoil: 0, knockback: 60 },
  sniper: { fireRate: 1, damage: 3, speed: 900, spread: 0, count: 1, lifetime: 1.2, radius: 5, recoil: 0, knockback: 150 },
  bloomSpore: {
    fireRate: 1, damage: 1, speed: 220, spread: (Math.PI * 2 * 15) / 16, count: 16, lifetime: 4, radius: 7,
    recoil: 0, knockback: 60,
  },
  bloomSporeDense: {
    fireRate: 1, damage: 1, speed: 240, spread: (Math.PI * 2 * 19) / 20, count: 20, lifetime: 4, radius: 7,
    recoil: 0, knockback: 60,
  },
  wardenBolt: {
    fireRate: 1, damage: 2, speed: 520, spread: 0.3, count: 3, lifetime: 2, radius: 7, recoil: 0, knockback: 100,
  },
};
