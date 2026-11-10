// Debug: buttons that spawn any enemy or boss in front of the player.
// Toggled with B while the F3 overlay is open.
export function createSpawnMenu(defs, onSpawn) {
  const root = document.createElement('div');
  root.className = 'spawn-menu hidden';
  const title = document.createElement('p');
  title.textContent = 'Spawn (B to close)';
  root.appendChild(title);
  for (const def of defs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = def.name;
    button.addEventListener('click', () => onSpawn(def.id));
    root.appendChild(button);
  }
  document.body.appendChild(root);
  return {
    toggle() {
      root.classList.toggle('hidden');
    },
    hide() {
      root.classList.add('hidden');
    },
  };
}
