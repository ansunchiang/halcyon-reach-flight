import { clamp, RAD, TAU } from '../core/math.js';

export function plate(g, x, y, width, height, radius, fill, stroke = null) {
  g.beginPath();
  g.roundRect(x, y, width, height, radius);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.stroke(); }
}

export function dialText(g, text, x, y, color, size = 11, align = 'center', family = 'monospace') {
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.font = '600 ' + size + 'px ' + family;
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function circle(g, radius, color, stroke) {
  g.beginPath();
  g.arc(0, 0, radius, 0, TAU);
  if (color) { g.fillStyle = color; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.stroke(); }
}

function line(g, x1, y1, x2, y2, color, weight = 1) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineWidth = weight;
  g.strokeStyle = color;
  g.stroke();
}

function screw(g, x, y) {
  g.save();
  g.translate(x, y);
  circle(g, 3.1, '#6e786f', '#141b1b');
  line(g, -1.4, 1.2, 1.4, -1.2, '#252b26', .8);
  g.restore();
}

function bezel(g, x, y, r, night) {
  g.save();
  g.translate(x, y);
  const steel = g.createLinearGradient(-r, -r, r * .5, r);
  steel.addColorStop(0, night ? '#93816a' : '#a79a80');
  steel.addColorStop(.28, '#4d5553');
  steel.addColorStop(.48, '#1d292a');
  steel.addColorStop(.81, '#3f4641');
  steel.addColorStop(1, '#101818');
  g.lineWidth = 2.7;
  circle(g, r + 4, '#101819', '#080f13');
  g.lineWidth = 1.1;
  circle(g, r + 1, steel, '#53615a');
  const interior = g.createRadialGradient(-r * .32, -r * .24, r * .17, 0, 0, r);
  interior.addColorStop(0, night ? '#2b2422' : '#203833');
  interior.addColorStop(.84, '#111c20');
  interior.addColorStop(1, '#10191d');
  circle(g, r - 5, interior, '#6e7761');
  const s = r * .72;
  for (const [dx, dy] of [[s, s], [s, -s], [-s, s], [-s, -s]]) screw(g, dx, dy);
}

function needle(g, angle, r, ink, width = 3.3) {
  g.save();
  g.rotate(angle);
  g.beginPath();
  g.moveTo(0, -r);
  g.lineTo(width / 2, 8);
  g.lineTo(-width / 2, 8);
  g.closePath();
  g.shadowColor = ink;
  g.shadowBlur = 4;
  g.fillStyle = ink;
  g.fill();
  g.restore();
}

export function drawGauge(g, at, r, options) {
  const { value, min, max, label, ticks, unit, night, digits, trim = null, secondary = null } = options;
  const amber = night ? '#ffe0a1' : '#f3dcaa';
  const mint = night ? '#fce1a7' : '#c4e5c1';
  bezel(g, at[0], at[1], r, night);
  const start = -135 * RAD;
  const sweep = 270 * RAD;
  for (let i = 0; i <= ticks * 4; i++) {
    const part = i / (ticks * 4);
    const a = start + sweep * part;
    const primary = i % 4 === 0;
    g.save();
    g.rotate(a);
    line(g, 0, -r + 8, 0, -r + (primary ? 15 : 11), primary ? amber : '#99a087', primary ? 1.38 : .8);
    g.restore();
    if (primary) {
      const n = min + (max - min) * part;
      dialText(g, trim ? trim(n) : Math.round(n), Math.sin(a) * (r - 22),
        -Math.cos(a) * (r - 22), mint, r >= 64 ? 10 : 8);
    }
  }
  dialText(g, label, 0, -r * .39, amber, r >= 62 ? 10 : 8.5);
  dialText(g, unit, 0, -r * .19, '#afb3a1', 7);
  if (secondary !== null) needle(g, start + sweep * clamp(secondary, 0, 1), r * .51, '#9cbec1', 2.7);
  const a = start + sweep * clamp((value - min) / (max - min), 0, 1);
  needle(g, a, r - 13, '#fff0cc');
  circle(g, 4.5, '#b6925b', '#4f4735');
  if (digits !== undefined) {
    g.lineWidth = 1;
    plate(g, -r * .36, r * .39, r * .72, r * .32, 3, '#112528', '#759087ad');
    dialText(g, digits, 0, r * .55, night ? '#ffd58c' : '#d4edc7', r >= 62 ? 13 : 11);
  }
  g.restore();
}

