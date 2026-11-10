import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, updateGame, loadGame } from '../js/game.js';
import { createRng } from '../js/rng.js';
import { TUNING } from '../js/data/tuning.js';
import {
  serialize, deserialize, parseSave, parseSettings, SAVE_VERSION, DEFAULT_SETTINGS,
} from '../js/save.js';

const SIZE = TUNING.world.size;
const idle = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, ability: false };

// A game partway through a run: Halo, two bosses down, several arenas seen.
function midRun() {
  const game = createGame(createRng(1));
  game.path = { 2: 'brood', 3: 'halo' };
  game.player.bubbles = 75;
  updateGame(game, idle, 1 / 60); // evolves twice through the remembered path
  updateGame(game, idle, 1 / 60);
  game.cell = { col: 1, row: 5 };
  game.history = [{ col: 3, row: 3 }, { col: 2, row: 4 }];
  for (const k of ['2,4', '1,5', '0,0']) game.world.visited.add(k);
  game.defeated.add('bloom');
  game.kills = 42;
  return game;
}

test('a save holds the class path, bubbles, arena, visited arenas and boss kills', () => {
  const save = serialize(midRun());
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.classId, 'halo');
  assert.deepEqual(save.path, { 2: 'brood', 3: 'halo' });
  assert.equal(save.bubbles, 75);
  assert.deepEqual(save.cell, { col: 1, row: 5 });
  assert.ok(save.visited.includes('0,0'));
  assert.deepEqual(save.defeated, ['bloom']);
});

test('saving then loading returns the same state', () => {
  const before = serialize(midRun());
  const text = JSON.stringify(before);
  const { save } = parseSave(text, SIZE);
  assert.ok(save);
  const game = createGame(createRng(99));
  loadGame(game, save);
  assert.deepEqual(serialize(game), before);
  assert.deepEqual([game.player.x, game.player.y], [0, 0], 'arrives at the arena centre');
  assert.ok(game.enemies.length > 0, 'the arena is populated');
  assert.equal(game.player.drones.length, 4, 'Halo has its drones');
});

test('a loaded game marks itself due for saving after arena changes', () => {
  const game = createGame(createRng(1));
  game.saveDue = false;
  loadGame(game, deserialize(serialize(midRun()), SIZE));
  assert.equal(game.saveDue, true);
});

test('nothing stored means no save, not a corrupt one', () => {
  assert.deepEqual(parseSave(null, SIZE), { save: null });
});

test('corrupt or outdated saves are rejected', () => {
  const good = serialize(midRun());
  const bad = {
    'not JSON': '{oops',
    'JSON null': 'null',
    'a number': '7',
    'an array': '[]',
    'old version': { ...good, version: 0 },
    'future version': { ...good, version: SAVE_VERSION + 1 },
    'unknown class': { ...good, classId: 'kraken' },
    'negative bubbles': { ...good, bubbles: -3 },
    'fractional bubbles': { ...good, bubbles: 2.5 },
    'bubbles as text': { ...good, bubbles: '75' },
    'arena off the grid': { ...good, cell: { col: 7, row: 0 } },
    'arena missing': { ...good, cell: undefined },
    'bad history': { ...good, history: [{ col: -1, row: 0 }] },
    'path at the wrong tier': { ...good, path: { 2: 'halo', 3: 'halo' } },
    'path through the wrong parent': { ...good, path: { 2: 'skitter', 3: 'halo' } },
    'path not reaching the class': { ...good, path: { 2: 'brood', 3: 'shoal' } },
    'unknown boss': { ...good, defeated: ['kraken'] },
    'visited off the grid': { ...good, visited: ['9,9'] },
    'unlocked missing the class': { ...good, unlocked: ['mote'] },
    'missing kills': { ...good, kills: undefined },
  };
  for (const [label, data] of Object.entries(bad)) {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const result = parseSave(text, SIZE);
    assert.equal(result.save, null, label);
    assert.equal(result.corrupt, true, label);
  }
});

test('settings fall back to defaults when missing or invalid', () => {
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('{oops'), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('{"volume": 0.3, "screenShake": false}'), { volume: 0.3, screenShake: false });
  assert.deepEqual(parseSettings('{"volume": 4, "screenShake": "no"}'), DEFAULT_SETTINGS);
});
