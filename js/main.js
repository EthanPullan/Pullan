import { TUNING, PALETTE } from './data/tuning.js';
import { CLASS_LIST, CLASSES, START_CLASS } from './data/classes.js';
import { createFixedStep, startLoop } from './loop.js';
import { createInput } from './input.js';
import { createRng, seedFromQuery } from './rng.js';
import { createCamera, updateCamera, screenToWorld } from './camera.js';
import { createPlayer, updatePlayer, setPlayerClass, applyRecoil } from './entities/player.js';
import { createDummy, updateDummy, damageDummy } from './entities/dummy.js';
import { WEAPONS } from './data/weapons.js';
import { DUMMY, DUMMY_POSITIONS } from './data/enemies.js';
import { lerpAngle } from './systems/movement.js';
import { createPool } from './systems/pool.js';
import { updateTrigger, fireWeapon } from './systems/weapons.js';
import { createProjectile, updateProjectiles } from './systems/projectiles.js';
import { drawTank, clearSpriteCache } from './render/tank.js';
import { createPop, spawnPop, updatePops, drawPops, drawProjectiles } from './render/effects.js';
import { drawArena, drawGlow } from './render/arena.js';
import { createSpecks, drawSpecks } from './render/background.js';
import { createDebug, tickFps, drawDebugText, drawCollisionCircle } from './ui/debug.js';

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

const input = createInput(canvas, view);
const rng = createRng(seedFromQuery(window.location.search));
const debug = createDebug();
const stepper = createFixedStep(1 / TUNING.sim.stepHz, TUNING.sim.maxFrameSeconds);
const dt = 1 / TUNING.sim.stepHz;

const specks = createSpecks(rng, TUNING.background);
const player = createPlayer(CLASSES[START_CLASS]);
const camera = createCamera(player.x, player.y);
const projectiles = createPool(TUNING.combat.projectilePoolSize, createProjectile);
const pops = createPool(TUNING.combat.popPoolSize, createPop);
const dummies = DUMMY_POSITIONS.map(([x, y]) => createDummy(DUMMY, x, y));

let simTime = 0;

const combat = TUNING.combat;

function onHit(target, projectile) {
  if (damageDummy(target, projectile.damage, combat.hitFlashSeconds)) {
    spawnPop(pops, target.x, target.y, target.radius * combat.deathPopScale, combat.deathPopSeconds, PALETTE.enemy);
  }
}

function onPop(x, y, radius) {
  spawnPop(pops, x, y, radius, combat.shotPopSeconds, PALETTE.player);
}

function axis(negative, positive) {
  return (input.isDown(positive) ? 1 : 0) - (input.isDown(negative) ? 1 : 0);
}

function update(stepSeconds) {
  simTime += stepSeconds;
  const aim = screenToWorld(camera.x, camera.y, input.mouse.x, input.mouse.y, view);
  updatePlayer(player, axis('KeyA', 'KeyD'), axis('KeyW', 'KeyS'), aim.x, aim.y, TUNING, stepSeconds);

  const weapon = WEAPONS.starter;
  const shots = updateTrigger(player.trigger, input.mouse.left, weapon, stepSeconds);
  for (let i = 0; i < shots; i++) {
    fireWeapon(projectiles, weapon, player.x, player.y, player.aim, player.muzzle, rng);
    applyRecoil(player, weapon.recoil);
  }
  updateProjectiles(projectiles, dummies, TUNING.arena.radius, onHit, onPop, stepSeconds);
  for (const d of dummies) updateDummy(d, stepSeconds);
  updatePops(pops, stepSeconds);

  updateCamera(
    camera, player.x, player.y,
    input.mouse.x - view.w / 2, input.mouse.y - view.h / 2,
    TUNING.camera, stepSeconds,
  );
}

// Debug only: step through the class sketches with [ and ].
function cycleClass(direction) {
  const i = CLASS_LIST.findIndex((c) => c.id === player.classId);
  const next = CLASS_LIST[(i + direction + CLASS_LIST.length) % CLASS_LIST.length];
  setPlayerClass(player, next);
}

function render(alpha) {
  const lerp = (a, b) => a + (b - a) * alpha;
  const camX = lerp(camera.prevX, camera.x);
  const camY = lerp(camera.prevY, camera.y);
  const px = lerp(player.prevX, player.x);
  const py = lerp(player.prevY, player.y);
  const cls = CLASSES[player.classId];

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.abyss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // World space.
  const s = view.pxPerUnit;
  ctx.setTransform(s, 0, 0, s, (view.w / 2 - camX) * s, (view.h / 2 - camY) * s);
  drawArena(ctx, TUNING.arena.radius, simTime, PALETTE);

  // Screen space: background specks sit over the water, under the tanks.
  ctx.setTransform(s, 0, 0, s, 0, 0);
  drawSpecks(ctx, specks, camX, camY, view, TUNING.background.tileSize, PALETTE.speck);

  ctx.setTransform(s, 0, 0, s, (view.w / 2 - camX) * s, (view.h / 2 - camY) * s);
  drawGlow(ctx, px, py, TUNING.lighting.playerGlowRadius, PALETTE.player, TUNING.lighting.playerGlowAlpha);
  for (const d of dummies) {
    if (d.alive) drawTank(ctx, DUMMY, d.flash > 0 ? '#ffffff' : PALETTE.enemy, d.x, d.y, 0, 0, view.pxPerUnit);
  }
  drawProjectiles(ctx, projectiles, alpha, PALETTE.player);
  drawPops(ctx, pops);
  drawTank(
    ctx, cls, PALETTE.player, px, py,
    lerpAngle(player.prevHeading, player.heading, alpha),
    lerpAngle(player.prevAim, player.aim, alpha),
    view.pxPerUnit,
  );
  if (debug.enabled) {
    drawCollisionCircle(ctx, px, py, player.radius);
    for (const d of dummies) if (d.alive) drawCollisionCircle(ctx, d.x, d.y, d.radius);
    for (const p of projectiles.items) {
      if (p.active) drawCollisionCircle(ctx, lerp(p.prevX, p.x), lerp(p.prevY, p.y), p.radius);
    }
  }

  ctx.setTransform(s, 0, 0, s, 0, 0);
  if (debug.enabled) {
    drawDebugText(ctx, [
      `fps      ${debug.fps.toFixed(0)}`,
      `seed     ${rng.seed}`,
      `entities player 1, dummies ${dummies.filter((d) => d.alive).length}/${dummies.length}`,
      `pools    shots ${projectiles.activeCount}/${projectiles.capacity}, pops ${pops.activeCount}/${pops.capacity}`,
      `class    ${cls.name} (tier ${cls.tier})  [ ] to cycle`,
      `speed    ${Math.hypot(player.vx, player.vy).toFixed(0)} / ${TUNING.player.topSpeed}`,
      `position ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`,
    ]);
  }
}

startLoop((elapsed) => {
  tickFps(debug, elapsed);
  if (input.consume('F3')) debug.enabled = !debug.enabled;
  if (input.consume('BracketRight') && debug.enabled) cycleClass(1);
  if (input.consume('BracketLeft') && debug.enabled) cycleClass(-1);

  const { steps, alpha } = stepper.advance(elapsed);
  for (let i = 0; i < steps; i++) update(dt);
  render(alpha);
});
