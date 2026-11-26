import { RAD } from '../core/math.js';

export function duskStart() {
  return {
    x: 115, y: 59.8, z: 948, yaw: -10 * RAD, pitch: 1.7 * RAD, grounded: false,
    speed: 36.8, vy: -2.55, throttle: .48, power: .48, flaps: 2
  };
}
