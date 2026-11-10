import { TUNING, PALETTE } from './data/tuning.js';
import { CLASSES } from './data/classes.js';
import { ENEMIES } from './data/enemies.js';
import { createFixedStep, startLoop } from './loop.js';
import { createInput } from './input.js';
import { createRng, seedFromQuery } from './rng.js';
import { createCamera, updateCamera, screenToWorld } from './camera.js';
import {
  createGame, updateGame, chooseClass, grantBubbles, fadeAmount, debugSpawn, dismissVictory,
} from './game.js';
import { nextScreen } from './screens.js';
import { difficultyOf } from './world.js';
import { clearSpriteCache } from './render/tank.js';
import { createSpecks, createAmbient, drawVignette } from './render/background.js';
import { createAudio } from './audio.js';
import { renderScene } from './render/scene.js';
import { drawHud } from './ui/hud.js';
import { drawMinimap } from './ui/minimap.js';
import { createChoiceOverlay } from './ui/choice.js';
import { createVictoryOverlay } from './ui/victory.js';
import { createTitleScreen, createPauseMenu, createTreeView } from './ui/menus.js';
import { createSpawnMenu } from './ui/spawnmenu.js';
import { createDebug, tickFps, drawDebugText } from './ui/debug.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// The world is drawn in logical units: the screen is always
// `logicalHeight` units tall, and as wide as the window's shape allows.
const view = { w: 1280, h: TUNING.view.logicalHeight, pxPerUnit: 1 };

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  view.pxPerUnit = canvas.height / view.h;
  view.w = canvas.width / view.pxPerUnit;
  clearSpriteCache();
}
resize();
window.addEventListener('resize', resize);

const query = new URLSearchParams(window.location.search);
const input = createInput(canvas, view);
let seed = seedFromQuery(window.location.search);
let game = createGame(createRng(seed));
// Visual-only randomness gets its own generator so it never shifts gameplay.
const visualRng = createRng(seed ^ 0x9e3779b9);
const backdrop = {
  specks: createSpecks(visualRng, TUNING.background),
  ambient: createAmbient(visualRng, TUNING.background),
};
const audio = createAudio();
const camera = createCamera(game.player.x, game.player.y);
let cameraArena = game.arenaId;
const debug = createDebug();
const stepper = createFixedStep(1 / TUNING.sim.stepHz, TUNING.sim.maxFrameSeconds);
const dt = 1 / TUNING.sim.stepHz;

const controls = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, ability: false };
let lastAlpha = 0;

// A fresh run. Uses the `?seed=` from the address if there is one, so a
// seeded run restarts identically; otherwise a new seed.
function newGame() {
  seed = seedFromQuery(window.location.search);
  game = createGame(createRng(seed));
  camera.x = camera.prevX = game.player.x;
  camera.y = camera.prevY = game.player.y;
  cameraArena = game.arenaId;
}

// --- Screens ---------------------------------------------------------------

let screen = 'title';

const title = createTitleScreen(() => go('start'));
const pauseMenu = createPauseMenu({
  onResume: () => go('resume'),
  onTree: () => go('tree'),
  onRestart: () => go('restart'),
});
const tree = createTreeView(() => go('back'), PALETTE);
const choice = createChoiceOverlay((classId) => pick(classId));
const victory = createVictoryOverlay(() => go('continue'));
const overlays = { title, paused: pauseMenu, tree, choosing: choice, victory };

// So the pause menu can be reached with the mouse as well as Esc.
const pauseButton = document.createElement('button');
pauseButton.type = 'button';
pauseButton.className = 'pause-button';
pauseButton.title = 'Pause (Esc)';
pauseButton.setAttribute('aria-label', 'Pause');
pauseButton.textContent = '❚❚';
pauseButton.addEventListener('click', () => go('pause'));
document.body.appendChild(pauseButton);

function showScreen() {
  pauseButton.hidden = screen !== 'playing';
  for (const [name, o] of Object.entries(overlays)) if (name !== screen) o.hide();
  if (screen === 'title') title.show();
  if (screen === 'paused') pauseMenu.show();
  if (screen === 'tree') tree.show(game.unlocked, game.player.classId);
  if (screen === 'choosing') choice.show(game.pendingChoice.map((id) => CLASSES[id]), PALETTE.player);
  if (screen === 'victory') victory.show(game.kills);
}

// Moves to another screen if the move is allowed from this one, with any
// side effect the move carries. Returns whether it happened.
function go(action) {
  const next = nextScreen(screen, action);
  if (!next) return false;
  if (action === 'restart') newGame();
  if (action === 'continue') dismissVictory(game);
  screen = next;
  showScreen();
  return true;
}

function pick(classId) {
  if (screen !== 'choosing') return;
  chooseClass(game, classId);
  go('pick');
}

// Leaving the tab or window pauses the game.
window.addEventListener('blur', () => go('pause'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) go('pause');
});

// Keys are read every frame, whatever the screen, so a press made on one
// screen can't fire later on another.
function handleKeys() {
  const esc = input.consume('Escape');
  const enter = input.consume('Enter') | input.consume('Space');
  const treeKey = input.consume('KeyT');
  const restartKey = input.consume('KeyR');
  const digits = [1, 2, 3].map((n) => input.consume(`Digit${n}`));

  switch (screen) {
    case 'title':
      if (enter) go('start');
      break;
    case 'playing':
      if (esc) go('pause');
      else if (game.pendingChoice) go('choose');
      else if (game.victoryPending) go('win');
      break;
    case 'paused':
      if (esc) go('resume');
      else if (treeKey) go('tree');
      else if (restartKey) pauseMenu.restart();
      break;
    case 'tree':
      if (esc || treeKey) go('back');
      break;
    case 'choosing': {
      const index = digits.indexOf(true);
      if (index >= 0 && index < game.pendingChoice.length) pick(game.pendingChoice[index]);
      break;
    }
    case 'victory':
      if (enter) go('continue');
      break;
    default:
      break;
  }
}

