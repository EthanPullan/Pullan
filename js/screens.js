// Which screen is showing, and which moves between screens are allowed.
// No browser references, so this can be tested in Node.
//
//   title     first screen; start begins play
//   playing   the game runs (the only screen where it does)
//   paused    Esc or leaving the tab; resume, restart, or view the class tree
//   tree      the class tree viewer; back returns to the pause menu
//   choosing  the evolution cards; picking one resumes play
//   victory   both bosses beaten; continue resumes play

export const TRANSITIONS = {
  title: { start: 'playing' },
  playing: { pause: 'paused', choose: 'choosing', win: 'victory' },
  paused: { resume: 'playing', restart: 'playing', tree: 'tree' },
  tree: { back: 'paused' },
  choosing: { pick: 'playing' },
  victory: { continue: 'playing' },
};

export const SCREENS = Object.keys(TRANSITIONS);
export const ACTIONS = [...new Set(Object.values(TRANSITIONS).flatMap((t) => Object.keys(t)))];

// The screen after `action`, or null if that action isn't allowed here.
export function nextScreen(screen, action) {
  const to = TRANSITIONS[screen] && TRANSITIONS[screen][action];
  return to || null;
}
