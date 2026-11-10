// The title screen, pause menu and class tree. HTML overlays over the
// canvas; main.js decides which one shows.
import { CLASS_LIST, CLASSES } from '../data/classes.js';
import { TUNING } from '../data/tuning.js';
import { drawSilhouette } from './choice.js';

function overlay(html) {
  const root = document.createElement('div');
  root.className = 'overlay hidden';
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

function visibility(root) {
  return {
    get visible() {
      return !root.classList.contains('hidden');
    },
    show() {
      root.classList.remove('hidden');
      const first = root.querySelector('button');
      if (first) first.focus();
    },
    hide() {
      root.classList.add('hidden');
    },
  };
}

const CONTROLS = [
  ['WASD', 'Move'],
  ['Mouse', 'Aim'],
  ['Left click', 'Fire'],
  ['Right click', 'Ability (final forms)'],
  ['Hold a key into an edge', 'Cross to the next arena'],
  ['Esc', 'Pause'],
];

export function createTitleScreen(onStart) {
  const root = overlay(`
    <div class="overlay-panel title-panel">
      <h1>Glowfathom</h1>
      <p class="tagline">Collect bubbles, grow into something new, and find the two guardians of the deep.</p>
      <dl class="controls">
        ${CONTROLS.map(([key, what]) => `<dt>${key}</dt><dd>${what}</dd>`).join('')}
      </dl>
      <button type="button" class="overlay-button">Start <span class="key">Enter</span></button>
    </div>`);
  root.querySelector('button').addEventListener('click', () => onStart());
  return visibility(root);
}

// Restart needs a second click (or second R) within a few seconds, so a
// stray click can't throw a run away.
export function createPauseMenu({ onResume, onTree, onRestart }) {
  const root = overlay(`
    <div class="overlay-panel">
      <h2>Paused</h2>
      <div class="menu-buttons">
        <button type="button" class="overlay-button" data-action="resume">Resume <span class="key">Esc</span></button>
        <button type="button" class="overlay-button" data-action="tree">Class tree <span class="key">T</span></button>
        <button type="button" class="overlay-button" data-action="restart">Restart <span class="key">R</span></button>
      </div>
    </div>`);
  const restartButton = root.querySelector('[data-action="restart"]');
  let armedUntil = 0;
  const disarm = () => {
    armedUntil = 0;
    restartButton.innerHTML = 'Restart <span class="key">R</span>';
    restartButton.classList.remove('danger');
  };
  const restart = () => {
    if (performance.now() < armedUntil) {
      disarm();
      onRestart();
      return;
    }
    armedUntil = performance.now() + 3000;
    restartButton.innerHTML = 'Lose this run? Press again <span class="key">R</span>';
    restartButton.classList.add('danger');
  };
  root.querySelector('[data-action="resume"]').addEventListener('click', () => onResume());
  root.querySelector('[data-action="tree"]').addEventListener('click', () => onTree());
  restartButton.addEventListener('click', restart);
  const base = visibility(root);
  return {
    get visible() {
      return base.visible;
    },
    show() {
      disarm();
      base.show();
    },
    hide: base.hide,
    restart,
  };
}

// All ten forms laid out as the tree. Forms you have never reached show
// only a dark outline and the bubbles needed to reach their tier.
export function createTreeView(onBack, palette) {
  const root = overlay(`
    <div class="overlay-panel tree-panel">
      <h2>Class tree</h2>
      <p>Forms you have reached are lit. Your current form is outlined.</p>
      <div class="tree-grid"></div>
      <button type="button" class="overlay-button">Back <span class="key">Esc</span></button>
    </div>`);
  const grid = root.querySelector('.tree-grid');
  root.querySelector('button').addEventListener('click', () => onBack());
  const base = visibility(root);

  // Column placement: tier 1 spans all six columns, each tier-2 form spans
  // its two children's columns.
  function placement(cls) {
    if (cls.tier === 1) return '1 / span 6';
    const branches = CLASS_LIST.filter((c) => c.tier === 2).map((c) => c.id);
    if (cls.tier === 2) return `${branches.indexOf(cls.id) * 2 + 1} / span 2`;
    const siblings = CLASS_LIST.filter((c) => c.parent === cls.parent).map((c) => c.id);
    return `${branches.indexOf(cls.parent) * 2 + siblings.indexOf(cls.id) + 1} / span 1`;
  }

  return {
    get visible() {
      return base.visible;
    },
    show(unlocked, currentId) {
      grid.replaceChildren();
      for (const cls of CLASS_LIST) {
        const open = unlocked.has(cls.id);
        const card = document.createElement('div');
        card.className = `tree-card${open ? '' : ' locked'}${cls.id === currentId ? ' current' : ''}`;
        card.style.gridRow = String(cls.tier);
        card.style.gridColumn = placement(cls);
        const canvas = document.createElement('canvas');
        drawSilhouette(canvas, cls, open ? palette.player : '#3a4a58', 72);
        const name = document.createElement('h3');
        name.textContent = open ? cls.name : 'Locked';
        const note = document.createElement('p');
        if (open) note.textContent = cls.blurb;
        else note.textContent = `Reach ${TUNING.evolution.thresholds[cls.tier]} bubbles as ${CLASSES[cls.parent].name}`;
        card.append(canvas, name, note);
        grid.appendChild(card);
      }
      base.show();
    },
    hide: base.hide,
  };
}
