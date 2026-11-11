// Balance report. Run with:  node scripts/balance.js
//
// 1. Time to kill: for every form against every enemy, from the data files,
//    assuming every shot hits. Bosses include their parts.
// 2. Pacing: the real game played in Node by a scripted player (scripts/bot.js),
//    once per final form and seed, reporting when it reached tier 2, tier 3
//    and each boss, against the pacing targets.

import { createGame, updateGame } from '../js/game.js';
import { createRng } from '../js/rng.js';
import { CLASS_LIST, CLASSES } from '../js/data/classes.js';
import { WEAPONS } from '../js/data/weapons.js';
import { ENEMIES } from '../js/data/enemies.js';
import { createBot, botControls } from './bot.js';

const TARGETS = { tier2: 3, tier3: 10, firstBoss: 20 }; // minutes
const SEEDS = [1, 2, 3];
const MAX_MINUTES = 45;
const DT = 1 / 60;

// --- Time to kill ----------------------------------------------------------

// Damage per second if every shot hits. Exploding shots add their blast to
// the target; drones add their contact damage.
export function dps(cls) {
  const w = WEAPONS[cls.weapon];
  let perShot = w.count * (w.damage + (w.explodeDamage || 0));
  let total = w.fireRate * perShot;
  if (cls.drones) total += (cls.drones.count * cls.drones.damage) / cls.drones.hitCooldown;
  return total;
}

export function totalHealth(def) {
  const parts = def.parts ? def.parts.count * ENEMIES[def.parts.enemy].health : 0;
  return def.health + parts;
}

function ttkTable() {
  const targets = Object.values(ENEMIES).filter((e) => e.behaviour !== 'part');
  const name = (s) => s.padEnd(12);
  const lines = [];
  lines.push(`${name('form')} ${'dps'.padStart(5)}  ${targets.map((t) => t.name.replace('The ', '').slice(0, 9).padStart(10)).join('')}`);
  for (const cls of CLASS_LIST) {
    const d = dps(cls);
    const cells = targets.map((t) => `${(totalHealth(t) / d).toFixed(1)}s`.padStart(10)).join('');
    lines.push(`${name(cls.name)} ${d.toFixed(1).padStart(5)}  ${cells}`);
  }
  return lines.join('\n');
}

// --- Pacing ----------------------------------------------------------------

function play(path, seed) {
  const game = createGame(createRng(seed));
  const bot = createBot(path);
  const marks = { tier2: null, tier3: null, firstBoss: null, secondBoss: null };
  let ejections = 0;
  let wasEjecting = false;
  const steps = MAX_MINUTES * 60 / DT;
  for (let i = 0; i < steps; i++) {
    const controls = botControls(bot, game, DT);
    updateGame(game, controls, DT);
    const minutes = game.time / 60;
    const tier = CLASSES[game.player.classId].tier;
    if (tier >= 2 && marks.tier2 === null) marks.tier2 = minutes;
    if (tier >= 3 && marks.tier3 === null) marks.tier3 = minutes;
    if (game.defeated.size >= 1 && marks.firstBoss === null) marks.firstBoss = minutes;
    if (game.defeated.size >= 2 && marks.secondBoss === null) {
      marks.secondBoss = minutes;
      break;
    }
    const ejecting = game.transition && game.transition.kind === 'eject';
    if (ejecting && !wasEjecting) ejections++;
    wasEjecting = !!ejecting;
  }
  return { ...marks, ejections, kills: game.kills };
}

function median(values) {
  const v = values.filter((x) => x !== null).sort((a, b) => a - b);
  if (!v.length) return null;
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
}

const fmt = (m) => (m === null ? '   never' : `${m.toFixed(1).padStart(6)} m`);

export function pacing() {
  const finals = CLASS_LIST.filter((c) => c.tier === 3);
  const all = [];
  const lines = [`${'final form'.padEnd(12)}${'tier 2'.padStart(10)}${'tier 3'.padStart(10)}${'1st boss'.padStart(10)}${'2nd boss'.padStart(10)}  ejections`];
  for (const cls of finals) {
    const path = { 2: cls.parent, 3: cls.id };
    const runs = SEEDS.map((seed) => play(path, seed));
    all.push(...runs);
    const m = (k) => median(runs.map((r) => r[k]));
    lines.push(`${cls.name.padEnd(12)}${fmt(m('tier2')).padStart(10)}${fmt(m('tier3')).padStart(10)}`
      + `${fmt(m('firstBoss')).padStart(10)}${fmt(m('secondBoss')).padStart(10)}  ${runs.map((r) => r.ejections).join(', ')}`);
  }
  const overall = (k) => median(all.map((r) => r[k]));
  lines.push('');
  for (const [key, label] of [['tier2', 'tier 2'], ['tier3', 'tier 3'], ['firstBoss', 'first boss']]) {
    const got = overall(key);
    const target = TARGETS[key];
    const verdict = got === null ? 'never reached' : Math.abs(got - target) / target <= 0.25 ? 'on target' : got < target ? 'too fast' : 'too slow';
    lines.push(`${label.padEnd(11)} median ${fmt(got)}   target ${target} m   ${verdict}`);
  }
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Time to kill, every shot hitting (bosses include their parts)\n');
  console.log(ttkTable());
  console.log(`\nPacing: the real game played by a scripted player, ${SEEDS.length} seeds per final form (medians)\n`);
  console.log(pacing());
  console.log('\nThe scripted player aims with lead and keeps its distance but never dodges, so treat these as rough.');
}
