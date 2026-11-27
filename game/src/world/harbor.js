import * as THREE from '../../vendor/three.module.min.js';
import { seededRandom } from '../core/math.js';
import { HARBOR, LAKE } from './chart.js';
import { elevation } from './elevation.js';
import { box, flareSprite, tube } from './mesh.js';

export function buildHarbor(scene, glow) {
  const random = seededRandom(2566);
  const materials = ['#dbb37e', '#9a584d', '#e8d4ad', '#91a2a2', '#cb8264', '#d6c49b']
    .map(color => new THREE.MeshLambertMaterial({ color }));
  const roofs = ['#6c3333', '#3f4f60', '#8d563b', '#405a58']
    .map(color => new THREE.MeshLambertMaterial({ color }));
  const wall = new THREE.MeshLambertMaterial({ color: '#9d9a87' });
  const timber = new THREE.MeshLambertMaterial({ color: '#867057' });
  const window = new THREE.MeshBasicMaterial({ color: '#e5b46f' });
  const road = new THREE.MeshLambertMaterial({ color: '#a1957c', side: THREE.DoubleSide });
  const hutRoof = new THREE.CylinderGeometry(1, 1, 1, 3).rotateY(Math.PI / 2).rotateX(Math.PI / 2);
  const harborLights = [];
  const group = new THREE.Group();
  scene.add(group);

  function roadRibbon(points, width) {
    const vertices = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x, z] = points[i];
      const [nx, nz] = points[i + 1];
      const length = Math.hypot(nx - x, nz - z);
      const dx = (z - nz) * width / length;
      const dz = (nx - x) * width / length;
      for (const [px, pz] of [[x + dx, z + dz], [x - dx, z - dz], [nx + dx, nz + dz],
        [x - dx, z - dz], [nx - dx, nz - dz], [nx + dx, nz + dz]]) {
        vertices.push(px, elevation(px, pz) + .7, pz);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    group.add(new THREE.Mesh(geo, road));
  }

  const artery = [];
  for (let z = 485; z >= -860; z -= 14) artery.push([382 + Math.sin(z / 177) * 55, z]);
  roadRibbon(artery, 6.3);
  const link = [];
  for (let x = 185; x <= 410; x += 10) link.push([x, 84 + Math.sin((x - 185) / 103) * 28]);
  roadRibbon(link, 5.5);
  for (let street = 0; street < 4; street++) {
    const z = 197 + street * 61;
    const points = [];
    for (let x = 295; x <= 564; x += 12) points.push([x, z + Math.sin(x / 40) * 5]);
    roadRibbon(points, 4.4);
    for (let i = 0; i < 8; i++) {
      const x = 297 + i * 37 + random() * 10;
      if (Math.abs(x - (382 + Math.sin(z / 177) * 55)) < 24) continue;
      const pz = z - 16 - random() * 8;
      const y = elevation(x, pz);
      if (y < 1) continue;
      const width = 10 + random() * 10;
      const height = 5 + random() * 7;
      const length = 10 + random() * 10;
      box(group, materials[(i + 3 * street) % materials.length], width, height + 3, length, x, y + height / 2 - 1.5, pz);
      const top = new THREE.Mesh(hutRoof, roofs[(i + street) % roofs.length]);
      top.scale.set(width * .64, height * .49, length * 1.12);
      top.position.set(x, y + height + .5, pz);
      group.add(top);
      for (const dx of [-.27, .27]) {
        box(group, window, width * .18, height * .24, .14, x + width * dx, y + height * .64, pz + length / 2 + .09);
      }
      if (i % 3 === 0) harborLights.push(flareSprite(group, glow, '#ffb968', 10, x, y + 4, z));
    }
  }
  for (const x of [446, 485, 521]) {
    const start = 487;
    const end = 608 + random() * 30;
    box(group, timber, 9, .8, end - start, x, 2.4, (start + end) / 2);
    for (let z = start; z < end; z += 16) {
      box(group, wall, .8, 5, .8, x - 3.8, 1.1, z);
      box(group, wall, .8, 5, .8, x + 3.8, 1.1, z);
    }
  }
  for (let i = 0; i < 10; i++) {
    const marine = i < 8;
    const x = marine ? 455 + i % 4 * 34 : LAKE.x + 176 + (i - 8) * 44;
    const z = marine ? 571 + Math.floor(i / 4) * 39 : LAKE.z + 220;
    const y = marine ? 1.1 : LAKE.y + 1;
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), materials[i % materials.length]);
    hull.scale.set(3.1, 1.4, 10 + i % 3);
    hull.position.set(x, y, z);
    group.add(hull);
    box(group, materials[2], 4.5, 2.8, 5.9, x, y + 2.0, z + 1.8);
    tube(group, wall, .16, [x, y + 2, z], [x, y + 8, z]);
  }
  const beacon = box(group, materials[2], 6.4, 18, 6.4, HARBOR.x - 92, 10, 503);
  box(group, roofs[0], 9, 2.5, 9, beacon.position.x, 20, 503);
  harborLights.push(flareSprite(group, glow, '#ffd79a', 41, beacon.position.x, 19, 503));
  return (dusk, time) => {
    for (const light of harborLights) light.material.opacity = dusk ? .85 : .22;
    harborLights.at(-1).material.opacity *= .45 + .55 * Math.pow(.5 + .5 * Math.sin(time * 2), 9);
  };
}
