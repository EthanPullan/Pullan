// Bubble rules. No browser references, so these can be tested in Node.

// A hit removes bubbles equal to its damage (never more than the player
// has). Half of those, rounded down, spill out as collectable pickups.
export function takeDamage(bubbles, damage) {
  const lost = Math.min(bubbles, Math.max(0, Math.round(damage)));
  return { lost, spilled: Math.floor(lost / 2) };
}
