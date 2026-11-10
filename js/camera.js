// Camera that eases toward the player, shifted slightly toward the cursor.

export function createCamera(x = 0, y = 0) {
  return { x, y, prevX: x, prevY: y };
}

// `leadX/leadY` is the cursor's offset from the centre of the screen. Using
// the screen offset rather than the cursor's world position avoids a
// feedback loop where moving the camera moves the aim point.
export function updateCamera(cam, targetX, targetY, leadX, leadY, params, dt) {
  cam.prevX = cam.x;
  cam.prevY = cam.y;
  let lx = leadX * params.lead;
  let ly = leadY * params.lead;
  const len = Math.hypot(lx, ly);
  if (len > params.maxLead) {
    lx *= params.maxLead / len;
    ly *= params.maxLead / len;
  }
  const ease = 1 - Math.exp(-params.follow * dt);
  cam.x += (targetX + lx - cam.x) * ease;
  cam.y += (targetY + ly - cam.y) * ease;
}

export function screenToWorld(camX, camY, sx, sy, view) {
  return { x: sx - view.w / 2 + camX, y: sy - view.h / 2 + camY };
}
