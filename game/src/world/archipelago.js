import * as THREE from '../../vendor/three.module.min.js';
import { buildTerrain } from './terrain.js';
import { buildSky } from './sky.js';
import { buildWater } from './water.js';
import { buildForest } from './forest.js';
import { buildAirfields } from './airfields.js';
import { buildHarbor } from './harbor.js';
import { buildMissionMarkers } from './markers.js';
import { makeGlowTexture } from './mesh.js';
import { buildPetrel } from '../aircraft/petrelModel.js';
import { buildCockpit } from '../aircraft/cockpit.js';
import { createEffects } from '../effects/particles.js';
import { surfaceHeight } from './elevation.js';

function aircraftShadow(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ink = canvas.getContext('2d');
  ink.filter = 'blur(5px)';
  ink.fillRect(58, 24, 12, 77);
  ink.fillRect(12, 44, 104, 18);
  ink.fillRect(44, 88, 40, 13);
  const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: '#0c121f', map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -6
  });
  const patch = new THREE.Mesh(geometry, material);
  scene.add(patch);
  return (plane, sun, night, rays) => {
    const ray = Math.min(15 + plane.agl * .25, plane.agl / Math.max(.16, sun.y));
    const x = plane.x - sun.x * ray;
    const z = plane.z - sun.z * ray * .33;
    patch.visible = !plane.crashed && plane.agl < 165;
    if (!patch.visible) return;
    patch.position.set(x, surfaceHeight(x, z) + .2 + rays * .38, z);
    patch.rotation.y = -plane.yaw;
    patch.scale.set(17 + plane.agl * .33, 1, 13 + plane.agl * .30);
    material.opacity = (night ? .32 : .75 + rays * .22) * (1 - plane.agl / 170);
  };
}

export function createArchipelago(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  const sky = buildSky(scene);
  const glow = makeGlowTexture();
  buildTerrain(scene);
  buildWater(scene, sky);
  const forestLight = buildForest(scene, glow);
  const airfields = buildAirfields(scene, glow);
  const harbor = buildHarbor(scene, glow);
  const marks = buildMissionMarkers(scene, glow);
  const aircraft = buildPetrel(scene, glow);
  const cabin = buildCockpit(scene);
  const effects = createEffects(scene, glow);
  const shadow = aircraftShadow(scene);
  let night = false;

  return {
    effects,
    resize(width, height) { renderer.setSize(width, height, false); },
    setTimeOfDay(value, rays) {
      night = !!value;
      sky.setLight(night, rays);
      forestLight(night);
    },
    paint(sortie, input, camera, dt, time, cockpit) {
      sky.update(camera, time);
      airfields(sortie.plane, night);
      harbor(night, time);
      marks(sortie, time);
      aircraft.update(sortie.plane, input, dt, cockpit);
      cabin(aircraft.root, sortie.plane, cockpit, night);
      shadow(sortie.plane, sky.uniforms.sunDir.value, night, sky.uniforms.rays.value);
      effects.update(sortie, time, dt);
      renderer.render(scene, camera);
    }
  };
}
