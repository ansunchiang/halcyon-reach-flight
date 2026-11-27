import * as THREE from '../../vendor/three.module.min.js';
import { seededRandom, TAU } from '../core/math.js';
import { FIRE_TARGET } from '../missions/fireWatch.js';
import { elevation } from '../world/elevation.js';
import { flareSprite } from '../world/mesh.js';

const particlesStyle = {
  smoke: [4.8, '#4d4445'], drop: [2.7, '#d5f7ff'], tire: [1.9, '#bac5cf'],
  flame: [1.25, '#ff9a40'], dust: [1.25, '#cab9a0'], trace: [1.25, '#586071'], spray: [1.25, '#d5f7ff']
};

function texture(canvas) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

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
    const gray = 'rgba(' + [shade, shade, shade].join(',');
    cloud.addColorStop(0, gray + ',.54)');
    cloud.addColorStop(.52, gray + ',.3)');
    cloud.addColorStop(1, '#fff0');
    ctx.fillStyle = cloud;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  return texture(sheet);
}

function flameTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ink = canvas.getContext('2d');
  const heat = ink.createLinearGradient(0, 60, 0, 8);
  heat.addColorStop(0, '#ffd78100');
  heat.addColorStop(.23, '#ffbf60');
  heat.addColorStop(.58, '#ff5a1b');
  heat.addColorStop(1, '#f8441200');
  ink.fillStyle = heat;
  for (const [x, tip] of [[12, 26], [23, 10], [34, 18], [42, 7], [53, 30]]) {
    ink.beginPath();
    ink.moveTo(x - 7, 61);
    ink.bezierCurveTo(x - 16, 43, x + 11, 27, x - 3, tip);
    ink.bezierCurveTo(x + 13, 23, x + 16, 55, x + 5, 61);
    ink.fill();
  }
  return texture(canvas);
}

