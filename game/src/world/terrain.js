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
    meadow: new THREE.Color('#81964f'), moss: new THREE.Color('#345644'),
    gorse: new THREE.Color('#ad9c61'), stone: new THREE.Color('#857d8c'),
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
    const canopy = noise(x / 148, z / 164) * .68 + noise(x / 48, z / 54) * .32;
    const bands = noise((x + y * 1.9) / 82, (z + y * 2.5) / 77);
    color.copy(palette.meadow).lerp(palette.moss, ease(.34, .68, canopy) * .88)
      .lerp(palette.gorse, ease(.58, .91, bands) * .60);
    color.lerp(palette.stone, Math.max(ease(.18, .55, slope) * .87, ease(270, 565, y) * .95));
    color.lerp(palette.cliff, ease(.16, .55, slope) * (1 - ease(180, 420, y)) * .75);
    const snowline = 386 + bands * 147 + slope * 99;
    if (y > snowline - 30) {
      const snow = palette.ice.clone().lerp(palette.snow, 1 - ease(.12, .48, slope) * .64);
      color.lerp(snow, ease(snowline - 30, snowline + 51, y));
    }
    color.lerp(palette.pale, (1 - ease(3, 12, y)) * ease(-12, 1, y) * .92);
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
      diffuseColor.rgb *= 1. + .048*grain + .085*broad + .065*ridge*rock;
      vec2 q = p.xz + vec2(p.z*.13, -p.x*.09);
      vec2 west = abs(q-vec2(-86., 95.));
      vec2 east = abs(q-vec2(271., -220.));
      float plot = max(1.-smoothstep(.94,1.,max(west.x/76.,west.y/119.)),
                       1.-smoothstep(.94,1.,max(east.x/51.,east.y/123.)));
      float seams = abs(sin((q.y+30.)*.035));
      float cut = smoothstep(.07,.15,seams);
      vec3 hay = mix(vec3(.082,.128,.061),vec3(.34,.31,.115),cut*(.86+.14*sin(q.y*.07)));
      hay *= .93 + .07 * sin(q.x*.41);
      diffuseColor.rgb = mix(diffuseColor.rgb, hay, plot*.78);
      float d = abs(p.x-382.-sin(p.z/177.)*55.);
      float road = (1.-smoothstep(7.,10.,d))*smoothstep(-870.,-844.,p.z)*(1.-smoothstep(462.,490.,p.z));
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.19,.148,.103),road*.9);
    `);
  };
  scene.add(new THREE.Mesh(geometry, material));
}
