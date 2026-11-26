import { clamp, distance, mix, RAD, TAU } from '../core/math.js';
import { FIELDS, HARBOR, LAKE, MAP, fieldPoint } from '../world/chart.js';
import { elevation, waterLevel } from '../world/elevation.js';
import { GATES } from '../missions/ringRun.js';
import { FIRE_TARGET } from '../missions/fireWatch.js';
import { RESCUE_TARGET, SEARCH_SECTOR } from '../missions/searchRescue.js';

function project(point, width, height) {
  return [(point.x - MAP.west) / (MAP.east - MAP.west) * width,
    (point.z - MAP.north) / (MAP.south - MAP.north) * height];
}

function chartTerrain() {
  const sheet = document.createElement('canvas');
  sheet.width = 422;
  sheet.height = 354;
  const g = sheet.getContext('2d');
  const { width, height } = sheet;
  const image = g.createImageData(width, height);
  const dx = (MAP.east - MAP.west) / width;
  const dz = (MAP.south - MAP.north) / height;
  const samples = new Float32Array((width + 2) * (height + 2));
  const stride = width + 2;
  for (let j = 0; j < height + 2; j++) {
    for (let i = 0; i < width + 2; i++) samples[j * stride + i] = elevation(MAP.west + i * dx, MAP.north + j * dz);
  }
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = MAP.west + i * dx;
      const z = MAP.north + j * dz;
      const y = samples[j * stride + i];
      const grade = samples[j * stride + i + 1] - samples[(j + 1) * stride + i];
      const edge = Math.floor(y / 120) !== Math.floor(samples[j * stride + i + 1] / 120) ||
        Math.floor(y / 120) !== Math.floor(samples[(j + 1) * stride + i] / 120);
      let color;
      if (y <= waterLevel(x, z) + .13) {
        const depth = Math.min(1, Math.abs(y - waterLevel(x, z)) / 72);
        color = [mix(64, 24, depth), mix(120, 58, depth), mix(123, 70, depth)];
      } else {
        const altitude = clamp(y / 820, 0, 1);
        const shade = clamp(grade * .43, -22, 20) - (edge ? 22 : 0);
        const shore = y < 8 ? 36 : 0;
        color = [mix(104, 212, altitude) + shade + shore, mix(136, 211, altitude) + shade + shore * .8,
          mix(93, 182, altitude) + shade + shore * .6];
      }
      const offset = 4 * (j * width + i);
      image.data.set([...color, 255], offset);
    }
  }
  g.putImageData(image, 0, 0);
  return sheet;
}

function label(g, content, x, y, color, size, italic = false) {
  g.font = (italic ? 'italic ' : 'bold ') + size + 'px ' + (italic ? 'Georgia' : 'monospace');
  g.fillStyle = color;
  g.lineWidth = 3.6;
  g.strokeStyle = '#172d32d9';
  g.strokeText(content, x, y);
  g.fillText(content, x, y);
}

function chartLines(g, width, height, spacing) {
  g.strokeStyle = '#e6e6c62b';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = spacing; x < width; x += spacing) {
    g.moveTo(x, 0);
    g.lineTo(x, height);
  }
  for (let y = spacing; y < height; y += spacing) {
    g.moveTo(0, y);
    g.lineTo(width, y);
  }
  g.stroke();
}

function addAirfields(g, width, height, big) {
  for (const field of FIELDS) {
    const [x, y] = project(field, width, height);
    g.save();
    g.translate(x, y);
    g.rotate(field.course);
    g.strokeStyle = '#102427';
    g.fillStyle = '#f7e5bf';
    g.lineWidth = 2;
    const length = big ? 22 : 10;
    g.strokeRect(-2.8, -length / 2, 5.6, length);
    g.fillRect(-2.8, -length / 2, 5.6, length);
    g.restore();
    label(g, big ? field.name.toUpperCase() : field.code, x + 9, y + 5, '#fff1d0', big ? 14 : 10);
  }
}

function routeFor(id) {
  const gull = FIELDS[0];
  const tarn = FIELDS[1];
  if (id === 'ring') return [FIELDS[2], ...GATES];
  if (id === 'mail') return [gull, { x: 750, z: -385 }, fieldPoint(tarn, 0, -505), tarn];
  if (id === 'fire') return [tarn, LAKE, FIRE_TARGET];
  if (id === 'rescue') return [gull, SEARCH_SECTOR, RESCUE_TARGET, gull];
  return [{ x: gull.x - 13, z: 1020 }, fieldPoint(gull, 0, -350), gull];
}

