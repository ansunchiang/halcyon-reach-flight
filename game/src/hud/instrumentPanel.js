import { KNOT, heading } from '../core/math.js';
import { dialText, drawAttitude, drawCompass, drawGauge, plate } from './dials.js';

function panelMetal(g, x, y, w, h) {
  const surface = g.createLinearGradient(0, y, 0, y + h);
  for (const [at, color] of [[0, '#4c5c57'], [.048, '#23343a'], [.3, '#172a30'], [1, '#101c23']]) surface.addColorStop(at, color);
  plate(g, x, y, w, h, 10, surface, '#869a88bf');
  const light = g.createRadialGradient(x + w / 2, y + h * .35, 1, x + w / 2, y + h * .35, w / 2);
  light.addColorStop(0, '#f4bd631c');
  light.addColorStop(1, '#00000000');
  plate(g, x + 2, y + 2, w - 4, h - 4, 9, light);
  g.fillStyle = '#93917a';
  g.beginPath();
  for (const dx of [10, w - 11]) for (const dy of [10, h - 10]) {
    g.moveTo(x + dx + 2.5, y + dy);
    g.arc(x + dx, y + dy, 2.5, 0, Math.PI * 2);
  }
  g.fill();
}

export function drawInstrumentPanel(g, w, h, plane, cockpit, night) {
  const speed = Math.round(plane.speed * KNOT);
  const feet = Math.round(plane.y * 3.28084);
  const course = heading(plane.yaw);
  const mph = (at, r) => drawGauge(g, at, r, {
    value: speed, min: 0, max: 160, ticks: 4, label: 'IAS', unit: 'KT', digits: speed, night
  });
  const altitude = (at, r) => drawGauge(g, at, r, {
    value: feet % 1000, min: 0, max: 1000, ticks: 5, label: 'ALT',
    unit: 'FT', digits: feet, night, trim: n => Math.round(n / 100), secondary: Math.min(1, feet / 10000)
  });
  const vertical = (at, r) => drawGauge(g, at, r, {
    value: plane.vy, min: -10, max: 10, ticks: 4, label: 'VSI', unit: 'M/S',
    digits: (plane.vy >= 0 ? '+' : '−') + Math.abs(plane.vy).toFixed(1), night
  });
  if (!cockpit) {
    const wide = w > 970;
    const width = wide ? 456 : 334;
    const base = h - 145;
    const mid = w / 2;
    const r = wide ? 43 : 40;
    const middle = mid - (wide ? 53 : 0);
    const y = base + 55;
    g.globalAlpha = .94;
    panelMetal(g, mid - width / 2, base, width, 109);
    g.globalAlpha = 1;
    mph([middle - 107, y], r);
    drawAttitude(g, [middle, y], r, plane.pitch, plane.roll, night);
    altitude([middle + 107, y], r);
    if (wide) drawCompass(g, [middle + 214, y], r, plane.yaw, night, course);
    return;
  }
  const r = 69;
  const mid = w / 2;
  const spread = r * 2.39;
  const center = 91;
  panelMetal(g, 1, 1, w - 2, h - 2);
  const ins = offset => [mid + offset * spread, center];
  mph(ins(-2), r);
  drawAttitude(g, ins(-1), r, plane.pitch, plane.roll, night);
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
