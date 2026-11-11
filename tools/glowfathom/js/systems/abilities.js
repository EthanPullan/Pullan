// The right-click ability of tier-3 classes. No browser references.

export function createAbilityState() {
  return { cooldown: 0 };
}

// Counts the cooldown down and returns true when the ability fires: the
// button is held, the class has an ability, and the cooldown has run out.
export function updateAbility(state, ability, held, dt) {
  state.cooldown = Math.max(0, state.cooldown - dt);
  if (!ability || !held || state.cooldown > 0) return false;
  state.cooldown = ability.cooldown;
  return true;
}

// From 0 (just used) to 1 (ready).
export function abilityReadiness(state, ability) {
  if (!ability) return 0;
  return 1 - state.cooldown / ability.cooldown;
}
