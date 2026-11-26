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
import { createEffects } from '../effects/particles.js';
import { surfaceHeight } from './elevation.js';

function aircraftShadow(scene, glow) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: '#182931', map: glow, transparent: true, opacity: .33, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -6
  });
  const patch = new THREE.Mesh(geometry, material);
  scene.add(patch);
  return (plane, sun, night) => {
    const ray = Math.min(220, plane.agl / Math.max(.16, sun.y));
    const x = plane.x - sun.x * ray;
    const z = plane.z - sun.z * ray;
    patch.visible = !night && !plane.crashed && plane.agl < 126;
    if (!patch.visible) return;
    patch.position.set(x, surfaceHeight(x, z) + .20, z);
    patch.rotation.y = -plane.yaw;
    patch.scale.set(20 + ray * .085, 1, 12 + ray * .09);
    material.opacity = .64 * (1 - plane.agl / 132);
  };
}

export function createArchipelago(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
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
  const effects = createEffects(scene, glow);
  const shadow = aircraftShadow(scene, glow);
  let night = false;

  return {
    effects,
    resize(width, height) { renderer.setSize(width, height, false); },
    setTimeOfDay(value) {
      night = value;
      sky.setLight(night);
      forestLight(night);
    },
    paint(sortie, input, camera, dt, time, cockpit) {
      sky.update(camera, time);
      airfields(sortie.plane, night);
      harbor(night, time);
      marks(sortie, time);
      aircraft.update(sortie.plane, input, dt, cockpit);
      shadow(sortie.plane, sky.uniforms.sunDir.value, night);
      effects.update(sortie, time, dt);
      renderer.render(scene, camera);
    }
  };
}
