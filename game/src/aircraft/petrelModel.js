import * as THREE from '../../vendor/three.module.min.js';
import { box, flareSprite, tube } from '../world/mesh.js';
import { paintPetrelWing, paintRegistration } from './livery.js';

function loft(segments, materials) {
  const points = [];
  const indices = [];
  const sides = 12;
  for (const [z, rx, ry, cy] of segments) {
    for (let j = 0; j < sides; j++) {
      const a = j / sides * Math.PI * 2;
      points.push(Math.sin(a) * rx, cy + Math.cos(a) * ry, z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  for (let ring = 0; ring < segments.length - 1; ring++) {
    for (let side = 0; side < sides; side++) {
      const a = ring * sides + side;
      const b = ring * sides + (side + 1) % sides;
      geometry.addGroup(indices.length, 6, ring === 0 ? 1 : side === 3 || side === 8 ? 2 : side >= 4 && side <= 7 ? 1 : 0);
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, materials);
}

function glassCabin(frame, glass, cream) {
  const g = new THREE.Group();
  const corners = [
    [-.75, .21, -1.92], [.75, .21, -1.92], [-.67, 1.38, -.98], [.67, 1.38, -.98],
    [-.82, .21, .87], [.82, .21, .87], [-.61, 1.32, .68], [.61, 1.32, .68]
  ];
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
  geom.setIndex([0, 1, 2, 1, 3, 2, 0, 2, 4, 2, 6, 4, 1, 5, 3, 3, 5, 7, 4, 6, 5, 5, 6, 7]);
  geom.computeVertexNormals();
  g.add(new THREE.Mesh(geom, glass));
  for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3], [2, 6], [3, 7],
    [4, 6], [5, 7], [4, 5], [6, 7], [1, 5], [0, 4]]) {
    tube(g, frame, .05, corners[a], corners[b]);
  }
  tube(g, cream, .031, [0, .23, -1.95], [0, 1.38, -1.01]);
  return g;
}

function propBlur() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ink = canvas.getContext('2d');
  ink.translate(48, 48);
  for (let ring = 0; ring < 8; ring++) {
    ink.beginPath();
    ink.arc(0, 0, 17 + ring * 3.8, ring * .33, ring * .33 + 5.1);
    ink.lineWidth = ring === 7 ? 2.5 : 3;
    ink.strokeStyle = ring === 7 ? '#ffe6b2c4' : '#b5c8df40';
    ink.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

export function buildPetrel(scene, glow) {
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const cream = new THREE.MeshStandardMaterial({ color: '#ead9b3', roughness: .54, metalness: .15, side: THREE.DoubleSide });
  const orange = new THREE.MeshStandardMaterial({ color: '#c34a26', roughness: .45, metalness: .18, side: THREE.DoubleSide });
  const teal = new THREE.MeshStandardMaterial({ color: '#234655', roughness: .47, metalness: .2, side: THREE.DoubleSide });
  const black = new THREE.MeshLambertMaterial({ color: '#23282d' });
  const metal = new THREE.MeshStandardMaterial({ color: '#9ca3a0', roughness: .29, metalness: .49 });
  const glass = new THREE.MeshStandardMaterial({ color: '#4386ac', roughness: .17, metalness: .19,
    side: THREE.DoubleSide, transparent: true, opacity: .38, depthWrite: false });
  const body = loft([
    [-3.34, .37, .36, -.04], [-2.85, .63, .51, -.045], [-1.9, .77, .58, -.10],
    [-.42, .88, .65, -.09], [1.03, .76, .62, -.07], [2.36, .50, .43, -.025],
    [3.94, .24, .27, .04], [4.71, .13, .18, .08]
  ], [cream, orange, teal]);
  root.add(body);
  const cabin = glassCabin(teal, glass, cream);
  root.add(cabin);
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(.205, 10, 8),
    new THREE.MeshLambertMaterial({ color: '#e3b488' }));
  pilot.position.set(-.25, .98, -.56);
  pilot.scale.set(.93, 1.18, .96);
  root.add(pilot);
  box(root, teal, .42, .42, .29, -.25, .61, -.47);
  tube(root, black, .11, [-.46, 1.015, -.53], [-.05, 1.015, -.53], .11, 10);
  const wing = box(root, [cream, cream, paintPetrelWing(), orange, teal, orange], 13.7, .25, 2.35, 0, 1.43, -.32);
  wing.rotation.x = .025;
  box(root, teal, 13.55, .085, .15, 0, 1.42, -1.55);
  const flightSurfaces = [];
  for (const side of [-1, 1]) {
    tube(root, cream, .088, [side * .73, -.52, .50], [side * 4.57, 1.34, -.83], .056);
    tube(root, teal, .056, [side * .79, -.44, .56], [side * 4.57, 1.34, .21], .038);
    box(root, orange, .22, .18, 1.99, 6.86 * side, 1.43, -.34);
    const flap = new THREE.Group();
    flap.position.set(side * 2.02, 1.40, .78);
    box(flap, cream, 2.51, .075, .57, 0, 0, .26);
    root.add(flap);
    const aileron = new THREE.Group();
    aileron.position.set(side * 5.0, 1.41, .77);
    box(aileron, teal, 3.12, .068, .51, 0, 0, .24);
    root.add(aileron);
    flightSurfaces.push({ flap, aileron, side });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.73, .31), paintRegistration('HR-PTL', '#234655', '#ead9b3'));
    label.rotation.y = side * Math.PI / 2;
    label.position.set(side * .537, .055, 2.14);
    root.add(label);
    for (const offset of [-.09, .09]) {
      box(root, black, .018, .05, .68, side * .638, -.13 + offset, -2.38);
    }
    tube(root, black, .057, [side * .66, -.43, -2.47], [side * .79, -.38, -1.87], .028);
  }
  const tail = box(root, cream, 4.85, .14, 1.12, 0, .18, 3.91);
  tail.rotation.x = -.042;
  box(root, orange, .42, .13, 1.10, -2.19, .19, 3.91);
  box(root, orange, .42, .13, 1.10, 2.19, .19, 3.91);
  const elevator = new THREE.Group();
  elevator.position.set(0, .20, 4.39);
  box(elevator, teal, 4.65, .075, .54, 0, 0, .23);
  root.add(elevator);
  const profile = new THREE.Shape();
  profile.moveTo(3.27, .25);
  profile.lineTo(4.28, 1.99);
  profile.lineTo(4.88, 2.08);
  profile.lineTo(4.93, .24);
  profile.closePath();
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: .135, bevelEnabled: false }), orange);
  fin.rotation.y = -Math.PI / 2;
  fin.position.x = .0675;
  root.add(fin);
  const rudder = new THREE.Group();
  rudder.position.set(0, 1.09, 4.84);
  box(rudder, teal, .108, 1.77, .43, 0, 0, .20);
  box(rudder, cream, .115, .17, .44, 0, .34, .20);
  root.add(rudder);

  const gear = new THREE.Group();
  for (const side of [-1, 1]) {
    tube(gear, metal, .068, [side * .69, -.48, -.93], [side * 1.38, -1.10, -.83]);
    tube(gear, teal, .07, [side * .36, -.53, .13], [side * 1.39, -1.10, -.83]);
    tube(gear, black, .42, [side * 1.22, -1.08, -.83], [side * 1.58, -1.08, -.83], .42, 20);
    tube(gear, metal, .185, [side * 1.58, -1.08, -.83], [side * 1.60, -1.08, -.83], .185, 12);
    const spat = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), orange);
    spat.position.set(side * 1.40, -.91, -.91);
    spat.scale.set(.23, .25, .53);
    gear.add(spat);
  }
  tube(gear, metal, .045, [0, -.08, 3.9], [0, -.60, 4.55]);
  tube(gear, black, .167, [-.10, -.63, 4.52], [.10, -.63, 4.52], .167, 14);
  root.add(gear);

  const prop = new THREE.Group();
  prop.position.set(0, -.04, -3.46);
  tube(prop, metal, .22, [0, 0, .25], [0, 0, -.24], .045, 16);
  for (const side of [-1, 1]) {
    const blade = box(prop, teal, .14, 1.38, .07, 0, side * .78, 0);
    blade.rotation.z = side > 0 ? -.17 : .17;
    box(prop, cream, .14, .12, .07, side * .09, side * 1.38, 0);
  }
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(3.03, 3.03), new THREE.MeshBasicMaterial({
    map: propBlur(), transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false
  }));
  disc.position.set(0, -.04, -3.51);
  root.add(prop, disc);
  const port = flareSprite(root, glow, '#ff2823', 1.42, -7.04, 1.47, -.46);
  const starboard = flareSprite(root, glow, '#33ff96', 1.42, 7.04, 1.47, -.46);
  const strobe = flareSprite(root, glow, '#ffffff', 2, 0, 2.0, 4.9);
  const beacon = flareSprite(root, glow, '#ff653a', 1.21, 0, 1.65, .28);
  scene.add(root);

  return {
    root,
    update(plane, input, dt, cockpit) {
      root.visible = !cockpit && !plane.crashed;
      root.position.set(plane.x, plane.y, plane.z);
      root.rotation.set(plane.pitch, -plane.yaw, -plane.roll, 'YXZ');
      gear.visible = plane.gear;
      prop.rotation.z += dt * (17 + plane.power * 88);
      disc.rotation.z = prop.rotation.z * .21;
      disc.material.opacity = .27 + plane.power * .68;
      elevator.rotation.x = input.pitch * .37;
      rudder.rotation.y = input.rudder * .31;
      for (const { flap, aileron, side } of flightSurfaces) {
        flap.rotation.x = -plane.flaps * .19;
        aileron.rotation.x = side * input.roll * .35;
      }
      port.material.opacity = starboard.material.opacity = .92;
      strobe.material.opacity = plane.elapsed % 1.82 < .14 ? 1 : .21;
      beacon.material.opacity = .25 + .68 * Math.pow(.5 + Math.sin(plane.elapsed * 5.8) * .5, 5);
    }
  };
}
