import { clamp, smooth } from '../core/math.js';

export const FUEL_CAPACITY = 48;

export function driveEngine(plane, command, dt) {
  plane.throttle = clamp(plane.throttle + command * dt * .43, 0, 1);
  const demand = plane.fuel > 0 ? plane.throttle * (1 - .61 * plane.damage) : 0;
  plane.power = smooth(plane.power, demand, 2.7, dt);
  const fuelRate = plane.fuel > 0 ? (.007 + .12 * plane.power ** 1.37) : 0;
  plane.fuelUsed += Math.min(plane.fuel, fuelRate * dt);
  plane.fuel = Math.max(0, plane.fuel - fuelRate * dt);
  return (1.0 + plane.power * 10.8) * (plane.fuel > 0 ? 1 : 0) * (1 - Math.min(.58, plane.speed / 130));
}
