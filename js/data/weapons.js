// Weapon definitions. Every class uses `starter` until Phase 5 gives each
// class its own weapon.
//   fireRate  shots per second
//   damage    per projectile
//   speed     units/s
//   spread    total cone in radians
//   count     projectiles per shot
//   lifetime  seconds before a projectile pops
//   radius    projectile size
//   recoil    units/s pushed back onto the shooter per shot
//   knockback units/s pushed onto whatever the projectile hits

export const WEAPONS = {
  starter: {
    fireRate: 4,
    damage: 1,
    speed: 520,
    spread: 0.04,
    count: 1,
    lifetime: 1.2,
    radius: 5,
    recoil: 8,
    knockback: 30,
  },
  strafer: {
    fireRate: 0.8,
    damage: 1,
    speed: 300,
    spread: 0.15,
    count: 1,
    lifetime: 2,
    radius: 6,
    recoil: 0,
    knockback: 60,
  },
};
