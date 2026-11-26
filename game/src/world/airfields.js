import * as THREE from '../../vendor/three.module.min.js';
import { RAD } from '../core/math.js';
import { FIELDS, fieldPoint, fieldOffset } from './chart.js';
import { elevation } from './elevation.js';
import { box, flareSprite } from './mesh.js';

function runwayPaint(field) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 2048;
  const g = canvas.getContext('2d');
  const paved = field.id === 'gull';
  g.fillStyle = paved ? '#424750' : field.id === 'tarn' ? '#929b58' : '#a69579';
  g.fillRect(0, 0, 192, 2048);
  for (let i = 0; i < 270; i++) {
    g.fillStyle = i % 2 ? '#ffffff0d' : '#1d252414';
    g.fillRect((i * 47) % 192, (i * 67) % 2048, 2 + i % 6, 5 + i % 82);
  }
  g.fillStyle = paved ? '#2428304d' : '#53674077';
  g.fillRect(76, 0, 40, 2048);
  for (const reverse of [false, true]) {
    g.save();
    if (reverse) {
      g.translate(192, 2048);
      g.rotate(Math.PI);
    }
    g.fillStyle = paved ? '#f5e8c9' : '#efdeb2';
    for (let x = 28; x < 160; x += 19) g.fillRect(x, 21, 9, 49);
    g.font = 'bold 72px monospace';
    g.textAlign = 'center';
    g.save();
    g.translate(96, 120);
    g.rotate(Math.PI);
    g.textBaseline = 'middle';
    g.fillText(field.id === 'cinder' ? (reverse ? '09' : '27') : (reverse ? '36' : '18'), 0, 0);
    g.restore();
    g.fillRect(38, 245, 19, 54);
    g.fillRect(135, 245, 19, 54);
    for (let y = 360; y < 970; y += 87) g.fillRect(93, y, 6, 45);
    g.restore();
  }
  g.fillStyle = '#e8daba';
  g.fillRect(8, 4, paved ? 4 : 2, 2040);
  g.fillRect(180, 4, paved ? 4 : 2, 2040);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 12;
  return tex;
}

function buildHangars(group, field) {
  const siding = new THREE.MeshLambertMaterial({ color: '#b4aa91' });
  const roofing = new THREE.MeshLambertMaterial({ color: '#465962' });
  const door = new THREE.MeshLambertMaterial({ color: '#354752' });
  const concrete = new THREE.MeshLambertMaterial({ color: '#7d7e74' });
  const x = field.width / 2 + 62;
  box(group, concrete, 117, .35, 141, x + 8, -.1, -50);
  box(group, concrete, 60, .32, 19, x - 42, -.14, -79);
  for (let i = 0; i < (field.id === 'gull' ? 3 : 1); i++) {
    const z = -88 + 39 * i;
    box(group, siding, 30, 9, 32, x + 28, 4.5, z);
    box(group, roofing, 31, .55, 35, x + 28, 9.25, z);
    box(group, door, .22, 6.4, 22, x + 12.9, 3.3, z);
  }
  if (field.id === 'gull') {
    box(group, siding, 9, 18, 10, x + 8, 9, -116);
    box(group, door, 12, 3.8, 13, x + 8, 18.9, -116);
    box(group, roofing, 13, .6, 14, x + 8, 21, -116);
  }
  const pole = new THREE.MeshLambertMaterial({ color: '#e6d6bb' });
  const sock = new THREE.MeshLambertMaterial({ color: '#dc532d' });
  box(group, pole, .29, 8, .29, x - 21, 4, 58);
  const banner = box(group, sock, 3.4, .66, .58, x - 19.3, 7.9, 58);
  banner.rotation.z = -.12;
}

export function buildRunwayLights(group, field, texture) {
  const lights = [];
  const edge = field.width * .5 + 1.5;
  const half = field.length / 2;
  function lamp(x, z, color, size, height = .68) {
    const sprite = flareSprite(group, texture, color, size, x, height, z);
    lights.push(sprite);
    return sprite;
  }
  for (let z = -half + 18; z < half; z += 27) {
    lamp(edge, z, '#fff2cc', 7.3);
    lamp(-edge, z, '#fff2cc', 7.3);
    if (field.id === 'gull') lamp(0, z + 6, '#e7f3ff', 4.0, .18);
  }
  for (const end of [-1, 1]) {
    for (let x = -edge; x <= edge; x += 6.5) lamp(x, end * half, '#5affbc', 9.5);
  }
  const papi = [];
  if (field.id === 'gull') {
    for (let i = 1; i <= 9; i++) {
      const z = half + i * 22;
      for (const x of [-5.5, 0, 5.5]) {
        const point = fieldPoint(field, x, -z);
        lamp(x, z, '#ffe1ad', 10, Math.max(2.0, elevation(point.x, point.z) - field.y + 1));
      }
    }
    for (let x = -38; x <= 38; x += 7.6) lamp(x, half + 110, '#fff3d2', 8, 2);
    for (let i = 0; i < 4; i++) papi.push(lamp(-edge - 10 - i * 5.7, half - 89, '#ff3e3e', 11));
  }
  return function updateLights(plane, dusk) {
    const range = fieldOffset(field, plane.x, plane.z).along;
    const slope = Math.atan2(plane.y - field.y, Math.max(40, -range - half + 89)) / RAD;
    for (const light of lights) light.material.opacity = dusk ? .95 : .45;
    papi.forEach((light, i) => light.material.color.set(slope > 2.45 + .37 * i ? '#fff8e0' : '#ff342e'));
  };
}

export function buildAirfields(scene, glow) {
  const updates = [];
  for (const field of FIELDS) {
    const group = new THREE.Group();
    group.position.set(field.x, field.y + .23, field.z);
    group.rotation.y = -field.course;
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(field.width, field.length),
      new THREE.MeshBasicMaterial({ map: runwayPaint(field) }));
    surface.rotation.x = -Math.PI / 2;
    group.add(surface);
    buildHangars(group, field);
    updates.push(buildRunwayLights(group, field, glow));
    scene.add(group);
  }
  return (plane, dusk) => updates.forEach(update => update(plane, dusk));
}
