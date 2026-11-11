// Seeded random numbers (mulberry32), so a run can be replayed from its seed.

export function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed: seed >>> 0,
    next,
    range: (min, max) => min + next() * (max - min),
  };
}

// Uses `?seed=123` from the page address if present, otherwise a fresh seed.
export function seedFromQuery(search) {
  const value = new URLSearchParams(search).get('seed');
  if (value !== null && /^\d+$/.test(value)) return Number(value) >>> 0;
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
