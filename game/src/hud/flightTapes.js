import { clamp, heading, KNOT, RAD } from '../core/math.js';
import { dialText, line, plate } from './dials.js';

const ink = '#e9f2d7';
const mint = '#c5ead1';
const gold = '#f8cf93';

function pointer(g, x, y, size, color, turn) {
  g.save();
  g.translate(x, y);
  g.rotate(turn);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(size * .72, size * .57);
  g.lineTo(-size * .72, size * .57);
  g.closePath();
  g.fill();
  g.restore();
}

function drawHeading(g, w, yaw, target) {
  const center = w / 2;
  const width = Math.min(322, w * .28);
  const x = center - width / 2;
  const y = w > 900 ? 24 : 13;
  const unit = width / 91;
  const course = yaw / RAD;
  plate(g, x, y, width, 50, 5, '#112427a8', '#cbdbbd8c');
  g.save();
  plate(g, x + 3, y, width - 6, 52, 4);
  g.clip();
  for (let deg = Math.floor((course - 49) / 5) * 5; deg <= course + 49; deg += 5) {
    const pos = center + (deg - course) * unit;
    const wrapped = (deg % 360 + 360) % 360;
    const major = wrapped % 15 === 0;
    line(g, pos, y + 13, pos, y + (major ? 23 : 18), '#deebcdbf', major ? 1.4 : 1);
    if (!major) continue;
    const label = wrapped % 90 === 0 ? ['N', 'E', 'S', 'W'][wrapped / 90] : String(wrapped).padStart(3, '0');
    dialText(g, label, pos, y + 35, ink, 11);
  }
  const arrow = center + clamp(target / RAD, -42, 42) * unit;
  pointer(g, arrow, y + 7, 5.2, '#f2b872', Math.PI);
  g.restore();
  plate(g, center - 38, y + 46, 76, 27, 3, '#102327', '#a6cdb6ba');
  dialText(g, heading(yaw), center, y + 59, '#fff0c9', 18);
}

function drawTape(g, { x, y, width, height, speed, raw, cockpit }) {
  const mid = x + width / 2;
  const center = y + height / 2;
  const lineX = speed ? x + width - 1 : x + 1;
  const step = speed ? 5 : 25;
  const period = speed ? 3.6 : .68;
  g.lineWidth = 1;
  plate(g, x, y, width, height, 4, '#123133a3', '#bddaca84');
  g.save();
  plate(g, x, y + 25, width, height - 50, 1);
  g.clip();
  for (let index = Math.floor((raw - height / period) / step); index <= Math.ceil((raw + height / period) / step); index++) {
    const value = index * step;
    if (value < 0) continue;
    const offset = center + (raw - value) * period;
    const mark = speed ? index % 2 === 0 : index % 4 === 0;
    line(g, lineX, offset, lineX + (speed ? -1 : 1) * (mark ? 13 : 7), offset, '#d9ecd0a9', mark ? 1.3 : .8);
    if (mark) dialText(g, value, mid, offset, ink, 10.5);
  }
  g.restore();
  for (const edge of [y + 24, y + height - 24]) line(g, x + 5, edge, x + width - 5, edge, '#bad7bc61');
  dialText(g, speed ? 'AIRSPEED' : 'ALTITUDE', mid, y + 12, mint, cockpit ? 9 : 10.5);
  dialText(g, speed ? 'KT IAS' : 'FT MSL', mid, y + height - 11, mint, 9);
  const boxWidth = width + 16;
  plate(g, speed ? x - 3 : x - 13, center - 20, boxWidth, 40, 4, '#10262a', '#c7e6cfdd');
  pointer(g, speed ? x + width + 8 : x - 8, center, 6.2, '#e9e9ba', speed ? Math.PI / 2 : -Math.PI / 2);
  dialText(g, Math.round(raw), mid + (speed ? 1 : -1), center, '#fff0ca', 24);
}

function drawFlightReference(g, w, h, plane, cockpit) {
  const cx = w / 2;
  const cy = h * (cockpit ? .477 : .478);
  g.save();
  g.translate(cx, cy);
  g.rotate(plane.roll * .89);
  const horizon = clamp(plane.pitch * 248, -98, 104);
  for (let i = -2; i <= 2; i++) {
    const y = horizon + 28 * i;
    const middle = i === 0;
    const ox = middle ? 76 : 52;
    const color = middle ? '#d7f3d9b8' : '#d7f3d970';
    for (const side of [-1, 1]) {
      line(g, side * ox, y, side * 28, y, color, middle ? 1.5 : 1);
      if (middle) continue;
      line(g, side * 28, y, side * 28, y + Math.sign(i) * 5, color);
      dialText(g, Math.abs(i * 5), side * (ox + 9), y, color, 8);
    }
  }
  g.restore();
  const gamma = Math.atan2(plane.vy, Math.max(12, plane.speed));
  const pip = cy - gamma * 225;
  g.strokeStyle = '#e9f7d0df';
  g.lineWidth = 1.35;
  g.beginPath();
  g.arc(cx, pip, 5.7, 0, Math.PI * 2);
  g.stroke();
  line(g, cx - 13, pip, cx - 6, pip, '#d5efc7bb');
  line(g, cx + 6, pip, cx + 13, pip, '#d5efc7bb');
}

function drawVerticalRate(g, x, y, rate) {
  plate(g, x, y, 79, 50, 3, '#132b30dd', '#bad6c389');
  dialText(g, 'V/S  M/S', x + 39.5, y + 12, mint, 9);
  const formatted = (rate < -.05 ? '−' : '+') + Math.abs(rate).toFixed(1);
  dialText(g, formatted, x + 39.5, y + 32, gold, 16);
}

export function drawFlightTapes(g, w, h, plane, angle, cockpit, objective, clean) {
  if (!clean) drawFlightReference(g, w, h, plane, cockpit);
  drawHeading(g, w, plane.yaw, angle);
  if (objective.kind === 'landing') {
    const wind = plane.wind?.x ?? 0;
    const label = (wind >= 0 ? 'W WIND → ' : '← E WIND ') + Math.round(Math.abs(wind) * KNOT) + ' KT';
    const windY = w > 900 ? 103 : 92;
    g.lineWidth = 1;
    plate(g, w / 2 - 63, windY, 126, 20, 3, '#142831c8', '#bdc9b47f');
    dialText(g, label, w / 2, windY + 10.5, gold, 10);
  }
  if (clean && cockpit) return;
  const height = Math.min(h * .30, clean ? 185 : 210);
  const y = Math.max(170, h * .43 - height * .5);
  const width = !clean && w > 900 ? 65 : 55;
  const x = w > 900 ? 32 : 15;
  const right = w - x - width;
  drawTape(g, { x, y, width, height, speed: true, raw: plane.speed * KNOT, cockpit });
  drawTape(g, { x: right, y, width, height, raw: plane.y * 3.28084, cockpit });
  if (clean) return;
  plate(g, right - 5, y + height + 8, width + 10, 29, 3, '#142c30e8', '#b9dec283');
  dialText(g, 'RAD ' + Math.round(plane.agl) + ' m', right + width / 2, y + height + 23, mint, 11);
  drawVerticalRate(g, x - 4, y + height + 9, plane.vy);
}
