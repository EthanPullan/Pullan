// The evolution choice screen: HTML cards over the paused game.
import { classRadius } from '../data/classes.js';
import { drawTank } from '../render/tank.js';

// Draws a class, centred and scaled to fit a square canvas `size` CSS
// pixels across.
export function drawSilhouette(canvas, cls, color, size = 140) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const extent = Math.max(
    classRadius(cls),
    ...cls.guns.map((g) => Math.hypot(g.x, g.y) + g.r),
  );
  const scale = (size * 0.4) / extent;
  const px = dpr * scale;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(px, 0, 0, px, (size / 2) * dpr, (size / 2) * dpr);
  drawTank(ctx, cls, color, 0, 0, 0, 0, px);
}

export function createChoiceOverlay(onPick) {
  const root = document.createElement('div');
  root.className = 'overlay hidden';
  root.innerHTML = `
    <div class="overlay-panel">
      <h2>Evolve</h2>
      <p>Choose your next form</p>
      <div class="choice-cards"></div>
    </div>`;
  document.body.appendChild(root);
  const cards = root.querySelector('.choice-cards');

  return {
    get visible() {
      return !root.classList.contains('hidden');
    },
    // `options` is a list of class definitions.
    show(options, color) {
      cards.replaceChildren();
      options.forEach((cls, i) => {
        const card = document.createElement('button');
        card.className = 'choice-card';
        card.type = 'button';
        const canvas = document.createElement('canvas');
        drawSilhouette(canvas, cls, color);
        const name = document.createElement('h3');
        name.textContent = cls.name;
        const blurb = document.createElement('p');
        blurb.textContent = cls.blurb;
        const key = document.createElement('span');
        key.className = 'choice-key';
        key.textContent = String(i + 1);
        card.append(key, canvas, name, blurb);
        card.addEventListener('click', () => onPick(cls.id));
        cards.appendChild(card);
      });
      root.classList.remove('hidden');
    },
    hide() {
      root.classList.add('hidden');
    },
  };
}
