import * as THREE from '../../vendor/three.module.min.js';
import { box, tube } from '../world/mesh.js';
import { drawInstrumentPanel } from '../hud/instrumentPanel.js';

export function buildCockpit(scene) {
  const cabin = new THREE.Group();
  const enamel = new THREE.MeshStandardMaterial({ color: '#26343b', metalness: .28, roughness: .57,
    emissive: '#26383e', emissiveIntensity: .52 });
  const vinyl = new THREE.MeshLambertMaterial({ color: '#252e32', emissive: '#212930' });
  const trim = new THREE.MeshLambertMaterial({ color: '#a39b82', emissive: '#574d42' });
  const lamp = new THREE.MeshBasicMaterial({ color: '#ffd698', toneMapped: false });
  const lever = new THREE.MeshLambertMaterial({ color: '#a94b2d', emissive: '#652a1e' });
  const corners = [-1.17, .77, -2.38, 1.17, .77, -2.38, -.76, 1.91, -1.92, .76, 1.91, -1.92];
  const windscreen = new THREE.BufferGeometry();
  windscreen.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
  windscreen.setAttribute('color', new THREE.Float32BufferAttribute([
    .59, .71, .76, .10, .74, .62, .60, .13, .51, .61, .78, .03, .64, .75, .82, .035
  ], 4));
  windscreen.setIndex([0, 1, 2, 1, 3, 2]);
  cabin.add(new THREE.Mesh(windscreen, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false
  })));
  for (const s of [-1, 1]) {
    tube(cabin, enamel, .052, [s * 1.17, .77, -2.38], [s * .76, 1.91, -1.92], .068);
    tube(cabin, trim, .009, [s * 1.136, .79, -2.32], [s * .729, 1.91, -1.88]);
    tube(cabin, enamel, .055, [s * .76, 1.91, -1.92], [s * .72, 1.85, -.36]);
  }
  tube(cabin, enamel, .065, [-.76, 1.91, -1.92], [.76, 1.91, -1.92]);
  box(cabin, vinyl, 2.35, .07, .33, 0, .816, -2.38);
  box(cabin, vinyl, 3.25, .75, .12, 0, .415, -2.30);
  tube(cabin, trim, .015, [-1.13, .845, -2.21], [1.13, .845, -2.21]);
  for (let i = -24; i <= 24; i++) box(cabin, vinyl, .022, .012, .009, i * .043, .85, -2.20);
  tube(cabin, enamel, .065, [.30, .876, -2.31], [.30, .876, -2.18], .055, 18);
  box(cabin, lamp, .068, .006, .002, .30, .879, -2.178);
  for (const x of [.274, .30, .326]) box(cabin, trim, .003, .023, .003, x, .879, -2.176);

  const face = document.createElement('canvas');
  face.width = 920;
  face.height = 219;
  const context = face.getContext('2d');
  const texture = new THREE.CanvasTexture(face);
  texture.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.78, .424),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false }));
  panel.position.set(0, .623, -2.18);
  cabin.add(panel);
  box(cabin, enamel, 1.79, .45, .11, 0, .617, -2.25);

  const grip = new THREE.Mesh(new THREE.TorusGeometry(.098, .017, 8, 24, Math.PI * 1.52), enamel);
  grip.rotation.z = -.26;
  grip.position.set(-.35, .385, -2.01);
  cabin.add(grip);
  box(cabin, trim, .185, .016, .033, -.35, .397, -2.01);
  tube(cabin, enamel, .034, [-.35, .391, -2.015], [-.35, .395, -2.23]);
  box(cabin, enamel, .26, .09, .18, .47, .335, -2.17);
  for (const [i, knob] of [vinyl, lever, trim].entries()) {
    const x = .40 + i * .072;
    tube(cabin, trim, .008, [x, .36, -2.12], [x, .422 - i * .018, -2.065]);
    tube(cabin, knob, .022, [x, .42 - i * .018, -2.065], [x, .436 - i * .018, -2.065]);
  }
  scene.add(cabin);
  return (airframe, plane, visible, night) => {
    cabin.visible = visible;
    if (!visible) return;
    cabin.position.copy(airframe.position);
    cabin.quaternion.copy(airframe.quaternion);
    drawInstrumentPanel(context, face.width, face.height, plane, true, night);
    texture.needsUpdate = true;
  };
}
