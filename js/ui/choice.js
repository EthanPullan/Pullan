// The evolution choice screen: HTML cards over the paused game.
import { classRadius } from '../data/classes.js';
import { drawTank } from '../render/tank.js';

const SILHOUETTE_SIZE = 140; // CSS pixels

function drawSilhouette(canvas, cls, color) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = SILHOUETTE_SIZE * dpr;
  canvas.height = SILHOUETTE_SIZE * dpr;
  canvas.style.width = `${SILHOUETTE_SIZE}px`;
  canvas.style.height = `${SILHOUETTE_SIZE}px`;
  const extent = Math.max(
    classRadius(cls),
    ...cls.guns.map((g) => Math.hypot(g.x, g.y) + g.r),
  );
  const scale = (SILHOUETTE_SIZE * 0.4) / extent;
  const px = dpr * scale;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(px, 0, 0, px, (SILHOUETTE_SIZE / 2) * dpr, (SILHOUETTE_SIZE / 2) * dpr);
  drawTank(ctx, cls, color, 0, 0, 0, 0, px);
}

export function createChoiceOverlay(onPick) {
  const root = document.createElement('div');
  root.className = 'choice hidden';
  root.innerHTML = `
    <div class="choice-panel">
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
