import { angleDelta, clamp, KNOT, RAD } from '../core/math.js';
import { fieldOffset } from '../world/chart.js';

export function gradeTouchdown(plane, field) {
  const { across, along } = fieldOffset(field, plane.x, plane.z);
  const sink = Math.max(0, -plane.vy);
  const reciprocal = along > 0 ? field.course + Math.PI : field.course;
  const course = Math.abs(angleDelta(plane.yaw, reciprocal)) / RAD;
  const fromThreshold = field.length / 2 - Math.abs(along);
  const zone = fromThreshold >= 6 && fromThreshold <= field.length * .38;
  let grade = 'FIRM';
  if (sink < 1.9 && Math.abs(across) < field.width * .24 && course < 14) grade = 'GREASED';
  if (sink > 4.1 || Math.abs(plane.roll) > .32 || course > 34) grade = 'HARD';
  return {
    field, sink, across: Math.abs(across), along, fromThreshold, course, zone, grade,
    speed: plane.speed * KNOT
  };
}

export function touchdownDamage(landing, gear) {
  if (!gear) return .43 + landing.sink * .042;
  return clamp((landing.sink - 3.7) * .082, 0, .7) + Math.max(0, (landing.course - 27) * .005);
}
