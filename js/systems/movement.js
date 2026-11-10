// Movement rules. No browser references, so these can be tested in Node.

// Moves `body` toward the velocity the input asks for. Velocity approaches
// the target exponentially, which can never overshoot the top speed and
// behaves the same at any step size. Starting from rest, the initial
// acceleration equals `accel`. With no input, speed decays at `releaseDrag`.
export function stepMovement(body, inputX, inputY, params, dt) {
  const length = Math.hypot(inputX, inputY);
  let targetX = 0;
  let targetY = 0;
  let rate = params.releaseDrag;
  if (length > 0) {
    targetX = (inputX / length) * params.topSpeed;
    targetY = (inputY / length) * params.topSpeed;
    rate = params.accel / params.topSpeed;
  }
  const keep = Math.exp(-rate * dt);
  body.vx = targetX + (body.vx - targetX) * keep;
  body.vy = targetY + (body.vy - targetY) * keep;
  body.x += body.vx * dt;
  body.y += body.vy * dt;
}

// Keeps a circle of `radius` inside an arena centred on the origin.
// Outward speed is reflected and scaled by `bounce`.
export function constrainToArena(body, radius, arenaRadius, bounce) {
  const limit = arenaRadius - radius;
  const dist = Math.hypot(body.x, body.y);
  if (dist <= limit || dist === 0) return;
  const nx = body.x / dist;
  const ny = body.y / dist;
  body.x = nx * limit;
  body.y = ny * limit;
  const outward = body.vx * nx + body.vy * ny;
  if (outward > 0) {
    body.vx -= (1 + bounce) * outward * nx;
    body.vy -= (1 + bounce) * outward * ny;
  }
}

export function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// Turns `current` toward `target` by at most `maxStep`, the short way round.
export function turnToward(current, target, maxStep) {
  const diff = wrapAngle(target - current);
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

export function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * t;
}
