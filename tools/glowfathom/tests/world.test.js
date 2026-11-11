import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld, difficultyOf, exitDirection, neighbour, solidSides, entryPosition, rosterFor,
} from '../js/world.js';
import { ENEMIES, ROSTERS } from '../js/data/enemies.js';
import { TUNING } from '../js/data/tuning.js';

const world = createWorld(7);

test('the world is 7×7 and starts in the centre', () => {
  assert.equal(TUNING.world.size, 7);
  assert.deepEqual(world.centre, { col: 3, row: 3 });
});

test('the centre has all four neighbours', () => {
  for (const d of ['east', 'west', 'north', 'south']) assert.ok(neighbour(world, world.centre, d), d);
  assert.deepEqual(neighbour(world, world.centre, 'east'), { col: 4, row: 3 });
  assert.deepEqual(neighbour(world, world.centre, 'north'), { col: 3, row: 2 });
  assert.deepEqual(solidSides(world, world.centre), []);
});

test('an edge cell is solid on its outer side only', () => {
  const west = { col: 0, row: 3 };
  assert.equal(neighbour(world, west, 'west'), null);
  assert.ok(neighbour(world, west, 'east'));
  assert.deepEqual(solidSides(world, west), ['west']);
});

test('a corner cell is solid on two sides', () => {
  assert.deepEqual(solidSides(world, { col: 0, row: 0 }).sort(), ['north', 'west']);
  assert.deepEqual(solidSides(world, { col: 6, row: 6 }).sort(), ['east', 'south']);
});

test('difficulty is the ring number: 1 cell at 0, then 8, 16 and 24', () => {
  const counts = [0, 0, 0, 0];
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 7; row++) counts[difficultyOf(world, { col, row })]++;
  }
  assert.deepEqual(counts, [1, 8, 16, 24]);
  assert.equal(difficultyOf(world, { col: 0, row: 0 }), 3);
  assert.equal(difficultyOf(world, { col: 5, row: 2 }), 2);
});

test('exit direction follows the quarter of the membrane', () => {
  assert.equal(exitDirection(1000, 100), 'east');
  assert.equal(exitDirection(-1000, -100), 'west');
  assert.equal(exitDirection(100, -1000), 'north');
  assert.equal(exitDirection(-100, 1000), 'south');
});

test('you enter on the opposite edge, mirrored, just inside', () => {
  const p = entryPosition(980, 120, 'east', 1000, 60);
  assert.ok(p.x < 0 && p.y > 0);
  assert.ok(Math.abs(Math.hypot(p.x, p.y) - 940) < 1e-9);
  const q = entryPosition(50, -985, 'north', 1000, 60);
  assert.ok(q.y > 0 && q.x > 0);
});

test('every difficulty has a roster of enemies allowed at that difficulty', () => {
  for (let d = 0; d <= 3; d++) {
    const roster = rosterFor(d, ROSTERS);
    assert.ok(Object.keys(roster).length > 0, `difficulty ${d}`);
    for (const [id, count] of Object.entries(roster)) {
      assert.ok(ENEMIES[id], `unknown enemy ${id}`);
      assert.ok(ENEMIES[id].minDifficulty <= d, `${id} at difficulty ${d}`);
      assert.ok(count > 0);
    }
  }
});
