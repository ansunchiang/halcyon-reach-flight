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

function flameTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ink = canvas.getContext('2d');
  const heat = ink.createLinearGradient(0, 60, 0, 8);
  heat.addColorStop(0, '#ffd78100');
  heat.addColorStop(.23, '#ffeeb2');
  heat.addColorStop(.58, '#ff7029');
  heat.addColorStop(1, '#f8441200');
  ink.fillStyle = heat;
  for (const [x, tip] of [[12, 26], [23, 10], [34, 18], [42, 7], [53, 30]]) {
    ink.beginPath();
    ink.moveTo(x - 7, 61);
    ink.bezierCurveTo(x - 16, 43, x + 11, 27, x - 3, tip);
    ink.bezierCurveTo(x + 13, 23, x + 16, 55, x + 5, 61);
    ink.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createEffects(scene, glow) {
  const random = seededRandom(401729);
  const smoke = makePuff();
  const flameMap = flameTexture();
  const fire = new THREE.Group();
  scene.add(fire);
  const columns = [];
  for (let i = 0; i < 6; i++) {
    const x = FIRE_TARGET.x + (i - 2.5) * 39;
    const z = FIRE_TARGET.z + Math.sin(i * 2.3) * 53;
    const y = elevation(x, z);
    const sparks = flareSprite(fire, glow, '#ff6928', 50, x, y + 7, z);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameMap, depthWrite: false, toneMapped: false }));
    flame.position.set(x, y + 10, z);
    fire.add(flame);
    const embers = Array.from({ length: 6 }, () => flareSprite(fire, glow, '#ffb358', 3.7, x, y, z));
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
    columns.push({ x, y, z, sparks, puffs, flame, embers });
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
  let release = 0;
  let trail = 0;

  function particles(kind, x, y, z, count, spread, plane = null) {
    for (let i = 0; i < count; i++) {
      const p = pool[cursor++ % pool.length];
      const { sprite } = p;
      p.kind = kind;
      p.life = p.left = (kind === 'smoke' ? 4.8 : kind === 'drop' ? 2.7 : kind === 'tire' ? 1.9 : 1.25) * (.65 + random() * .7);
      p.vx = (random() - .5) * spread;
      p.vz = (random() - .5) * spread;
      p.vy = kind === 'drop' ? -5 - random() * 15 : 1 + random() * spread * .47;
      p.size = kind === 'drop' ? 1.7 + random() * 2.5 : 1.8 + random() * 5;
      if (plane) {
        p.vx += Math.sin(plane.yaw) * plane.speed * .46;
        p.vz -= Math.cos(plane.yaw) * plane.speed * .46;
      }
      if (kind === 'trace' || kind === 'tire') p.size *= .39;
      if (kind === 'tire') p.vy *= .28;
      sprite.position.set(x, y, z);
      sprite.material.color.set(kind === 'smoke' ? '#4d4445' : kind === 'flame' ? '#ff9a40' :
        kind === 'dust' ? '#cab9a0' : kind === 'trace' ? '#586071' : kind === 'tire' ? '#bac5cf' : '#e7faff');
      sprite.material.rotation = kind === 'drop' ? (random() - .5) * .5 : random() * TAU;
      sprite.visible = true;
    }
  }

  function flightEvent(event, plane) {
    if (!event) return;
    const { x, y, z } = plane;
    if (event.type === 'touchdown' || event.type === 'rough') {
      const kind = event.type === 'touchdown' && event.landing.field.strip === 'ASPHALT' ? 'tire' : 'dust';
      for (const side of [-1.42, 1.42]) {
        particles(kind, x + side * Math.cos(plane.yaw), y - 1.24, z + side * Math.sin(plane.yaw) - .85, 11, 5.5);
      }
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
      release = .76;
      particles('drop', plane.x, plane.y - 1.55, plane.z + 1, 12, 13, plane);
      if (success) fireOut = .04;
    },
    reset() {
      wreckTime = -1;
      wreck = null;
      fireOut = wake = release = trail = 0;
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
        for (const { x, y, z, sparks, puffs, flame, embers } of columns) {
          sparks.material.opacity = (1 - fireOut) * (.69 + Math.sin(time * 11 + x) * .29);
          flame.scale.set(24 * (1 - fireOut), (1 - fireOut) * (24 + 7 * Math.sin(time * 7 + z)), 1);
          flame.material.rotation = -.19 + Math.sin(time * 4 + x) * .16;
          for (const [i, ember] of embers.entries()) {
            const age = (time * (.45 + i * .028) + i * .17 + x * .014) % 1;
            ember.position.set(x + age * 32 + Math.sin(i * 7 + age * 7) * 13, y + 5 + age * 59, z + Math.cos(i * 4 + age * 5) * 18);
            ember.material.opacity = (1 - fireOut) * (1 - age);
          }
          for (const { sprite, phase, drift, spin } of puffs) {
            const age = (phase + time * .086) % 1;
            const breadth = 17 + age * 81;
            sprite.position.set(x + age ** 1.4 * (144 + drift * 69), y + 11 + age * 229,
              z + age * (drift * 68 + 19));
            sprite.scale.set(breadth * 1.37, breadth, 1);
            sprite.material.opacity = Math.sin(age * Math.PI) ** .46 * (.81 - fireOut * .57);
            sprite.material.rotation = spin + age * .43;
          }
        }
      }
      if (release > 0 && dt > 0) {
        const last = release;
        release -= dt;
        if (Math.floor(last * 22) !== Math.floor(release * 22)) {
          for (const side of [-1, 0, 1]) {
            particles('drop', plane.x + side * 2.1, plane.y - 1.55, plane.z + 1, 3, 16, plane);
          }
        }
      }
      trail -= dt;
      if (plane.damage >= .25 && !plane.grounded && !plane.crashed && trail <= 0 && dt > 0) {
        trail = .058;
        particles('trace', plane.x - Math.cos(plane.yaw) * .7, plane.y - .3, plane.z + Math.cos(plane.yaw), 2, 2);
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
        const size = p.size * (1 + age * (p.kind === 'smoke' ? 7 : 3));
        if (p.kind === 'drop') p.sprite.scale.set(size, size * 1.85, 1);
        else if (p.kind === 'tire') p.sprite.scale.set(size * 1.38, size * .65, 1);
        else p.sprite.scale.setScalar(size);
        p.sprite.material.opacity = (1 - age) * (p.kind === 'drop' ? .94 : p.kind === 'trace' ? .50 : .76);
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
