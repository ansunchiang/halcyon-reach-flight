export const TAU = Math.PI * 2;
export const RAD = Math.PI / 180;
export const KNOT = 1.943844;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const mix = (a, b, amount) => a + (b - a) * amount;
export const ease = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const smooth = (a, b, rate, dt) => mix(a, b, 1 - Math.exp(-rate * dt));
export const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
export const bearing = (a, b) => Math.atan2(b.x - a.x, a.z - b.z);
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const heading = (angle) => String((Math.round(angle / RAD) % 360 + 360) % 360).padStart(3, '0') + '°';

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function gridValue(x, z) {
  let hash = Math.imul(x, 1597334677) ^ Math.imul(z, 3812015801);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822519);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967295;
}

export function noise(x, z) {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = ease(0, 1, x - i);
  const v = ease(0, 1, z - j);
  return mix(mix(gridValue(i, j), gridValue(i + 1, j), u),
    mix(gridValue(i, j + 1), gridValue(i + 1, j + 1), u), v);
}
