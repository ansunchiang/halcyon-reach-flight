import { clamp, ease, KNOT, RAD, smooth } from '../core/math.js';
import { fieldUnder } from '../world/chart.js';
import { elevation, surfaceHeight } from '../world/elevation.js';
import { treeAt } from '../world/forest.js';
import { computeLift, controlAuthority } from './aerodynamics.js';
import { driveEngine, FUEL_CAPACITY } from './engine.js';
import { gradeTouchdown, touchdownDamage } from './touchdown.js';
import { windAt } from './weather.js';

export const NEUTRAL = Object.freeze({ pitch: 0, roll: 0, rudder: 0, throttle: 0 });
const WHEEL_HEIGHT = 1.45;

export function createFlight(start) {
  const ground = surfaceHeight(start.x, start.z);
  const plane = {
    y: ground + WHEEL_HEIGHT, speed: 0, vy: 0, roll: 0, pitch: .035,
    throttle: .16, power: .16, flaps: 1, gear: true, brakes: false,
    fuel: FUEL_CAPACITY, fuelUsed: 0, damage: 0, elapsed: 0, g: 1, agl: 0,
    grounded: true, stallWarning: false, stalled: false, load: 0, crashed: false,
    scrape: 0, birdEncounter: false, serviced: false, serviceTime: 0, wind: null,
    ...start
  };
  plane.agl = Math.max(0, plane.y - ground - (plane.grounded ? WHEEL_HEIGHT : 0));
  return plane;
}

function crash(plane, reason) {
  plane.crashed = true;
  plane.damage = 1;
  return { type: 'crash', reason, speed: Math.round(plane.speed * KNOT) };
}

function contactSurface(plane, field) {
  if (field) {
    const landing = gradeTouchdown(plane, field);
    plane.damage = clamp(plane.damage + touchdownDamage(landing, plane.gear), 0, 1);
    if (plane.damage >= 1 || landing.sink > 8.3 || Math.abs(plane.roll) > .65) {
      return crash(plane, 'runway impact');
    }
    plane.grounded = true;
    plane.serviced = false;
    plane.serviceTime = 0;
    plane.y = field.y + (plane.gear ? WHEEL_HEIGHT : .69);
    plane.vy = 0;
    return { type: 'touchdown', landing };
  }
  const water = elevation(plane.x, plane.z) < surfaceHeight(plane.x, plane.z) - .12;
  const slope = Math.hypot(
    elevation(plane.x + 5, plane.z) - elevation(plane.x - 5, plane.z),
    elevation(plane.x, plane.z + 5) - elevation(plane.x, plane.z - 5)
  ) / 10;
  if (water) return crash(plane, 'ditched in water');
  if (slope > .36 || plane.agl < 1 && plane.y > 105 && plane.speed > 23) return crash(plane, 'hit ridge');
  if (-plane.vy > 4.8 || plane.speed > 43 || Math.abs(plane.roll) > .43) return crash(plane, 'hit rough ground');
  plane.damage = clamp(plane.damage + .19 + Math.max(0, -plane.vy - 1) * .06, 0, 1);
  if (plane.damage >= 1) return crash(plane, 'structural failure');
  plane.grounded = true;
  plane.vy = 0;
  return { type: 'rough' };
}

