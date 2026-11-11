// Drones that orbit the player (Halo). Each hurts the first enemy it
// touches, then waits `hitCooldown` before it can hurt again.
import { circlesOverlap } from './collision.js';

export function updateDrones(player, settings, enemies, onDroneHit, dt) {
  const count = player.drones.length;
  if (!count) return;
  player.droneAngle += settings.orbitSpeed * dt;
  for (let i = 0; i < count; i++) {
    const d = player.drones[i];
    const a = player.droneAngle + (i / count) * Math.PI * 2;
    d.prevX = d.x;
    d.prevY = d.y;
    d.x = player.x + Math.cos(a) * settings.orbitRadius;
    d.y = player.y + Math.sin(a) * settings.orbitRadius;
    d.cooldown -= dt;
    if (d.cooldown > 0) continue;
    for (const e of enemies) {
      if (e.alive && circlesOverlap(d.x, d.y, d.radius, e.x, e.y, e.radius)) {
        onDroneHit(e, settings.damage);
        d.cooldown = settings.hitCooldown;
        break;
      }
    }
  }
}
