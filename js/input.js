// Keyboard and mouse state. Mouse position is in logical screen units
// (0..view.w across, 0..view.h down), matching what the renderer draws in.

const BLOCKED_KEYS = new Set(['F3', 'Space']);

export function createInput(canvas, view) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: view.w / 2, y: view.h / 2, left: false, right: false };

  window.addEventListener('keydown', (e) => {
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));

  // Releasing keys while another window has focus never reaches us.
  window.addEventListener('blur', () => {
    held.clear();
    mouse.left = false;
    mouse.right = false;
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = view.h / rect.height;
    mouse.x = (e.clientX - rect.left) * scale;
    mouse.y = (e.clientY - rect.top) * scale;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    mouse,
    isDown: (code) => held.has(code),
    // True once per physical key press.
    consume(code) {
      const was = pressed.has(code);
      pressed.delete(code);
      return was;
    },
  };
}
