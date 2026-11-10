import { TUNING, PALETTE } from './data/tuning.js';
import { createFixedStep, startLoop } from './loop.js';
import { createInput } from './input.js';
import { createRng, seedFromQuery } from './rng.js';
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
}
resize();
window.addEventListener('resize', resize);

const input = createInput(canvas, view);
const rng = createRng(seedFromQuery(window.location.search));
const debug = createDebug();
const stepper = createFixedStep(1 / TUNING.sim.stepHz, TUNING.sim.maxFrameSeconds);
const dt = 1 / TUNING.sim.stepHz;

let simTime = 0;

function update(stepSeconds) {
  simTime += stepSeconds;
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.abyss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(view.pxPerUnit, 0, 0, view.pxPerUnit, 0, 0);
  if (debug.enabled) {
    drawDebugText(ctx, [
      `fps      ${debug.fps.toFixed(0)}`,
      `seed     ${rng.seed}`,
      `sim time ${simTime.toFixed(1)} s`,
      `entities 0`,
    ]);
  }
}

startLoop((elapsed) => {
  tickFps(debug, elapsed);
  if (input.consume('F3')) debug.enabled = !debug.enabled;

  const { steps } = stepper.advance(elapsed);
  for (let i = 0; i < steps; i++) update(dt);
  render();
});
