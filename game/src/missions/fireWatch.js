import { distance } from '../core/math.js';
import { FIRE, LAKE } from '../world/chart.js';
import { elevation, lakeRadius } from '../world/elevation.js';

export const FIRE_TARGET = { ...FIRE, y: elevation(FIRE.x, FIRE.z), label: 'Marten Ridge fire' };
export const LAKE_TARGET = { ...LAKE, label: 'Tarn Lake scoop lane' };

export function advanceFireWatch(sortie, plane, action, dt) {
  if (!plane.gear && !plane.grounded && lakeRadius(plane.x, plane.z) < .91 &&
    plane.y - LAKE.y > 1.8 && plane.y - LAKE.y < 11 && plane.speed > 23 && plane.speed < 48 && Math.abs(plane.roll) < .37) {
    plane.load = Math.min(1, plane.load + dt * .26);
    if (plane.load >= 1 && !sortie.scooped) {
      sortie.scooped = true;
      return { cue: 'Tank full · climb toward the smoke' };
    }
  }
  if (!action) return;
  if (plane.load < .65) return { cue: 'Water tank too low · scoop at Tarn Lake' };
  const fall = Math.sqrt(Math.max(0, plane.y - FIRE_TARGET.y) * 2 / 9.81);
  const impact = {
    x: plane.x + Math.sin(plane.yaw) * plane.speed * fall * .46,
    z: plane.z - Math.cos(plane.yaw) * plane.speed * fall * .46
  };
  const error = distance(impact, FIRE_TARGET);
  const load = plane.load;
  plane.load = 0;
  if (plane.agl > 16 && plane.agl < 148 && error < 98 && Math.abs(plane.roll) < .5) {
    sortie.dropQuality = Math.max(.12, (1 - error / 118) * load);
    return { finish: true, drop: true, cue: 'Water on the fire line' };
  }
  return { drop: true, cue: 'Drop missed · refill and try another pass' };
}
