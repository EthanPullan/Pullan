// Enemy and boss attacks. No browser references, so this can be tested in Node.
//
// An attack is data: { type, windup, interval, ... }. Each enemy cycles
// through its list. An attack first winds up for `windup` seconds (drawn
// as a warning), then executes, then waits `interval` seconds before the
// next one may start.

export function createAttackState(initialDelay = 1) {
  return { index: 0, cooldown: initialDelay, active: null, windup: 0, aim: 0 };
}

// Advances the state by `dt`. `canStart(attack)` says whether the next
// attack may begin now (for example, whether the player is in range).
// Returns { kind: 'start' | 'execute', attack } when something happens,
// otherwise null.
export function updateAttacks(state, attacks, canStart, dt) {
  if (state.active) {
    state.windup -= dt;
    if (state.windup > 0) return null;
    const attack = state.active;
    state.active = null;
    state.cooldown = attack.interval;
    return { kind: 'execute', attack };
  }
  state.cooldown -= dt;
  if (state.cooldown > 0 || !attacks.length) return null;
  const attack = attacks[state.index % attacks.length];
  if (!canStart(attack)) return null;
  state.index = (state.index + 1) % attacks.length;
  state.active = attack;
  state.windup = attack.windup;
  return { kind: 'start', attack };
}

// How far through its wind-up the current attack is, from 0 to 1.
export function windupProgress(state) {
  if (!state.active) return 0;
  return 1 - Math.max(0, state.windup) / state.active.windup;
}

// Bosses have phases: [{ attacks }, { below: 0.5, attacks }, ...]. A phase
// applies once health falls to its `below` fraction or lower; the first
// phase applies from full health.
export function phaseFor(phases, healthFraction) {
  let index = 0;
  for (let i = 1; i < phases.length; i++) {
    if (healthFraction <= phases[i].below) index = i;
  }
  return index;
}
