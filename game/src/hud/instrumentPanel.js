import { KNOT, heading } from '../core/math.js';
import { dialText, drawAttitude, drawCompass, drawGauge, plate } from './dials.js';

function panelMetal(g, x, y, w, h) {
  const surface = g.createLinearGradient(0, y, 0, y + h);
  surface.addColorStop(0, '#4c5c57');
  surface.addColorStop(.048, '#23343a');
  surface.addColorStop(.3, '#172a30');
  surface.addColorStop(1, '#101c23');
  plate(g, x, y, w, h, 10, surface, '#869a88bf');
  const light = g.createRadialGradient(x + w / 2, y + h * .35, 1, x + w / 2, y + h * .35, w / 2);
  light.addColorStop(0, '#f4bd631c');
  light.addColorStop(1, '#00000000');
  plate(g, x + 2, y + 2, w - 4, h - 4, 9, light);
  g.beginPath();
  for (const column of [x + 10, x + w - 11]) {
    for (const row of [y + 10, y + h - 10]) {
      g.moveTo(column + 2.5, row);
      g.arc(column, row, 2.5, 0, Math.PI * 2);
    }
  }
  g.fillStyle = '#93917a';
  g.fill();
}

function cockpitFrame(g, w, h, night) {
  const rail = g.createLinearGradient(0, 0, 150, 0);
  rail.addColorStop(0, '#131e26');
  rail.addColorStop(.65, '#344247');
  rail.addColorStop(1, '#132227');
  g.strokeStyle = rail;
  g.lineWidth = 25;
  g.beginPath();
  g.moveTo(-23, h * .68);
  g.lineTo(w * .105, h * .085);
  g.lineTo(w * .265, -16);
  g.moveTo(w + 23, h * .68);
  g.lineTo(w * .894, h * .085);
  g.lineTo(w * .735, -16);
  g.stroke();
  g.strokeStyle = '#9aa39c76';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-7, h * .66);
  g.lineTo(w * .111, h * .092);
  g.lineTo(w * .267, -7);
  g.moveTo(w + 7, h * .66);
  g.lineTo(w * .889, h * .092);
  g.lineTo(w * .733, -7);
  g.stroke();
  const hood = g.createLinearGradient(0, h * .66, 0, h);
  hood.addColorStop(0, night ? '#3a454d' : '#5e7070');
  hood.addColorStop(.15, '#182830');
  hood.addColorStop(.55, '#101f26');
  hood.addColorStop(1, '#0c151d');
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(0, h * .775);
  g.bezierCurveTo(w * .16, h * .77, w * .23, h * .669, w * .405, h * .67);
  g.lineTo(w * .595, h * .67);
  g.bezierCurveTo(w * .77, h * .669, w * .84, h * .77, w, h * .775);
  g.lineTo(w, h);
  g.closePath();
  g.fillStyle = hood;
  g.fill();
  g.strokeStyle = '#89978a85';
  g.lineWidth = 2;
  g.stroke();
  g.strokeStyle = '#e5bf8644';
  g.lineWidth = 1;
  g.setLineDash([2, 5]);
  g.beginPath();
  g.moveTo(w * .16, h * .758);
  g.quadraticCurveTo(w * .30, h * .688, w * .405, h * .684);
  g.lineTo(w * .595, h * .684);
  g.quadraticCurveTo(w * .70, h * .688, w * .84, h * .758);
  g.stroke();
  g.setLineDash([]);
}

export function drawInstrumentPanel(g, w, h, plane, cockpit, night) {
  const speed = Math.round(plane.speed * KNOT);
  const feet = Math.round(plane.y * 3.28084);
  const course = heading(plane.yaw);
  const mph = (at, r) => drawGauge(g, at, r, {
    value: speed, min: 0, max: 160, ticks: 8, label: 'AIRSPEED', unit: 'KNOTS', digits: speed, night
  });
  const altitude = (at, r) => drawGauge(g, at, r, {
    value: feet % 1000, min: 0, max: 1000, ticks: 5, label: 'ALTIMETER',
    unit: 'FEET', digits: feet, night, trim: n => Math.round(n / 100), secondary: Math.min(1, feet / 10000)
  });
  const vertical = (at, r) => drawGauge(g, at, r, {
    value: plane.vy, min: -10, max: 10, ticks: 4, label: 'VERT SPEED', unit: 'M/S',
    digits: (plane.vy >= 0 ? '+' : '−') + Math.abs(plane.vy).toFixed(1), night
  });
  if (!cockpit) {
    const wide = w > 970;
    const width = wide ? 475 : 346;
    const base = h - 155;
    const mid = w / 2;
    panelMetal(g, mid - width / 2, base, width, 121);
    dialText(g, 'PETREL SK-2  /  FLIGHT INSTRUMENTS', mid, base + 14, '#c9cdb1', 9.7);
    if (wide) {
      mph([mid - 164, base + 68], 43);
      drawAttitude(g, [mid - 53, base + 68], 43, plane.pitch, plane.roll, night);
      altitude([mid + 55, base + 68], 43);
      drawCompass(g, [mid + 163, base + 68], 43, plane.yaw, night, course);
    } else {
      mph([mid - 107, base + 68], 40);
      drawAttitude(g, [mid, base + 68], 40, plane.pitch, plane.roll, night);
      altitude([mid + 107, base + 68], 40);
    }
    return;
  }
  cockpitFrame(g, w, h, night);
  const size = Math.min(67, (w - 420) / 11.8, h * .091);
  const r = Math.max(37, size);
  const mid = w / 2;
  const base = h - 2.45 * r;
  const spread = r * 2.19;
  const center = base + r + 6;
  const width = r * 11.45;
  panelMetal(g, mid - width / 2, base - 12, width, r * 2.18 + 58);
  const ins = offset => [mid + offset * spread, center];
  const angle = plane.roll;
  mph(ins(-2), r);
  drawAttitude(g, ins(-1), r, plane.pitch, angle, night);
  altitude(ins(0), r);
  drawCompass(g, ins(1), r, plane.yaw, night, course);
  vertical(ins(2), r);
  const statusY = center + r + 17;
  const fixtures = [
    ['FUEL', plane.fuel.toFixed(1) + ' L', plane.fuel < 12 ? '#ffb879' : '#bde1bd'],
    ['RPM', String(Math.round(700 + plane.power * 1990)), '#e7d4a7'],
    ['FLAPS', ['UP', '10°', '20°', '35°'][plane.flaps], '#f1c794'],
    ['GEAR', plane.gear ? '● DOWN' : '○ UP', plane.gear ? '#a2e0a4' : '#dbac78'],
    ['RAD ALT', Math.round(plane.agl) + ' m', '#e4d7b5']
  ];
  for (const [i, [name, value, color]] of fixtures.entries()) {
    const x = mid + (i - 2) * spread;
    plate(g, x - r * .91, statusY - 9, r * 1.82, 20, 3, '#0b191b', '#78897aa5');
    dialText(g, name, x - r * .79, statusY + 1, '#a9b5a1', 9, 'left');
    dialText(g, value, x + r * .77, statusY + 1, color, 11, 'right');
  }
}
