import { bearing } from '../core/math.js';

const route = [
  [-1320, 125, 674, 48], [-920, 125, 540, 44], [-448, 121, 526, 47], [115, 111, 437, 44],
  [158, 139, -99, 42], [66, 179, -624, 38], [-249, 210, -1105, 35], [-593, 280, -1450, 39]
];

export const GATES = route.map(([x, y, z, radius], index) => {
  const before = route[index - 1] ?? [-1850, 100, 680];
  const approach = bearing({ x: before[0], z: before[2] }, { x, z });
  return { x, y, z, radius, course: index === 3 ? .15 : approach };
});

export function advanceRingRun(sortie, before, plane) {
  const gate = GATES[sortie.gate];
  const ax = Math.sin(gate.course);
  const az = -Math.cos(gate.course);
  const near = (before.x - gate.x) * ax + (before.z - gate.z) * az;
  const far = (plane.x - gate.x) * ax + (plane.z - gate.z) * az;
  if (near > 0 || far <= 0) return;
  const crossing = -near / (far - near);
  const x = before.x + (plane.x - before.x) * crossing - gate.x;
  const y = before.y + (plane.y - before.y) * crossing - gate.y;
  const z = before.z + (plane.z - before.z) * crossing - gate.z;
  const error = Math.hypot(x, y, z);
  if (error > gate.radius) {
    if (error < gate.radius * 3) sortie.missed = 'Outside gate · circle back and cross from the approach side';
    return;
  }
  sortie.missed = '';
  sortie.accuracy += 1 - error / gate.radius;
  sortie.gate++;
  if (sortie.gate === GATES.length) return { finish: true, cue: 'Course complete' };
  return { cue: 'Gate ' + sortie.gate + ' cleared' };
}
