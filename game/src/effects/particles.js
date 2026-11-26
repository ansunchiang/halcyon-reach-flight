import * as THREE from '../../vendor/three.module.min.js';
import { seededRandom, TAU } from '../core/math.js';
import { FIRE_TARGET } from '../missions/fireWatch.js';
import { elevation } from '../world/elevation.js';
import { flareSprite } from '../world/mesh.js';

function makePuff() {
  const sheet = document.createElement('canvas');
  sheet.width = sheet.height = 128;
  const ctx = sheet.getContext('2d');
  const random = seededRandom(86271);
  for (let i = 0; i < 44; i++) {
    const angle = random() * TAU;
    const distance = random() ** .88 * 44;
    const x = 64 + Math.cos(angle) * distance;
    const y = 64 + Math.sin(angle) * distance;
    const radius = 7 + random() * 19;
    const shade = 143 + Math.round(random() * 104);
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, 'rgba(' + shade + ',' + shade + ',' + shade + ',.54)');
    cloud.addColorStop(.52, 'rgba(' + shade + ',' + shade + ',' + shade + ',.3)');
    cloud.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const texture = new THREE.CanvasTexture(sheet);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createEffects(scene, glow) {
  const random = seededRandom(401729);
  const smoke = makePuff();
  const fire = new THREE.Group();
  scene.add(fire);
  const columns = [];
  for (let i = 0; i < 6; i++) {
    const x = FIRE_TARGET.x + (i - 2.5) * 39;
    const z = FIRE_TARGET.z + Math.sin(i * 2.3) * 53;
    const y = elevation(x, z);
    const sparks = flareSprite(fire, glow, '#ff7c25', 57, x, y + 7, z);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(9, 19, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? '#fb821d' : '#fcae4a' }));
    flame.position.set(x, y + 6, z);
    fire.add(flame);
    const puffs = [];
    for (let j = 0; j < 13; j++) {
      const material = new THREE.SpriteMaterial({
        color: new THREE.Color('#625663'), map: smoke, transparent: true, depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      const phase = j / 13 + random() * .047;
      puffs.push({ sprite, phase, drift: random() * 2 - 1, spin: random() * TAU });
      fire.add(sprite);
    }
    columns.push({ x, y, z, sparks, puffs, flame });
  }
  const pool = [];
  for (let i = 0; i < 144; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smoke, transparent: true, depthWrite: false
    }));
    sprite.visible = false;
    scene.add(sprite);
    pool.push({ sprite, left: -1, vx: 0, vy: 0, vz: 0, size: 0, life: 0, kind: '' });
  }
  const debris = [];
  const shardMaterial = new THREE.MeshLambertMaterial({ color: '#9e5335' });
  for (let i = 0; i < 24; i++) {
    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(.66 + random() * 1.1), shardMaterial);
    shard.visible = false;
    scene.add(shard);
    debris.push({ shard, left: 0, velocity: new THREE.Vector3() });
  }
  let cursor = 0;
  let wake = 0;
  let wreckTime = -1;
  let wreck = null;
  let fireOut = 0;

  function particles(kind, x, y, z, count, spread) {
    for (let i = 0; i < count; i++) {
      const p = pool[cursor++ % pool.length];
      const { sprite } = p;
      p.kind = kind;
      p.life = p.left = (kind === 'smoke' ? 4.8 : kind === 'drop' ? 2.7 : 1.25) * (.65 + random() * .7);
      p.vx = (random() - .5) * spread;
      p.vz = (random() - .5) * spread;
      p.vy = kind === 'drop' ? -5 - random() * 15 : 1 + random() * spread * .47;
      p.size = kind === 'drop' ? 5 + random() * 8 : 1.8 + random() * 5;
      sprite.position.set(x, y, z);
      sprite.material.color.set(kind === 'smoke' ? '#4d4445' : kind === 'flame' ? '#ff9a40' :
        kind === 'dust' ? '#cab9a0' : '#d4faff');
      sprite.material.rotation = random() * TAU;
      sprite.visible = true;
    }
  }

  function flightEvent(event, plane) {
    if (!event) return;
    const { x, y, z } = plane;
    if (event.type === 'touchdown' || event.type === 'rough') {
      particles('dust', x - 1.4, y - .9, z, 10, 5);
      particles('dust', x + 1.4, y - .9, z, 10, 5);
    }
    if (event.type === 'bird' || event.type === 'scrape') particles('dust', x, y, z, 13, 14);
    if (event.type !== 'crash') return;
    wreck = { x, y: Math.max(y, elevation(x, z)), z };
    wreckTime = 0;
    particles('flame', x, wreck.y, z, 37, 30);
    particles('smoke', x, wreck.y, z, 28, 18);
    for (const fragment of debris) {
      fragment.shard.position.set(x + random() * 3 - 1.5, wreck.y, z + random() * 3 - 1.5);
      fragment.velocity.set((random() - .5) * 38, 4 + random() * 18, (random() - .64) * 38);
      fragment.left = 7;
      fragment.shard.visible = true;
    }
  }

  return {
    flightEvent,
    drop(plane, success) {
      for (let i = -6; i <= 6; i++) particles('drop', plane.x + i * 1.28, plane.y - 1.8, plane.z + Math.abs(i), 5, 21);
      if (success) fireOut = .04;
    },
    reset() {
      wreckTime = -1;
      wreck = null;
      fireOut = wake = 0;
      for (const p of pool) {
        p.left = -1;
        p.sprite.visible = false;
      }
      for (const { shard } of debris) shard.visible = false;
    },
    update(sortie, time, dt) {
      const plane = sortie.plane;
      fire.visible = sortie.definition.id === 'fire';
      if (fireOut) fireOut = Math.min(1, fireOut + dt * .27);
      if (fire.visible) {
        for (const { x, y, z, sparks, puffs, flame } of columns) {
          sparks.material.opacity = (1 - fireOut) * (.69 + Math.sin(time * 11 + x) * .29);
          flame.scale.set(1 - fireOut, (1 - fireOut) * (.66 + .36 * Math.sin(time * 7 + z)), 1 - fireOut);
          flame.rotation.z = -.26 + Math.sin(time * 4 + x) * .16;
          for (const { sprite, phase, drift, spin } of puffs) {
            const age = (phase + time * .086) % 1;
            const breadth = 27 + age * 83;
            sprite.position.set(x + age ** 1.4 * (144 + drift * 69), y + 11 + age * 229,
              z + age * (drift * 68 + 19));
            sprite.scale.set(breadth * 1.37, breadth, 1);
            sprite.material.opacity = Math.sin(age * Math.PI) ** .46 * (.65 - fireOut * .51);
            sprite.material.rotation = spin + age * .43;
          }
        }
      }
      wake -= dt;
      if (sortie.definition.id === 'fire' && sortie.plane.agl < 12 && !plane.gear && !plane.grounded && wake <= 0) {
        wake = .055;
        for (const side of [-1, 1]) {
          const x = plane.x + side * Math.cos(plane.yaw) * 3.1;
          const z = plane.z + side * Math.sin(plane.yaw) * 3.1;
          particles('spray', x, plane.y - plane.agl + .85, z, 3, 6);
        }
      }
      if (wreck && wreckTime >= 0 && dt > 0) {
        wreckTime += dt;
        if (Math.floor(wreckTime * 8) !== Math.floor((wreckTime - dt) * 8) && wreckTime < 15) {
          particles('smoke', wreck.x, wreck.y + 1.2, wreck.z, 4, 5);
        }
      }
      for (const p of pool) {
        if (!p.sprite.visible) continue;
        p.left -= dt;
        if (p.left <= 0) {
          p.sprite.visible = false;
          continue;
        }
        const age = 1 - p.left / p.life;
        p.sprite.position.x += p.vx * dt;
        p.sprite.position.y += p.vy * dt;
        p.sprite.position.z += p.vz * dt;
        if (p.kind === 'drop') p.vy -= 5.8 * dt;
        p.sprite.scale.setScalar(p.size * (1 + age * (p.kind === 'smoke' ? 7 : 3)));
        p.sprite.material.opacity = (1 - age) * (p.kind === 'smoke' ? .68 : .76);
      }
      for (const p of debris) {
        if (!p.shard.visible) continue;
        p.left -= dt;
        if (p.left <= 0) p.shard.visible = false;
        const floor = wreck.y + .3;
        if (p.shard.position.y > floor || p.velocity.y > 0) {
          p.shard.rotation.x += 2.1 * dt;
          p.shard.rotation.z += 3.6 * dt;
          p.velocity.y -= 13 * dt;
          p.shard.position.addScaledVector(p.velocity, dt);
        }
      }
    }
  };
}
