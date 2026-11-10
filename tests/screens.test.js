import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextScreen, SCREENS, ACTIONS } from '../js/screens.js';

// Every move that should be possible, and nothing else.
const ALLOWED = [
  ['title', 'start', 'playing'],
  ['playing', 'pause', 'paused'],
  ['playing', 'choose', 'choosing'],
  ['playing', 'win', 'victory'],
  ['paused', 'resume', 'playing'],
  ['paused', 'restart', 'playing'],
  ['paused', 'tree', 'tree'],
  ['tree', 'back', 'paused'],
  ['choosing', 'pick', 'playing'],
  ['victory', 'continue', 'playing'],
];

test('there are six screens', () => {
  assert.deepEqual(SCREENS.sort(), ['choosing', 'paused', 'playing', 'title', 'tree', 'victory']);
});

test('every allowed move works', () => {
  for (const [from, action, to] of ALLOWED) assert.equal(nextScreen(from, action), to, `${from} --${action}-->`);
});

test('every other move is refused', () => {
  const allowed = new Set(ALLOWED.map(([from, action]) => `${from}/${action}`));
  let refused = 0;
  for (const screen of SCREENS) {
    for (const action of ACTIONS) {
      if (allowed.has(`${screen}/${action}`)) continue;
      assert.equal(nextScreen(screen, action), null, `${screen} --${action}--> should be refused`);
      refused++;
    }
  }
  assert.equal(refused, SCREENS.length * ACTIONS.length - ALLOWED.length);
});

test('unknown screens and actions are refused', () => {
  assert.equal(nextScreen('nowhere', 'start'), null);
  assert.equal(nextScreen('title', 'fly'), null);
});

test('every screen can be left, and play can always be reached again', () => {
  for (const screen of SCREENS) {
    const seen = new Set([screen]);
    const queue = [screen];
    while (queue.length) {
      const s = queue.shift();
      for (const action of ACTIONS) {
        const to = nextScreen(s, action);
        if (to && !seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      }
    }
    assert.ok(seen.size > 1, `${screen} has a way out`);
    assert.ok(seen.has('playing'), `${screen} leads back to play`);
  }
});
