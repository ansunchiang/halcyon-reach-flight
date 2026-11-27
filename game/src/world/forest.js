import * as THREE from '../../vendor/three.module.min.js';
import { noise, seededRandom } from '../core/math.js';
import { FIELDS, HARBOR, FIRE, fieldOffset } from './chart.js';
import { elevation, waterLevel } from './elevation.js';

const regionCell = 36;
const groves = new Map();

export function treeAt(x, z) {
  const ix = Math.floor(x / regionCell);
  const iz = Math.floor(z / regionCell);
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const trees = groves.get((ix + i) + ',' + (iz + j)) ?? [];
      for (const tree of trees) {
        if ((tree.x - x) ** 2 + (tree.z - z) ** 2 < (tree.h * .17 + 2) ** 2) return tree.y + tree.h * .83;
      }
    }
  }
  return -Infinity;
}

export function buildForest(scene, glow) {
  const random = seededRandom(268912);
  const object = new THREE.Object3D();
  const pine = new THREE.ConeGeometry(1, 1, 6);
  const foliage = new THREE.MeshLambertMaterial({ color: 'white' });
  const needles = new THREE.InstancedMesh(pine, foliage, 33000);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.13, .2, 1, 5),
    new THREE.MeshLambertMaterial({ color: '#6c5141' }), 11000);
  const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#1b301f', map: glow, transparent: true, opacity: .37, depthWrite: false }), 7600);
  const color = new THREE.Color();
  const stone = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 'white' }), 560);
  let trees = 0;
  let layers = 0;
  let rocks = 0;
  let shadeCount = 0;
  groves.clear();
  for (let i = 0; i < 29500; i++) {
    const x = -2980 + random() * 5350;
    const z = -3230 + random() * 4450;
    const y = elevation(x, z);
    if (y < 6 || y > 440 || y < waterLevel(x, z) + .8) continue;
    const slope = Math.abs(elevation(x + 9, z) - y) + Math.abs(elevation(x, z + 9) - y);
    const nearHarbor = Math.hypot((x - HARBOR.x) * .92, (z - HARBOR.z) * 1.2) < 208;
    const nearStrip = FIELDS.some(field => {
      const off = fieldOffset(field, x, z);
      return Math.abs(off.across) < field.width / 2 + 28 + (off.across > 0 ? 111 : 0) &&
        Math.abs(off.along) < field.length / 2 + (field.id === 'cinder' ? 39 : 225);
    });
    if (nearHarbor || nearStrip) continue;
    const cover = noise(x / 148, z / 164) * .68 + noise(x / 48, z / 54) * .32;
    if (rocks < 560 && y < 240 && (slope > 8 || y < 22) && random() < .14) {
      const size = 2 + random() ** 2 * 12;
      object.position.set(x, y - size * .15, z);
      object.scale.set(size * 1.4, size * .61, size);
      object.rotation.set(random(), random() * 6, random());
      object.updateMatrix();
      stone.setMatrixAt(rocks, object.matrix);
      stone.setColorAt(rocks++, color.setHSL(.08 + random() * .06, .13, .24 + random() * .13));
    }
    if (trees >= 11000 || slope > 16 || cover < .41 || random() > cover + .23) continue;
    const height = 6.0 + random() ** .8 * 17;
    const shade = random();
    const char = Math.hypot(x - FIRE.x, z - FIRE.z) < 61;
    const cell = Math.floor(x / regionCell) + ',' + Math.floor(z / regionCell);
    if (!groves.has(cell)) groves.set(cell, []);
    groves.get(cell).push({ x, y, z, h: height });
    if (slope < 2.8 && shadeCount < 7600) {
      const px = x - height * .51;
      const pz = z + height * 1.24;
      object.position.set(px, elevation(px, pz) + .36, pz);
      object.scale.set(height * 2.6, 1, height * .69);
      object.rotation.set(0, 1.18, 0);
      object.updateMatrix();
      shadows.setMatrixAt(shadeCount++, object.matrix);
    }
    object.rotation.set(0, random() * 6.28, 0);
    object.position.set(x, y + height * .25, z);
    object.scale.set(height * .28, height * .56, height * .28);
    object.updateMatrix();
    trunk.setMatrixAt(trees++, object.matrix);
    for (let level = 0; level < 3; level++) {
      const radius = height * (.205 - level * .052);
      object.position.y = y + height * (.39 + level * .174);
      object.scale.set(radius, height * (.56 - level * .069), radius);
      object.updateMatrix();
      needles.setMatrixAt(layers, object.matrix);
      if (char) color.setHSL(.065, .17, .056 + shade * .035);
      else color.setHSL(.231 + shade * .128, .30 + shade * .25, .071 + shade * .078 + level * .016);
      needles.setColorAt(layers++, color);
    }
  }
  needles.count = layers;
  trunk.count = trees;
  stone.count = rocks;
  shadows.count = shadeCount;
  scene.add(trunk, needles, stone, shadows);
  return dusk => { shadows.visible = !dusk; };
}
