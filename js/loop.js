// Fixed-step simulation timing.

// Turns real elapsed time into a whole number of fixed simulation steps.
// `alpha` is how far between the last two steps the display currently is,
// used to interpolate drawing so motion stays smooth on any refresh rate.
export function createFixedStep(stepSeconds, maxFrameSeconds) {
  const epsilon = 1e-9; // absorbs floating-point drift in the accumulator
  let accumulator = 0;
  return {
    advance(elapsedSeconds) {
      accumulator += Math.min(Math.max(elapsedSeconds, 0), maxFrameSeconds);
      let steps = 0;
      while (accumulator >= stepSeconds - epsilon) {
        accumulator -= stepSeconds;
        steps++;
      }
      accumulator = Math.max(accumulator, 0);
      return { steps, alpha: accumulator / stepSeconds };
    },
  };
}

// Calls `onFrame(elapsedSeconds)` once per display frame.
export function startLoop(onFrame) {
  let last = performance.now();
  function frame(now) {
    const elapsed = (now - last) / 1000;
    last = now;
    onFrame(elapsed);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
