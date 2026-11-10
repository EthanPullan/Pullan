import { TUNING, PALETTE } from './data/tuning.js';
import { CLASSES } from './data/classes.js';
import { createFixedStep, startLoop } from './loop.js';
import { createInput } from './input.js';
import { createRng, seedFromQuery } from './rng.js';
import { createCamera, updateCamera, screenToWorld } from './camera.js';
import { createGame, updateGame, chooseClass, grantBubbles } from './game.js';
import { clearSpriteCache } from './render/tank.js';
import { createSpecks } from './render/background.js';
import { renderScene } from './render/scene.js';
import { drawHud } from './ui/hud.js';
import { createChoiceOverlay } from './ui/choice.js';
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
const seed = seedFromQuery(window.location.search);
const game = createGame(createRng(seed));
// Visual-only randomness gets its own generator so it never shifts gameplay.
const specks = createSpecks(createRng(seed ^ 0x9e3779b9), TUNING.background);
const camera = createCamera(game.player.x, game.player.y);
const debug = createDebug();
const stepper = createFixedStep(1 / TUNING.sim.stepHz, TUNING.sim.maxFrameSeconds);
const dt = 1 / TUNING.sim.stepHz;

// `?test` exposes the game state to automated browser checks.
if (query.has('test')) window.__test = { game, camera, view, chooseClass };

const controls = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false };
let lastAlpha = 0;

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
  updateGame(game, controls, dt);
  updateCamera(
    camera, game.player.x, game.player.y,
    input.mouse.x - view.w / 2, input.mouse.y - view.h / 2,
    TUNING.camera, dt,
  );
}

const choice = createChoiceOverlay((classId) => {
  chooseClass(game, classId);
  choice.hide();
});

// Shows the choice cards when the game asks for one, and handles the
// 1/2/3 keys. Digit presses are always consumed so a stale press made
// during play can't pick a card the moment the screen opens.
function handleChoice() {
  const pressed = [1, 2, 3].map((n) => input.consume(`Digit${n}`));
  const options = game.pendingChoice;
  if (!options) return;
  if (!choice.visible) choice.show(options.map((id) => CLASSES[id]), PALETTE.player);
  const index = pressed.indexOf(true);
  if (index >= 0 && index < options.length) {
    chooseClass(game, options[index]);
    choice.hide();
  }
}

function render(alpha) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.abyss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cam = {
    x: camera.prevX + (camera.x - camera.prevX) * alpha,
    y: camera.prevY + (camera.y - camera.prevY) * alpha,
  };
  renderScene(ctx, game, cam, view, specks, alpha, debug.enabled);

  ctx.setTransform(view.pxPerUnit, 0, 0, view.pxPerUnit, 0, 0);
  drawHud(ctx, game, view, PALETTE);
  if (debug.enabled) {
    const { player } = game;
    drawDebugText(ctx, [
      `fps      ${debug.fps.toFixed(0)}`,
      `seed     ${seed}`,
      `entities enemies ${game.enemies.length}`,
      `pools    shots ${game.playerShots.activeCount}/${game.playerShots.capacity}`
        + `, enemy shots ${game.enemyShots.activeCount}/${game.enemyShots.capacity}`,
      `         pickups ${game.pickups.activeCount}/${game.pickups.capacity}`
        + `, pops ${game.pops.activeCount}/${game.pops.capacity}`,
      `class    ${player.classId}  path ${JSON.stringify(game.path)}`,
      `bubbles  ${player.bubbles}  = / - to add or remove 10`,
      `speed    ${Math.hypot(player.vx, player.vy).toFixed(0)}`,
      `position ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`,
    ]);
  }
}

startLoop((elapsed) => {
  tickFps(debug, elapsed);
  if (input.consume('F3')) debug.enabled = !debug.enabled;
  if (input.consume('Equal') && debug.enabled) grantBubbles(game, 10);
  if (input.consume('Minus') && debug.enabled) grantBubbles(game, -10);
  handleChoice();

  // The simulation is paused while a choice is on screen.
  if (!game.pendingChoice) {
    const { steps, alpha } = stepper.advance(elapsed);
    for (let i = 0; i < steps && !game.pendingChoice; i++) step();
    lastAlpha = alpha;
  }
  render(lastAlpha);
});
