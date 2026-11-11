// Saving and loading a run, and the player's settings. No browser
// references, so this can be tested in Node; main.js does the storing.
//
// A save is a plain object with a version number. Loading checks every
// field and returns null for anything corrupt, outdated or inconsistent,
// so a bad save starts a new game instead of crashing.

import { CLASSES } from './data/classes.js';
import { BOSSES } from './data/enemies.js';
import { cellKey } from './world.js';

export const SAVE_VERSION = 1;

export function serialize(game) {
  return {
    version: SAVE_VERSION,
    classId: game.player.classId,
    path: { ...game.path },
    bubbles: game.player.bubbles,
    cell: { col: game.cell.col, row: game.cell.row },
    history: game.history.map((c) => ({ col: c.col, row: c.row })),
    visited: [...game.world.visited],
    defeated: [...game.defeated],
    unlocked: [...game.unlocked],
    kills: game.kills,
    victoryShown: game.victoryShown,
  };
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCount = (v) => Number.isInteger(v) && v >= 0;

function validCell(c, size) {
  return isObject(c) && Number.isInteger(c.col) && Number.isInteger(c.row)
    && c.col >= 0 && c.row >= 0 && c.col < size && c.row < size;
}

// Returns a checked copy of `data`, or null if anything is wrong.
// `worldSize` is the grid's width in arenas.
export function deserialize(data, worldSize) {
  if (!isObject(data) || data.version !== SAVE_VERSION) return null;
  const cls = CLASSES[data.classId];
  if (!cls) return null;
  if (!isCount(data.bubbles) || !isCount(data.kills) || typeof data.victoryShown !== 'boolean') return null;
  if (!validCell(data.cell, worldSize)) return null;
  if (!Array.isArray(data.history) || !data.history.every((c) => validCell(c, worldSize))) return null;

  // The path must name real classes at their own tiers, each the child of
  // the one before, and must lead to the current class.
  if (!isObject(data.path)) return null;
  for (const [tier, id] of Object.entries(data.path)) {
    const c = CLASSES[id];
    if (!c || String(c.tier) !== tier) return null;
    if (c.tier > 2 && data.path[c.tier - 1] !== c.parent) return null;
  }
  if (cls.tier > 1 && data.path[cls.tier] !== cls.id) return null;

  const strings = (a) => Array.isArray(a) && a.every((v) => typeof v === 'string');
  if (!strings(data.visited) || !strings(data.defeated) || !strings(data.unlocked)) return null;
  const cells = new Set();
  for (let col = 0; col < worldSize; col++) for (let row = 0; row < worldSize; row++) cells.add(cellKey({ col, row }));
  if (!data.visited.every((k) => cells.has(k))) return null;
  const bossIds = new Set(BOSSES.map((b) => b.id));
  if (!data.defeated.every((id) => bossIds.has(id))) return null;
  if (!data.unlocked.every((id) => CLASSES[id]) || !data.unlocked.includes(cls.id)) return null;

  return {
    version: data.version,
    classId: data.classId,
    path: { ...data.path },
    bubbles: data.bubbles,
    cell: { col: data.cell.col, row: data.cell.row },
    history: data.history.map((c) => ({ col: c.col, row: c.row })),
    visited: [...data.visited],
    defeated: [...data.defeated],
    unlocked: [...data.unlocked],
    kills: data.kills,
    victoryShown: data.victoryShown,
  };
}

// Reads stored text. Returns { save } on success, { save: null } when there
// is nothing stored, or { save: null, corrupt: true } when what is stored
// can't be used.
export function parseSave(text, worldSize) {
  if (text === null || text === undefined) return { save: null };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { save: null, corrupt: true };
  }
  const save = deserialize(data, worldSize);
  return save ? { save } : { save: null, corrupt: true };
}

// --- Settings --------------------------------------------------------------

export const DEFAULT_SETTINGS = { volume: 0.8, screenShake: true };

// Stored settings, with anything missing or invalid replaced by a default.
export function parseSettings(text) {
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  if (!isObject(data)) data = {};
  const volume = typeof data.volume === 'number' && data.volume >= 0 && data.volume <= 1
    ? data.volume : DEFAULT_SETTINGS.volume;
  const screenShake = typeof data.screenShake === 'boolean' ? data.screenShake : DEFAULT_SETTINGS.screenShake;
  return { volume, screenShake };
}
