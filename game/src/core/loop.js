export const FLIGHT_STEP = 1 / 90;

export function startFlightLoop(update, draw) {
  let previous = 0;
  let pending = 0;
  function frame(now) {
    const dt = previous ? Math.min(.095, (now - previous) / 1000) : 0;
    previous = now;
    pending += dt;
    while (pending >= FLIGHT_STEP) {
      update(FLIGHT_STEP);
      pending -= FLIGHT_STEP;
    }
    draw(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