// --- Debug -----------------------------------------------------------------

// Boss parts only make sense attached to a boss, so they aren't listed.
const spawnMenu = createSpawnMenu(
  Object.values(ENEMIES).filter((def) => def.behaviour !== 'part'),
  (id) => debugSpawn(game, id),
);

function handleDebugKeys() {
  if (input.consume('F3')) debug.enabled = !debug.enabled;
  if (input.consume('Equal') && debug.enabled) grantBubbles(game, 10);
  if (input.consume('Minus') && debug.enabled) grantBubbles(game, -10);
  if (input.consume('KeyB') && debug.enabled) spawnMenu.toggle();
  if (!debug.enabled) spawnMenu.hide();
}

// `?test` exposes the game to automated browser checks. Getters, because
// restarting replaces the game.
if (query.has('test')) {
  window.__test = {
    get game() { return game; },
    get screen() { return screen; },
    camera, view, chooseClass, debugSpawn, audio,
  };
}

// --- Simulation and drawing ------------------------------------------------

function axis(negative, positive) {
  return (input.isDown(positive) ? 1 : 0) - (input.isDown(negative) ? 1 : 0);
}

function step() {
  const aim = screenToWorld(camera.x, camera.y, input.mouse.x, input.mouse.y, view);
  controls.moveX = axis('KeyA', 'KeyD');
  controls.moveY = axis('KeyW', 'KeyS');
  controls.aimX = aim.x;
  controls.aimY = aim.y;
  controls.fire = input.mouse.left;
  controls.ability = input.mouse.right;
  updateGame(game, controls, dt);
  // On arrival in a new arena the camera jumps with the player.
  if (game.arenaId !== cameraArena) {
    cameraArena = game.arenaId;
    camera.x = camera.prevX = game.player.x;
    camera.y = camera.prevY = game.player.y;
  }
  updateCamera(
    camera, game.player.x, game.player.y,
    input.mouse.x - view.w / 2, input.mouse.y - view.h / 2,
    TUNING.camera, dt,
  );
}

function render(alpha) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.abyss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cam = {
    x: camera.prevX + (camera.x - camera.prevX) * alpha,
    y: camera.prevY + (camera.y - camera.prevY) * alpha,
  };
  // Screen shake: a jolt that grows with the square of the shake amount.
  if (TUNING.effects.screenShake && game.shake > 0) {
    const amount = game.shake * game.shake * TUNING.effects.shakeMax;
    const t = performance.now() / 1000;
    cam.x += amount * (Math.sin(t * 53) + Math.sin(t * 31.7)) / 2;
    cam.y += amount * (Math.sin(t * 47.3) + Math.sin(t * 27.1)) / 2;
  }
  renderScene(ctx, game, cam, view, backdrop, alpha, debug.enabled);

  ctx.setTransform(view.pxPerUnit, 0, 0, view.pxPerUnit, 0, 0);
  drawVignette(ctx, view, TUNING.background.vignette);
  const fade = fadeAmount(game);
  if (fade > 0) {
    ctx.fillStyle = `rgba(3, 13, 24, ${fade})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
  if (screen !== 'title') {
    drawHud(ctx, game, view, PALETTE);
    drawMinimap(ctx, game, view, PALETTE);
  }
  if (debug.enabled) {
    const { player } = game;
    drawDebugText(ctx, [
      `fps      ${debug.fps.toFixed(0)}`,
      `seed     ${seed}   screen ${screen}`,
      `arena    ${game.cell.col},${game.cell.row}  difficulty ${difficultyOf(game.world, game.cell)}`
        + `  history ${game.history.length}`,
      `entities enemies ${game.enemies.length}`,
      `pools    shots ${game.playerShots.activeCount}/${game.playerShots.capacity}`
        + `, enemy shots ${game.enemyShots.activeCount}/${game.enemyShots.capacity}`,
      `         pickups ${game.pickups.activeCount}/${game.pickups.capacity}`
        + `, particles ${game.particles.activeCount}/${game.particles.capacity}`,
      `class    ${player.classId}  path ${JSON.stringify(game.path)}`,
      `bubbles  ${player.bubbles}  = / - to add or remove 10, B spawn menu`,
      `bosses   beaten ${[...game.defeated].join(', ') || 'none'}`,
      `speed    ${Math.hypot(player.vx, player.vy).toFixed(0)}`,
      `position ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`,
    ]);
  }
}

showScreen();

startLoop((elapsed) => {
  tickFps(debug, elapsed);
  handleDebugKeys();
  handleKeys();

  // The simulation runs only while playing. A step can raise an evolution
  // choice or the victory screen; the next frame switches to it.
  if (screen === 'playing') {
    const { steps, alpha } = stepper.advance(elapsed);
    for (let i = 0; i < steps && !game.pendingChoice && !game.victoryPending; i++) step();
    lastAlpha = alpha;
  }
  for (const s of game.sounds) audio.play(s.type, s.size);
  game.sounds.length = 0;
  render(lastAlpha);
});