export function createEffects(scene, glow) {
  const random = seededRandom(401729);
  const puff = { map: makePuff(), transparent: true, depthWrite: false };
  const flameMap = flameTexture();
  const fire = new THREE.Group();
  scene.add(fire);
  const { x: fx, y: fy, z: fz } = FIRE_TARGET;
  const firelight = new THREE.PointLight('#ff793b', 0, 140, 1.8);
  firelight.position.set(fx + 24, fy + 14, fz);
  fire.add(firelight);
  const columns = [];
  for (let i = 0; i < 6; i++) {
    const x = fx + (i - 2.5) * 34;
    const z = fz + Math.sin(i * 2.3) * 55 - (i >= 3 ? 32 : 0);
    const y = elevation(x, z);
    const sparks = flareSprite(fire, glow, '#ff6928', 50, x, y + 7, z);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameMap, depthWrite: false, toneMapped: false }));
    flame.position.set(x, y + 10, z);
    fire.add(flame);
    const embers = Array.from({ length: 6 }, () => flareSprite(fire, glow, '#ffb358', 3.7, x, y, z));
    const puffs = [];
    for (let j = 0; i === 3 && j < 16; j++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ ...puff, color: '#201b22' }));
      const phase = j / 16 + random() * .04;
      puffs.push({ sprite, phase, drift: random() * 2 - 1, spin: random() * TAU });
      fire.add(sprite);
    }
    columns.push({ x, y, z, sparks, puffs, flame, embers });
  }
  const pool = [];
  for (let i = 0; i < 144; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial(puff));
    sprite.visible = false;
    scene.add(sprite);
    pool.push({ sprite });
  }
  const debris = [];
  const shardMaterial = new THREE.MeshLambertMaterial({ color: '#9e5335' });
  for (let i = 0; i < 24; i++) {
    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(.66 + random() * 1.1), shardMaterial);
    shard.visible = false;
    scene.add(shard);
    debris.push({ shard, velocity: new THREE.Vector3() });
  }
  let cursor = 0;
  let wake = 0, release = 0, trail = 0;
  let wreckTime = 0;
  let wreck = null;
  let fireOut = 0;

  function particles(kind, x, y, z, count, spread, plane = null) {
    const [life, color] = particlesStyle[kind];
    for (let i = 0; i < count; i++) {
      const p = pool[cursor++ % pool.length];
      const { sprite } = p;
      p.kind = kind;
      p.life = p.left = life * (.65 + random() * .7);
      p.vx = (random() - .5) * spread;
      p.vz = (random() - .5) * spread;
      p.vy = kind === 'drop' ? -11 - random() * 17 : 1 + random() * spread * .47;
      p.size = kind === 'drop' ? 1.7 + random() * 2.5 : 1.8 + random() * 5;
      if (plane) {
        p.vx += Math.sin(plane.yaw) * plane.speed * .46;
        p.vz -= Math.cos(plane.yaw) * plane.speed * .46;
      }
      if (kind === 'trace' || kind === 'tire') p.size *= .39;
      if (kind === 'tire') p.vy *= .28;
      sprite.position.set(x, y, z);
      sprite.material.color.set(color);
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
      release = 1.18;
      particles('drop', plane.x, plane.y - 1.55, plane.z + 1, 12, 13, plane);
      if (success) fireOut = .04;
    },
    reset() {
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
        const heat = 1 - fireOut;
        firelight.intensity = heat * (1850 + Math.sin(time * 7) * 460);
        for (const { x, y, z, sparks, puffs, flame, embers } of columns) {
          sparks.material.opacity = heat * (.69 + Math.sin(time * 11 + x) * .29);
          flame.scale.set(24 * heat, heat * (24 + 7 * Math.sin(time * 7 + z)), 1);
          flame.material.rotation = -.19 + Math.sin(time * 4 + x) * .16;
          for (const [i, ember] of embers.entries()) {
            const age = (time * (.45 + i * .028) + i * .17 + x * .014) % 1;
            ember.position.set(x + age * 32 + Math.sin(i * 7 + age * 7) * 13, y + 5 + age * 59, z + Math.cos(i * 4 + age * 5) * 18);
            ember.material.opacity = heat * (1 - age);
          }
          for (const { sprite, phase, drift, spin } of puffs) {
            const age = (phase + time * .086) % 1;
            const breadth = 15 + age * 55;
            sprite.position.set(x + age * (16 + drift * 20), y + 7 + age * 152, z - age * (41 + drift * 28));
            sprite.scale.set(breadth * 1.37, breadth, 1);
            sprite.material.opacity = Math.sin(age * Math.PI) ** .46 * (.89 - fireOut * .45);
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
        particles('trace', plane.x - Math.cos(plane.yaw) * .7, plane.y - .3, plane.z + Math.cos(plane.yaw), 1, 2);
      }
      wake -= dt;
      if (fire.visible && plane.agl < 12 && !plane.gear && !plane.grounded && wake <= 0) {
        wake = .055;
        for (const side of [-1, 1]) {
          const x = plane.x + side * Math.cos(plane.yaw) * 3.1;
          const z = plane.z + side * Math.sin(plane.yaw) * 3.1;
          particles('spray', x, plane.y - plane.agl + .85, z, 3, 6);
        }
      }
      if (wreck && dt > 0) {
        wreckTime += dt;
        if (Math.floor(wreckTime * 8) !== Math.floor((wreckTime - dt) * 8) && wreckTime < 15) {
          particles('smoke', wreck.x, wreck.y + 1.2, wreck.z, 4, 5);
        }
      }
      for (const p of pool) {
        const { sprite, kind } = p;
        if (!sprite.visible) continue;
        p.left -= dt;
        if (p.left <= 0) {
          sprite.visible = false;
          continue;
        }
        const age = 1 - p.left / p.life;
        sprite.position.x += p.vx * dt;
        sprite.position.y += p.vy * dt;
        sprite.position.z += p.vz * dt;
        if (kind === 'drop') p.vy -= 9.8 * dt;
        const size = p.size * (1 + age * (kind === 'smoke' ? 7 : 3));
        if (kind === 'drop') sprite.scale.set(size, size * 1.85, 1);
        else if (kind === 'tire') sprite.scale.set(size * 1.38, size * .65, 1);
        else sprite.scale.setScalar(size);
        sprite.material.opacity = (1 - age) * (kind === 'drop' ? .94 : kind === 'trace' ? .33 : .76);
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
