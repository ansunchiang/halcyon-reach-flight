import * as THREE from '../../vendor/three.module.min.js';

export function box(parent, material, width, height, length, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function tube(parent, material, radius, start, end, top = radius, sides = 8) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, radius, a.distanceTo(b), sides), material);
  mesh.position.copy(a).lerp(b, .5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  parent.add(mesh);
  return mesh;
}

export function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(.12, 'rgba(255,255,255,.93)');
  glow.addColorStop(.29, 'rgba(255,255,255,.32)');
  glow.addColorStop(.62, 'rgba(255,255,255,.07)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function flareSprite(parent, texture, color, size, x, y, z) {
  const material = new THREE.SpriteMaterial({
    color, map: texture, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  sprite.position.set(x, y, z);
  parent.add(sprite);
  return sprite;
}
