// Evolution rules. No browser references, so these can be tested in Node.
//
// `rules.thresholds[tier]` is the bubble total that reaches a tier.
// A tank devolves when its total falls below `devolveFraction` of its own
// tier's threshold. The gap between the two stops it flickering between
// forms when its total hovers near a threshold.
//
// `path[tier]` remembers the class chosen at each tier, so re-evolving after
// a devolution restores it without asking again.

export function childrenOf(classId, classList) {
  return classList.filter((c) => c.parent === classId).map((c) => c.id);
}

// Returns what should happen now, one step at a time:
//   { type: 'evolve', classId }   a remembered choice, applied at once
//   { type: 'choose', options }   the player must pick one of these ids
//   { type: 'devolve', classId }  back to the parent class
//   null                          stay as you are
export function evaluateEvolution(classId, bubbles, path, classes, classList, rules) {
  const cls = classes[classId];
  const up = rules.thresholds[cls.tier + 1];
  if (up !== undefined && bubbles >= up) {
    const remembered = path[cls.tier + 1];
    if (remembered) return { type: 'evolve', classId: remembered };
    const options = childrenOf(classId, classList);
    if (options.length) return { type: 'choose', options };
  }
  if (cls.parent && bubbles < rules.thresholds[cls.tier] * rules.devolveFraction) {
    return { type: 'devolve', classId: cls.parent };
  }
  return null;
}

// The bubble total at which the current class devolves, or null for tier 1.
export function devolveBelow(cls, rules) {
  return cls.parent ? rules.thresholds[cls.tier] * rules.devolveFraction : null;
}

// The HUD's progress bar, on a scale from 0 to the next form's threshold.
// Final forms have no next threshold, so their scale runs to 1.5 times their
// own. `fill` and `devolveMark` are fractions of the bar (mark is null for
// tier 1, which can't devolve).
export function progressScale(cls, bubbles, rules) {
  const up = rules.thresholds[cls.tier + 1];
  const max = up !== undefined ? up : rules.thresholds[cls.tier] * 1.5;
  const down = devolveBelow(cls, rules);
  return {
    max,
    next: up === undefined ? null : up,
    fill: Math.min(1, bubbles / max),
    devolveMark: down === null ? null : down / max,
  };
}