export function drawAttitude(g, at, r, pitch, roll, night) {
  bezel(g, at[0], at[1], r, night);
  g.save();
  const radius = r * .83;
  circle(g, radius, null);
  g.clip();
  const inclination = clamp(pitch * 118, -r * 1.1, r * 1.1);
  g.rotate(roll);
  const sky = g.createLinearGradient(0, -radius, 0, radius);
  sky.addColorStop(0, '#315d79');
  sky.addColorStop(1, '#6b9dad');
  g.fillStyle = sky;
  g.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  const earth = g.createLinearGradient(0, inclination, 0, inclination + r);
  earth.addColorStop(0, '#977044');
  earth.addColorStop(1, '#4b3b32');
  g.fillStyle = earth;
  g.fillRect(-r * 2, inclination, r * 4, r * 3);
  line(g, -r, inclination, r, inclination, '#ffdfb0', 1.8);
  for (let i = -2; i <= 2; i++) {
    if (!i) continue;
    const y = inclination + i * r * .24;
    const extent = Math.abs(i) === 1 ? r * .20 : r * .27;
    line(g, -extent, y, extent, y, '#f5e9c99a', .9);
  }
  g.restore();
  circle(g, radius, null, '#95aa91');
  for (const degrees of [-60, -45, -30, -20, 0, 20, 30, 45, 60]) {
    g.save();
    g.rotate(degrees * RAD);
    line(g, 0, -radius + 1, 0, -radius + 6, '#f7dfad', degrees % 30 === 0 ? 2 : 1);
    g.restore();
  }
  g.fillStyle = '#ffcd7b';
  g.beginPath();
  g.moveTo(0, -radius + 10);
  g.lineTo(-4, -radius + 3);
  g.lineTo(4, -radius + 3);
  g.fill();
  line(g, -r * .61, .8, -r * .26, .8, '#172325', 6.0);
  line(g, r * .26, .8, r * .61, .8, '#172325', 6.0);
  line(g, -r * .60, 0, -r * .29, 0, '#ffd487', 3);
  line(g, r * .29, 0, r * .60, 0, '#ffd487', 3);
  circle(g, 3.8, '#ffd487', '#1a2a2b');
  dialText(g, 'ATTITUDE', 0, r * .63, '#fee6b7', 8);
  g.restore();
}

export function drawCompass(g, at, r, course, night, label) {
  bezel(g, at[0], at[1], r, night);
  for (let i = 0; i < 36; i++) {
    const angle = i * 10 * RAD - course;
    g.save();
    g.rotate(angle);
    line(g, 0, -r + 7, 0, -r + (i % 3 === 0 ? 16 : 12), '#ebd6a3', i % 3 === 0 ? 1.5 : .8);
    if (i % 3 === 0) {
      const name = i % 9 === 0 ? ['N', 'E', 'S', 'W'][i / 9] : i;
      dialText(g, name, 0, -r + 22, '#dce9ba', i % 9 === 0 ? 11 : 8);
    }
    g.restore();
  }
  line(g, 0, -r * .57, 0, r * .40, '#e3b679', 2.2);
  line(g, -r * .32, -r * .04, r * .32, -r * .04, '#e3b679', 2.7);
  line(g, -r * .14, r * .30, r * .14, r * .30, '#e3b679', 2);
  plate(g, -r * .36, r * .44, r * .72, r * .28, 3, '#12282a', '#88a4919c');
  dialText(g, label, 0, r * .58, '#f7d6a2', 12);
  g.restore();
}
