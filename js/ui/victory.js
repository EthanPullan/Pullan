// Shown once, when both bosses are beaten. Play continues afterwards.
export function createVictoryOverlay(onContinue) {
  const root = document.createElement('div');
  root.className = 'overlay hidden';
  root.innerHTML = `
    <div class="overlay-panel">
      <h2>The deep is quiet</h2>
      <p class="victory-text"></p>
      <button type="button" class="overlay-button">Keep exploring</button>
    </div>`;
  document.body.appendChild(root);
  const text = root.querySelector('.victory-text');
  const button = root.querySelector('button');
  button.addEventListener('click', () => onContinue());

  return {
    get visible() {
      return !root.classList.contains('hidden');
    },
    show(kills) {
      text.textContent = `The Bloom and The Warden are gone. You popped ${kills} creatures on the way.`;
      root.classList.remove('hidden');
      button.focus();
    },
    hide() {
      root.classList.add('hidden');
    },
  };
}
