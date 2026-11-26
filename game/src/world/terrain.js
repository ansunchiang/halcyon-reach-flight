import * as THREE from '../../vendor/three.module.min.js';
import { ease, noise } from '../core/math.js';
import { elevation } from './elevation.js';

export function buildTerrain(scene) {
  const geometry = new THREE.PlaneGeometry(10700, 10000, 335, 309);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(-700, 0, -2100);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setY(i, elevation(position.getX(i), position.getZ(i)));
  }
  geometry.computeVertexNormals();
  const palette = {
    meadow: new THREE.Color('#748747'), moss: new THREE.Color('#315d3d'),
    gorse: new THREE.Color('#9b985d'), stone: new THREE.Color('#827883'),
    cliff: new THREE.Color('#888276'), pale: new THREE.Color('#d5c298'),
    snow: new THREE.Color('#f8f1e9'), ice: new THREE.Color('#a7bbcd'),
    bed: new THREE.Color('#456e68')
  };
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  const normal = geometry.attributes.normal;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const slope = 1 - normal.getY(i);
    const variation = noise(x / 105, z / 101);
    const bands = noise((x + y * 1.9) / 82, (z + y * 2.5) / 77);
    color.copy(palette.meadow).lerp(palette.moss, variation * .9)
      .lerp(palette.gorse, ease(.58, .91, bands) * .56);
    color.lerp(palette.stone, Math.max(ease(.18, .55, slope) * .87, ease(270, 565, y) * .95));
    color.lerp(palette.cliff, ease(.16, .55, slope) * (1 - ease(180, 420, y)) * .75);
    const snowline = 386 + bands * 147 + slope * 99;
    if (y > snowline - 30) {
      const snow = palette.ice.clone().lerp(palette.snow, 1 - ease(.12, .48, slope) * .64);
      color.lerp(snow, ease(snowline - 30, snowline + 51, y));
    }
    color.lerp(palette.pale, (1 - ease(4, 24, y)) * ease(-13, 2, y) * .94);
    color.lerp(palette.bed, 1 - ease(-30, -5, y));
    color.multiplyScalar(.86 + bands * .24);
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 terrainPoint;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n terrainPoint = position;');
    shader.fragmentShader = 'varying vec3 terrainPoint;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p = terrainPoint;
      float grain = sin(p.x*.61 + sin(p.z*.73)*2.) * sin(p.z*.48+p.y*.59);
      float broad = sin(p.x*.042 + sin(p.z*.037)*3.) * sin(p.z*.061 + p.y*.03);
      float ridge = sin(p.y*.073 + p.x*.043 + sin(p.z*.025)*3.4);
      float rock = smoothstep(140., 390., p.y);
      diffuseColor.rgb *= 1. + .034*grain + .063*broad + .041*ridge*rock;
    `);
  };
  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  scene.add(terrain);
}
