import * as THREE from '../../vendor/three.module.min.js';
import { bearing, angleDelta, heading, KNOT } from '../core/math.js';
import { FUEL_CAPACITY } from '../flight/engine.js';
import { activeObjective, missionMeasure, showRange } from '../missions/missionDirector.js';
import { elapsedLabel } from '../missions/debrief.js';
import { element } from '../ui/dispatch.js';
import { dialText } from './dials.js';
import { drawFlightTapes } from './flightTapes.js';
import { drawInstrumentPanel } from './instrumentPanel.js';

function set(id, message) {
  const node = element(id);
  if (node.textContent !== message) node.textContent = message;
}

function renderSystems(plane) {
  const rounded = (x) => Math.round(x * 100) + '%';
  const fuel = rounded(plane.fuel / FUEL_CAPACITY);
  const damage = rounded(plane.damage);
  const power = rounded(plane.throttle);
  element('fuel-bar').style.width = fuel;
  element('damage-bar').style.width = damage;
  element('power-bar').style.width = power;
  set('fuel-value', plane.fuel.toFixed(1) + 'L');
  set('damage-value', damage);
  set('power-value', power);
  set('g-load', plane.g.toFixed(1) + ' G');
  set('flap-state', 'FLAP ' + [0, 10, 20, 35][plane.flaps] + '°');
  set('gear-state', 'GEAR ' + (plane.gear ? 'DN' : 'UP'));
  set('brake-state', plane.brakes ? 'BRK ON' : 'BRK OFF');
}

export function createHud(canvas, charts) {
  const g = canvas.getContext('2d');
  const marker = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const relative = new THREE.Vector3();
  let width = 0;
  let height = 0;
  let ratio = 1;

  function resize(w, h) {
    width = w;
    height = h;
    ratio = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawWorldMarker(camera, objective, plane) {
    if (objective.kind === 'gate' || objective.kind === 'landing' || plane.grounded) return;
    marker.set(objective.x, objective.y + (objective.kind === 'fire' ? 22 : 8), objective.z);
    camera.getWorldDirection(direction);
    if (relative.copy(marker).sub(camera.position).dot(direction) <= 0) return;
    marker.project(camera);
    const x = width * (marker.x + 1) * .5;
    const y = height * (1 - marker.y) * .5;
    if (x < 175 || x > width - 175 || y < 117 || y > height - 198) return;
    const color = '#fff0bb';
    g.save();
    g.translate(x, y);
    g.strokeStyle = color;
    g.lineWidth = 1.2;
    g.shadowColor = '#192929';
    g.shadowBlur = 5;
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(12, 0);
    g.lineTo(0, 12);
    g.lineTo(-12, 0);
    g.closePath();
    g.stroke();
    const tag = objective.kind === 'fire' ? 'FIRE LINE' : objective.kind === 'rescue' ? 'FLARE' :
      objective.kind === 'lake' ? 'SCOOP' : 'SEARCH';
    dialText(g, tag, 0, 23, color, 10.5);
    g.restore();
  }

  return {
    resize,
    clear() { g.clearRect(0, 0, width, height); },
    draw(sortie, camera, cockpit, notification) {
      const plane = sortie.plane;
      const objective = activeObjective(sortie);
      const target = bearing(plane, objective);
      const root = element('hud');
      root.dataset.speed = Math.round(plane.speed * KNOT);
      root.dataset.altitude = Math.round(plane.y * 3.28084);
      root.dataset.heading = heading(plane.yaw);
      root.dataset.grounded = String(plane.grounded);
      g.clearRect(0, 0, width, height);
      drawInstrumentPanel(g, width, height, plane, cockpit, Boolean(sortie.definition.night));
      drawWorldMarker(camera, objective, plane);
      drawFlightTapes(g, width, height, plane, angleDelta(plane.yaw, target), cockpit, objective);
      charts.drawMini(plane, objective);
      set('mission-title', sortie.definition.name);
      set('mission-clock', elapsedLabel(plane.elapsed));
      set('mission-phase', plane.grounded ? 'GROUND OPERATIONS' : 'ACTIVE SORTIE');
      set('objective-name', objective.label);
      set('objective-range', showRange(plane, objective));
      set('objective-detail', objective.detail);
      set('mission-measure', missionMeasure(sortie));
      set('map-bearing', 'BRG ' + heading(target));
      set('map-camera', cockpit ? 'COCKPIT' : 'CHASE');
      renderSystems(plane);
      const warning = plane.stallWarning ? 'STALL · LOWER THE NOSE' :
        plane.fuel < 12 ? 'LOW FUEL' + (plane.damage >= .25 ? '  /  AIRFRAME DAMAGE' : ' · PLAN A REFUEL STOP') :
          plane.damage >= .25 ? 'AIRFRAME DAMAGE · REDUCED CONTROL' : '';
      element('flight-warning').hidden = !warning;
      element('event-banner').hidden = !notification;
      set('flight-warning', warning);
      set('event-banner', notification || '');
    }
  };
}