export function stepFlight(plane, input, dt, regime) {
  if (plane.crashed) return null;
  plane.elapsed += dt;
  plane.wind = windAt(plane, regime);
  plane.scrape = Math.max(0, plane.scrape - dt);
  const thrust = driveEngine(plane, input.throttle, dt);
  const authority = controlAuthority(plane.speed, plane.damage);
  const trim = (.021 + plane.flaps * .009 + (1 - plane.throttle) * .022);
  plane.pitch = smooth(plane.pitch, trim + input.pitch * (plane.grounded ? .22 : .46), (input.pitch ? 1.65 : .96) * authority, dt);
  plane.roll = smooth(plane.roll, plane.grounded ? input.roll * .075 : input.roll * 1.07 + plane.wind.roll, 2.65 * authority, dt);
  const aero = computeLift(plane.speed, plane.pitch, plane.vy, plane.flaps, plane.damage);
  plane.stallWarning = !plane.grounded && (aero.warn || plane.speed < 22 - plane.flaps * 1.7);
  plane.stalled = !plane.grounded && (aero.separation > .36 || plane.speed < 15 - plane.flaps);
  if (plane.stalled) {
    plane.pitch = smooth(plane.pitch, -.28, 1.2, dt);
    plane.roll += Math.sin(plane.elapsed * 3.1) * .30 * dt;
  }
  const drag = aero.drag + (plane.gear ? .32 + plane.speed * .009 : 0);
  const slopeLoss = 9.81 * plane.vy / Math.max(18, Math.hypot(plane.speed, plane.vy));
  const rollFriction = plane.speed < 1 ? 3.05 : .81;
  const braking = plane.grounded ? (plane.brakes ? 10.3 : rollFriction) + (plane.gear ? 0 : 7.8) : 0;
  plane.speed = clamp(plane.speed + (thrust - drag - braking - (plane.grounded ? 0 : slopeLoss)) * dt, 0, 86);
  const turn = plane.grounded ? input.rudder * .53 * ease(0, 8, plane.speed)
    : 9.81 * Math.tan(plane.roll) / Math.max(16, plane.speed) * .86 + input.rudder * .33 * authority;
  plane.yaw += turn * dt;

  const previousField = fieldUnder(plane.x, plane.z);
  const windFactor = plane.grounded ? 0 : 1;
  plane.x += (Math.sin(plane.yaw) * plane.speed + plane.wind.x * windFactor) * dt;
  plane.z += (-Math.cos(plane.yaw) * plane.speed + plane.wind.z * windFactor) * dt;
  const field = fieldUnder(plane.x, plane.z);
  const ground = field ? field.y : surfaceHeight(plane.x, plane.z);
  const contact = ground + (plane.gear ? WHEEL_HEIGHT : .69);
  const impactLift = aero.lift * Math.cos(plane.roll);

  if (plane.grounded) {
    plane.y = contact;
    plane.vy = 0;
    plane.g = smooth(plane.g, 1, 6, dt);
    if (impactLift > 10.4 && plane.pitch > .10 && plane.speed > 22 && !plane.brakes) {
      plane.grounded = false;
      plane.vy = 1.3;
      plane.y += .12;
      return { type: 'takeoff' };
    }
    if (previousField && !field && plane.speed > 22 && ground < previousField.y - 1.1) {
      plane.grounded = false;
      plane.y = previousField.y + WHEEL_HEIGHT;
      return { type: 'takeoff' };
    }
    if (previousField && !field && plane.speed > 26 && elevation(plane.x, plane.z) < ground - .3) {
      return crash(plane, 'ran off runway');
    }
    if (field && plane.speed < 2 && plane.brakes && plane.throttle < .12) {
      plane.serviceTime += dt;
      plane.fuel = Math.min(FUEL_CAPACITY, plane.fuel + 12 * dt);
      if (!plane.serviced && plane.serviceTime > 1.1) {
        plane.serviced = true;
        return { type: 'refuel' };
      }
    } else {
      plane.serviceTime = 0;
    }
  } else {
    plane.g = smooth(plane.g, Math.min(8, aero.lift / 9.81), 6, dt);
    if (plane.g > 3.35) plane.damage += (plane.g - 3.35) * .076 * dt;
    const acceleration = clamp(impactLift - 9.81 + plane.wind.lift, -15, 24);
    plane.vy = clamp(plane.vy + acceleration * dt, -39, 31);
    plane.y += plane.vy * dt;
    plane.agl = Math.max(0, plane.y - ground);
    if (plane.y <= contact) return contactSurface(plane, field);
    if (plane.agl < 30 && plane.y - 1.45 < treeAt(plane.x, plane.z) && plane.scrape <= 0) {
      if (plane.agl < 9 && plane.speed > 29) return crash(plane, 'hit the treetops');
      plane.damage += .19;
      plane.scrape = 1.2;
      plane.speed *= .89;
      if (plane.damage < 1) return { type: 'scrape' };
    }
    const flock = Math.hypot(plane.x - 625, plane.z + 532) < 49 && plane.agl > 13 && plane.agl < 42;
    if (flock && !plane.birdEncounter && plane.speed > 29) {
      plane.birdEncounter = true;
      plane.damage += .13;
      return { type: 'bird' };
    }
    if (plane.damage >= 1) return crash(plane, 'structural failure');
  }
  plane.agl = plane.grounded ? 0 : Math.max(0, plane.y - ground);
  return null;
}
