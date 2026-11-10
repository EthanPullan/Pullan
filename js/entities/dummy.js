import { classRadius } from '../data/classes.js';

// A stationary target for testing weapons. It respawns after being
// destroyed. Replaced by real enemies in Phase 4.

export function createDummy(def, x, y) {
  return {
    def, x, y,
    radius: classRadius(def),
    health: def.health,
    alive: true,
    flash: 0,
    respawn: 0,
  };
}

export function updateDummy(dummy, dt) {
  dummy.flash = Math.max(0, dummy.flash - dt);
  if (!dummy.alive) {
    dummy.respawn -= dt;
    if (dummy.respawn <= 0) {
      dummy.alive = true;
      dummy.health = dummy.def.health;
    }
  }
}

// Returns true if this hit destroyed the dummy.
export function damageDummy(dummy, amount, flashSeconds) {
  dummy.health -= amount;
  dummy.flash = flashSeconds;
  if (dummy.health > 0) return false;
  dummy.alive = false;
  dummy.respawn = dummy.def.respawnSeconds;
  return true;
}
