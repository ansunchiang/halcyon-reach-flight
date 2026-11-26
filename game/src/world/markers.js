import * as THREE from '../../vendor/three.module.min.js';
import { GATES } from '../missions/ringRun.js';
import { RESCUE_TARGET } from '../missions/searchRescue.js';
import { flareSprite } from './mesh.js';

function buildSurveyGate(gate, glow) {
  const frame = new THREE.Group();
  frame.position.set(gate.x, gate.y, gate.z);
  frame.rotation.y = -gate.course;
  const metal = new THREE.MeshBasicMaterial({ color: '#ffe69e' });
  const teal = new THREE.MeshBasicMaterial({ color: '#78ffe1' });
  const dim = new THREE.MeshBasicMaterial({ color: '#3bb9a3', transparent: true, opacity: .55, depthWrite: false });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(gate.radius * 1.025, .31, 8, 100), dim);
  frame.add(outer);
  const segments = new THREE.Group();
  frame.add(segments);
  for (let i = 0; i < 8; i++) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(gate.radius, i % 2 === 0 ? 1.08 : .77, 8, 16, .60),
      i % 2 === 0 ? metal : teal);
    arc.rotation.z = Math.PI / 4 * i + .09;
    segments.add(arc);
    const a = i * Math.PI / 4 + .39;
    const size = i % 2 === 0 ? 9.6 : 6.8;
    flareSprite(frame, glow, i % 2 === 0 ? '#ffbd58' : '#52ffe0', size,
      Math.cos(a) * gate.radius, Math.sin(a) * gate.radius, .5);
  }
  for (const axis of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const guide = new THREE.Mesh(new THREE.BoxGeometry(5.5, .78, .7), teal);
    guide.position.set(Math.cos(axis) * gate.radius * .91, Math.sin(axis) * gate.radius * .91, 0);
    guide.rotation.z = axis;
    frame.add(guide);
  }
  return { frame, segments };
}

export function buildMissionMarkers(scene, glow) {
  const gates = GATES.map(gate => buildSurveyGate(gate, glow));
  for (const { frame } of gates) scene.add(frame);
  const flare = new THREE.Group();
  flare.position.set(RESCUE_TARGET.x, RESCUE_TARGET.y + 11, RESCUE_TARGET.z);
  const light = flareSprite(flare, glow, '#ff4a3f', 92, 0, 0, 0);
  const source = flareSprite(flare, glow, '#ffdcaf', 17, 0, 0, 0);
  scene.add(flare);
  return (sortie, time) => {
    gates.forEach(({ frame, segments }, i) => {
      frame.visible = sortie.definition.id === 'ring' && i === sortie.gate;
      if (frame.visible) segments.rotation.z = Math.sin(time * .85) * .085;
    });
    flare.visible = sortie.definition.id === 'rescue' && !sortie.located;
    light.material.opacity = .52 + Math.sin(time * 6.2) * .36;
    source.scale.setScalar(14 + Math.sin(time * 5.8) * 5);
  };
}
