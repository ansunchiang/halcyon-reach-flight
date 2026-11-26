import { ease, mix, noise } from '../core/math.js';
import { FIELDS, LAKE, fieldOffset } from './chart.js';

function ellipse(x, z, cx, cz, rx, rz) {
  return Math.hypot((x - cx) / rx, (z - cz) / rz);
}

const PEAKS = [
  [-1560, -1500, 640, 620, 770], [-1280, -1870, 940, 680, 920],
  [-1040, -2270, 1150, 590, 760], [-620, -2520, 870, 590, 680],
  [-1820, -2130, 826, 590, 820], [-750, -3130, 1120, 650, 825],
  [70, -3040, 820, 670, 730], [760, -3190, 665, 640, 730],
  [1740, -2340, 475, 510, 660], [1750, -1400, 320, 490, 600],
  [-2070, 480, 308, 570, 650], [-2570, 610, 380, 490, 510],
  [2840, -2490, 735, 790, 950], [-3400, -3310, 1440, 1020, 1260],
  [-2350, -3620, 1240, 1100, 980]
];

export function lakeRadius(x, z) {
  return ellipse(x, z, LAKE.x + 52 * Math.sin((z + 1220) / 247), LAKE.z, LAKE.width, LAKE.length)
    + (noise(x / 119, z / 119) - .5) * .14;
}

export function riverCenter(z) {
  return 700 + 172 * Math.sin((z + 450) / 460) + 41 * Math.sin(z / 137);
}

export function elevation(x, z) {
  const coastNoise = (noise(x / 530 + 12, z / 480) - .5) * .16
    + (noise(x / 187, z / 185 - 17) - .5) * .06;
  const mainland = ellipse(x, z, 30, -1230, 2310, 1770) + coastNoise;
  const cinder = ellipse(x, z, -2070, 620, 940, 520) + coastNoise;
  const east = ellipse(x, z, 2510, -880, 570, 1250) + coastNoise;
  const outlier = ellipse(x, z, -3990, -3160, 1950, 1510) + coastNoise;
  const north = ellipse(x, z, -910, -3320, 2890, 1250) + coastNoise;
  const land = 1 - Math.min(mainland, cinder, east, outlier, north);
  const rough = .52 * noise(x / 184, z / 184) + .29 * noise(x / 64, z / 64)
    + .19 * noise(x / 28, z / 28);
  let altitude = land < 0 ? Math.max(-100, land * 235) : 3 + land * 108 + (rough - .45) * 77 * ease(.008, .12, land);
  let mountain = 0;
  for (const [cx, cz, height, width, depth] of PEAKS) {
    const dx = x - cx;
    const dz = z - cz;
    const radius = Math.hypot((dx + dz * .23) / width, dz / depth);
    if (radius > 1.52) continue;
    const angle = Math.atan2(dz, dx);
    const spurs = 1 + .17 * Math.sin(angle * 3 + cx * .011) + .09 * Math.cos(angle * 5 + cz * .017);
    const ridge = Math.max(0, 1 - radius * spurs + (rough - .48) * .50);
    mountain = Math.max(mountain, height * ridge ** 1.51);
  }
  altitude += mountain * ease(-.03, .10, land);
  const lake = lakeRadius(x, z);
  if (lake < 1.15) {
    const bed = LAKE.y + (lake - 1) * 66;
    altitude = mix(bed, altitude, ease(1.015, 1.15, lake));
  }
  const riverDistance = Math.abs(x - riverCenter(z));
  if (z > -855 && z < 500 && riverDistance < 154) {
    const level = Math.max(-14, 28 * (-z + 70) / 930);
    altitude = mix(level - 4 + riverDistance * .10, altitude, ease(29, 154, riverDistance));
  }
  for (const field of FIELDS) {
    const { across, along } = fieldOffset(field, x, z);
    const margin = field.id === 'gull' ? 152 : 70;
    const border = Math.max(Math.abs(across) - field.width / 2 - 21, Math.abs(along) - field.length / 2 - 23);
    altitude = mix(field.y, altitude, ease(0, margin, border));
    if (field.id === 'tarn') {
      const runwayEnd = Math.abs(along) - field.length / 2;
      const corridor = (1 - ease(29, 144, Math.abs(across))) * (1 - ease(251, 370, runwayEnd));
      const grade = field.y - ease(22, 250, runwayEnd) * 6;
      altitude = mix(Math.min(grade, altitude), altitude, 1 - corridor);
    }
  }
  return altitude;
}

export function waterLevel(x, z) {
  if (lakeRadius(x, z) < 1.01) return LAKE.y;
  if (z > -855 && z < 500 && Math.abs(x - riverCenter(z)) < 38) {
    return Math.max(0, 28 * (-z + 70) / 930);
  }
  return 0;
}

export function surfaceHeight(x, z) {
  return Math.max(elevation(x, z), waterLevel(x, z));
}
