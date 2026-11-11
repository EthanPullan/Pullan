// The title screen, pause menu, settings and class tree. HTML overlays over the
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

// A button that needs a second press within 3 s to act, so a stray click
// can't throw anything away. `press()` is the same as clicking it. When
// `needsConfirm()` is false, one press is enough.
function confirmButton(button, label, warning, onConfirm, needsConfirm = () => true) {
  let armedUntil = 0;
  const disarm = () => {
    armedUntil = 0;
    button.innerHTML = label;
    button.classList.remove('danger');
  };
  const press = () => {
    if (!needsConfirm() || performance.now() < armedUntil) {
      disarm();
      onConfirm();
      return;
    }
    armedUntil = performance.now() + 3000;
    button.innerHTML = warning;
    button.classList.add('danger');
  };
  button.addEventListener('click', press);
  disarm();
  return { press, disarm };
}

// With a save, Continue (Enter) carries on and New game (N) needs
// confirming. Without one, Start (Enter) begins. `notice` explains a save
// that couldn't be read.
export function createTitleScreen({ onNew, onContinue }) {
  const root = overlay(`
    <div class="overlay-panel title-panel">
      <h1>Glowfathom</h1>
      <p class="tagline">Collect bubbles, grow into something new, and find the two guardians of the deep.</p>
      <dl class="controls">
        ${CONTROLS.map(([key, what]) => `<dt>${key}</dt><dd>${what}</dd>`).join('')}
      </dl>
      <p class="notice" hidden></p>
      <div class="menu-buttons title-buttons">
        <button type="button" class="overlay-button" data-action="continue">Continue <span class="key">Enter</span></button>
        <button type="button" class="overlay-button" data-action="new"></button>
      </div>
      <a class="back-link" href="../../">← All projects</a>
    </div>`);
  const continueButton = root.querySelector('[data-action="continue"]');
  const newButton = root.querySelector('[data-action="new"]');
  const notice = root.querySelector('.notice');
  continueButton.addEventListener('click', () => onContinue());
  let hasSave = false;
  const confirmNew = confirmButton(newButton, 'New game <span class="key">N</span>',
    'Overwrite your save? Press again <span class="key">N</span>', () => onNew(), () => hasSave);
  const base = visibility(root);
  return {
    get visible() {
      return base.visible;
    },
    get hasSave() {
      return hasSave;
    },
    show({ canContinue, message }) {
      hasSave = canContinue;
      continueButton.hidden = !canContinue;
      confirmNew.disarm();
      if (!canContinue) newButton.innerHTML = 'Start <span class="key">Enter</span>';
      notice.hidden = !message;
      notice.textContent = message || '';
      base.show();
    },
    hide: base.hide,
    // N, or Enter without a save.
    pressNew: confirmNew.press,
  };
}

export function createPauseMenu({ onResume, onTree, onSettings, onRestart }) {
  const root = overlay(`
    <div class="overlay-panel">
      <h2>Paused</h2>
      <div class="menu-buttons">
        <button type="button" class="overlay-button" data-action="resume">Resume <span class="key">Esc</span></button>
        <button type="button" class="overlay-button" data-action="tree">Class tree <span class="key">T</span></button>
        <button type="button" class="overlay-button" data-action="settings">Settings <span class="key">O</span></button>
        <button type="button" class="overlay-button" data-action="restart"></button>
      </div>
    </div>`);
  root.querySelector('[data-action="resume"]').addEventListener('click', () => onResume());
  root.querySelector('[data-action="tree"]').addEventListener('click', () => onTree());
  root.querySelector('[data-action="settings"]').addEventListener('click', () => onSettings());
  const restart = confirmButton(root.querySelector('[data-action="restart"]'),
    'Restart <span class="key">R</span>', 'Lose this run? Press again <span class="key">R</span>', () => onRestart());
  const base = visibility(root);
  return {
    get visible() {
      return base.visible;
    },
    show() {
      restart.disarm();
      base.show();
    },
    hide: base.hide,
    restart: restart.press,
  };
}

// Volume, screen shake, and wiping the saved run.
export function createSettingsScreen({ onChange, onBack, onReset }) {
  const root = overlay(`
    <div class="overlay-panel">
      <h2>Settings</h2>
      <div class="settings">
        <label>Volume <input type="range" min="0" max="100" step="5" data-setting="volume"><output></output></label>
        <label><input type="checkbox" data-setting="screenShake"> Screen shake</label>
      </div>
      <div class="menu-buttons">
        <button type="button" class="overlay-button" data-action="back">Back <span class="key">Esc</span></button>
        <button type="button" class="overlay-button" data-action="reset"></button>
      </div>
    </div>`);
  const volume = root.querySelector('[data-setting="volume"]');
  const volumeText = root.querySelector('output');
  const shake = root.querySelector('[data-setting="screenShake"]');
  const read = () => ({ volume: Number(volume.value) / 100, screenShake: shake.checked });
  volume.addEventListener('input', () => {
    volumeText.textContent = `${volume.value}%`;
    onChange(read());
  });
  shake.addEventListener('change', () => onChange(read()));
  root.querySelector('[data-action="back"]').addEventListener('click', () => onBack());
  const reset = confirmButton(root.querySelector('[data-action="reset"]'),
    'Reset save', 'Delete your saved run? Press again', () => onReset());
  const base = visibility(root);
  return {
    get visible() {
      return base.visible;
    },
    show(settings) {
      volume.value = String(Math.round(settings.volume * 100));
      volumeText.textContent = `${volume.value}%`;
      shake.checked = settings.screenShake;
      reset.disarm();
      base.show();
    },
    hide: base.hide,
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