export function createFlightCharts(dispatch, minimap) {
  const base = chartTerrain();
  const mini = minimap.getContext('2d');
  const board = dispatch.getContext('2d');
  const backdrop = document.createElement('canvas');
  backdrop.width = minimap.width;
  backdrop.height = minimap.height;
  const bg = backdrop.getContext('2d');
  bg.drawImage(base, 0, 0, minimap.width, minimap.height);
  bg.fillStyle = '#112c3140';
  bg.fillRect(0, 0, minimap.width, minimap.height);
  chartLines(bg, minimap.width, minimap.height, 31);
  addAirfields(bg, minimap.width, minimap.height, false);

  function drawDispatch(id) {
    const { width, height } = dispatch;
    board.drawImage(base, 0, 0, width, height);
    chartLines(board, width, height, 64);
    for (const [index, x] of [19, 83, 147, 211, 275, 339, 403, 467, 531, 595, 659].entries()) {
      label(board, String(index + 12), x, 17, '#dedbc4', 11);
    }
    for (const [name, point] of [
      ['Marten Range', { x: -1840, z: -2550 }], ['Tarn Lake', { x: 495, z: -1120 }],
      ['Halcyon Sound', { x: -1100, z: 1060 }], ['Eastern Reach', { x: 1135, z: -115 }]
    ]) {
      const [x, y] = project(point, width, height);
      label(board, name, x, y, '#e4e2c8', 21, true);
    }
    const route = routeFor(id);
    board.beginPath();
    for (const [i, point] of route.entries()) {
      const [x, y] = project(point, width, height);
      if (i) board.lineTo(x, y);
      else board.moveTo(x, y);
    }
    board.lineWidth = 7;
    board.strokeStyle = '#14282ba1';
    board.stroke();
    board.lineWidth = 2.8;
    board.strokeStyle = '#ffcf83';
    board.setLineDash([7, 5]);
    board.stroke();
    board.setLineDash([]);
    for (const [index, point] of route.entries()) {
      if (FIELDS.includes(point)) continue;
      const [x, y] = project(point, width, height);
      board.fillStyle = '#183137';
      board.strokeStyle = '#ffd298';
      board.lineWidth = 2;
      board.beginPath();
      board.arc(x, y, id === 'ring' ? 9.4 : 8, 0, TAU);
      board.fill();
      board.stroke();
      if (id === 'ring') {
        board.fillStyle = '#fff0c8';
        board.font = 'bold 11px monospace';
        board.fillText(index, x - 3.3, y + 3.8);
      }
    }
    addAirfields(board, width, height, true);
    const [x, y] = project(HARBOR, width, height);
    label(board, 'Harbour', x + 12, y + 10, '#e1dbbd', 15, true);
    board.strokeStyle = '#e7d6b3';
    board.lineWidth = 2;
    board.beginPath();
    board.moveTo(23, height - 22);
    board.lineTo(23, height - 29);
    board.lineTo(151, height - 29);
    board.lineTo(151, height - 22);
    board.stroke();
    label(board, '1 km', 23, height - 36, '#e7d6b3', 13);
  }

  function drawMini(plane, objective) {
    const { width, height } = minimap;
    mini.drawImage(backdrop, 0, 0);
    const [tx, ty] = project(objective, width, height);
    const pin = project(plane, width, height);
    const x = clamp(pin[0], 7, width - 7);
    const y = clamp(pin[1], 7, height - 7);
    if (distance(plane, objective) > 28) {
      mini.strokeStyle = '#ffcc7c';
      mini.lineWidth = 1.2;
      mini.setLineDash([4, 3]);
      mini.beginPath();
      mini.moveTo(x, y);
      mini.lineTo(tx, ty);
      mini.stroke();
      mini.setLineDash([]);
    }
    mini.strokeStyle = '#ffde93';
    mini.lineWidth = 2.1;
    mini.beginPath();
    mini.arc(tx, ty, 5.6, 0, TAU);
    mini.stroke();
    mini.save();
    mini.translate(x, y);
    mini.rotate(Math.round(plane.yaw / RAD) * RAD);
    mini.beginPath();
    mini.moveTo(0, -10);
    mini.lineTo(6.1, 6.6);
    mini.lineTo(0, 4);
    mini.lineTo(-6.1, 6.6);
    mini.closePath();
    mini.lineWidth = 2.6;
    mini.strokeStyle = '#15282b';
    mini.fillStyle = '#d1fcde';
    mini.stroke();
    mini.fill();
    mini.restore();
  }
  return { drawDispatch, drawMini };
}
