import { clamp, ease, RAD } from '../core/math.js';

export function computeLift(speed, pitch, verticalSpeed, flaps, damage) {
  const pathAngle = Math.atan2(verticalSpeed, Math.max(7, speed));
  const alpha = pitch - pathAngle + 2.4 * RAD;
  const stallAngle = (17 - flaps * .65 - damage * 3) * RAD;
  const separation = ease(stallAngle, stallAngle + 12 * RAD, Math.abs(alpha));
  const coefficient = (.24 + 4.15 * clamp(alpha, -.26, stallAngle) + flaps * .135) * (1 - separation * .74);
  const lift = .0118 * speed ** 2 * coefficient * (1 - .22 * damage);
  return {
    alpha, lift, separation,
    warn: alpha > stallAngle - 2.7 * RAD && speed > 9,
    drag: (.00185 + Math.abs(alpha) * .0032 + flaps * .00048) * speed ** 2
  };
}

export function controlAuthority(speed, damage) {
  return (.32 + .68 * ease(7, 52, speed)) * (1 - damage * .53);
}
