// Every sound is synthesised with the Web Audio API; there are no audio
// files. Browsers only allow audio after the player interacts with the page,
// so nothing plays until the first click or key press.

// Shortest gap between two plays of the same sound, so rapid fire or a
// shower of pickups doesn't turn into a buzz.
const MIN_GAP = {
  shot: 0.03, hit: 0.03, pop: 0.04, pickup: 0.03, hurt: 0.1,
  evolve: 0.2, devolve: 0.2, ability: 0.1, warning: 0.3, explode: 0.08,
};

export function createAudio({ volume = 0.5 } = {}) {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  const lastPlayed = {};
  const stats = { played: {}, skipped: 0 };
  let pickupStreak = 0;
  let lastPickup = 0;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    startAmbient();
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // A short envelope on a gain node: quick attack, exponential fade.
  function envelope(start, duration, peak, attack = 0.005) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    g.connect(master);
    return g;
  }

  // An oscillator gliding from `from` Hz to `to` Hz.
  function tone({ wave = 'sine', from, to = from, duration, gain, delay = 0, filter }) {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    let out = envelope(start, duration, gain);
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      f.connect(out);
      out = f;
    }
    osc.connect(out);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  // Filtered white noise, its filter sweeping from `from` Hz to `to` Hz.
  function noise({ type = 'bandpass', from, to = from, q = 1, duration, gain, delay = 0 }) {
    const start = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, start);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    src.connect(f);
    f.connect(envelope(start, duration, gain));
    src.start(start, Math.random() * 0.5);
    src.stop(start + duration + 0.02);
  }

  // A low, steady hum under everything: two slightly detuned sines.
  function startAmbient() {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    f.connect(g);
    g.connect(master);
    for (const hz of [55, 55.7, 82.5]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = hz;
      osc.connect(f);
      osc.start();
    }
  }

  const SOUNDS = {
    // A soft bloop that drops in pitch; bigger shots are lower.
    shot: (j, size) => tone({ from: (620 / Math.sqrt(size)) * j, to: (300 / Math.sqrt(size)) * j, duration: 0.08, gain: 0.1 }),
    // A short filtered tick.
    hit: (j) => {
      noise({ from: 2200 * j, q: 4, duration: 0.04, gain: 0.18 });
      tone({ from: 1400 * j, duration: 0.025, gain: 0.04 });
    },
    // A bubble popping: a rising chirp with a little hiss.
    pop: (j, size) => {
      tone({ from: 240 * j, to: (900 / Math.sqrt(size)) * j, duration: 0.1, gain: 0.18 });
      noise({ type: 'highpass', from: 3000, duration: 0.03, gain: 0.05 });
    },
    // A bright blip that climbs a semitone with each pickup in a quick run.
    pickup: (j) => {
      const now = ctx.currentTime;
      pickupStreak = now - lastPickup < 0.35 ? Math.min(pickupStreak + 1, 12) : 0;
      lastPickup = now;
      const f = 880 * 2 ** (pickupStreak / 12) * j;
      tone({ wave: 'triangle', from: f, to: f * 1.5, duration: 0.07, gain: 0.09 });
    },
    // A falling, buzzy groan.
    hurt: (j) => tone({ wave: 'sawtooth', from: 220 * j, to: 80 * j, duration: 0.28, gain: 0.16, filter: 900 }),
    // Four notes up a major chord.
    evolve: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({
      wave: 'triangle', from: f, duration: 0.2, gain: 0.12, delay: i * 0.09,
    })),
    // The same four notes going down.
    devolve: () => [783.99, 659.25, 523.25, 392].forEach((f, i) => tone({
      wave: 'triangle', from: f, duration: 0.2, gain: 0.11, delay: i * 0.1,
    })),
    // A rushing whoosh.
    ability: (j) => {
      noise({ from: 400 * j, to: 2400 * j, q: 2, duration: 0.3, gain: 0.22 });
      tone({ from: 300 * j, to: 600 * j, duration: 0.25, gain: 0.06 });
    },
    // Two low pulses.
    warning: () => [0, 0.22].forEach((delay) => tone({
      wave: 'triangle', from: 150, to: 110, duration: 0.18, gain: 0.22, delay,
    })),
    // A dull thump with rumble.
    explode: (j) => {
      noise({ type: 'lowpass', from: 900 * j, to: 150, duration: 0.4, gain: 0.3 });
      tone({ from: 120 * j, to: 40, duration: 0.35, gain: 0.25 });
    },
  };

  return {
    stats,
    get started() {
      return ctx !== null;
    },
    unlock,
    setVolume(v) {
      volume = v;
      if (master) master.gain.value = v;
    },
    play(type, size = 1) {
      const recipe = SOUNDS[type];
      if (!ctx || !recipe) return;
      const now = ctx.currentTime;
      if (now - (lastPlayed[type] ?? -1) < (MIN_GAP[type] ?? 0)) {
        stats.skipped++;
        return;
      }
      lastPlayed[type] = now;
      stats.played[type] = (stats.played[type] || 0) + 1;
      // Up to 6% higher or lower each time, so repeats don't grate.
      recipe(1 + (Math.random() - 0.5) * 0.12, size);
    },
  };
}
