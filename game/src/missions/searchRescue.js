import { angleDelta, bearing, distance, RAD } from '../core/math.js';
import { FLARE } from '../world/chart.js';
import { elevation } from '../world/elevation.js';

export const RESCUE_TARGET = { ...FLARE, y: elevation(FLARE.x, FLARE.z), label: 'Hiker’s signal flare' };
export const SEARCH_SECTOR = { x: -635, z: -1180, y: 180, label: 'Marten Valley search sector' };

export function advanceSearchRescue(sortie, plane) {
  const range = distance(plane, RESCUE_TARGET);
  if (!sortie.found && range < 460 && !plane.grounded) {
    sortie.found = true;
    return { cue: 'Flare spotted · orbit for a position fix' };
  }
  if (!sortie.found || sortie.located) return;
  const angle = bearing(RESCUE_TARGET, plane);
  if (range > 109 && range < 410 && plane.agl > 26 && plane.agl < 400 && !plane.grounded) {
    if (sortie.lastOrbit !== null) {
      sortie.orbit += angleDelta(sortie.lastOrbit, angle);
    }
    if (Math.abs(sortie.orbit) >= 245 * RAD) {
      sortie.located = true;
      return { cue: 'Position transmitted · return to Gullhaven' };
    }
    sortie.lastOrbit = angle;
  } else {
    sortie.lastOrbit = null;
  }
}
