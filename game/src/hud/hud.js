import { Vector3 } from '../../vendor/three.module.min.js';
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
  return node;
}

function renderSystems(plane) {
  const levels = { fuel: plane.fuel / FUEL_CAPACITY, damage: plane.damage, power: plane.throttle };
  for (const [name, level] of Object.entries(levels)) {
    const percent = Math.round(level * 100) + '%';
    element(name + '-bar').style.width = percent;
    set(name + '-value', name === 'fuel' ? plane.fuel.toFixed(1) + 'L' : percent);
  }
  set('g-load', plane.g.toFixed(1) + ' G');
  set('flap-state', 'FLAP ' + [0, 10, 20, 35][plane.flaps] + '°');
  set('gear-state', 'GEAR ' + (plane.gear ? 'DN' : 'UP'));
  set('brake-state', plane.brakes ? 'BRK ON' : 'BRK OFF');
}

export function createHud(canvas, charts) {
  const g = canvas.getContext('2d');
  const root = element('hud');
  const marker = new Vector3();
  let width = 0;
  let height = 0;

  function resize(w, h) {
    width = w;
    height = h;
    const ratio = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawWorldMarker(camera, objective, plane) {
    const { kind } = objective;
    if (kind === 'gate' || kind === 'landing' || plane.grounded) return;
    marker.set(objective.x, objective.y + (kind === 'fire' ? 22 : 8), objective.z);
    marker.project(camera);
    if (Math.abs(marker.z) > 1) return;
    const x = width * (marker.x + 1) * .5;
    const y = height * (1 - marker.y) * .5;
    if (x < 175 || x > width - 175 || y < 117 || y > height - 198) return;
    g.save();
    g.translate(x, y);
    g.strokeStyle = '#fff0bb';
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
    const tag = kind === 'fire' ? 'FIRE LINE' : kind === 'rescue' ? 'FLARE' : kind === 'lake' ? 'SCOOP' : 'SEARCH';
    dialText(g, tag, 0, 23, g.strokeStyle, 10.5);
    g.restore();
  }

  return {
    resize,
    clear() { g.clearRect(0, 0, width, height); },
    draw(sortie, camera, cockpit, notification) {
      const plane = sortie.plane;
      const objective = activeObjective(sortie);
      const target = bearing(plane, objective);
      const clean = root.classList.contains('shot-clean');
      root.dataset.speed = Math.round(plane.speed * KNOT);
      root.dataset.altitude = Math.round(plane.y * 3.28084);
      root.dataset.heading = heading(plane.yaw);
      root.dataset.grounded = plane.grounded;
      g.clearRect(0, 0, width, height);
      if (!cockpit) drawInstrumentPanel(g, width, height, plane, false, sortie.definition.night);
      if (!clean) drawWorldMarker(camera, objective, plane);
      drawFlightTapes(g, width, height, plane, angleDelta(plane.yaw, target), cockpit, objective, clean,
        root.classList.contains('shot-fire'));
      set('mission-title', sortie.definition.name);
      set('objective-name', objective.label);
      set('objective-range', showRange(plane, objective));
      const warning = plane.stallWarning ? 'STALL · LOWER THE NOSE' :
        plane.fuel < 12 ? 'LOW FUEL' + (plane.damage >= .25 ? '  /  AIRFRAME DAMAGE' : ' · PLAN A REFUEL STOP') :
          plane.damage >= .25 ? 'AIRFRAME DAMAGE · REDUCED CONTROL' : '';
      const caution = set('flight-warning', warning);
      caution.hidden = !warning;
      caution.classList.toggle('caution', warning && !plane.stallWarning);
      set('event-banner', notification).hidden = !notification;
      if (clean) return;
      charts.drawMini(plane, objective);
      set('mission-clock', elapsedLabel(plane.elapsed));
      set('mission-phase', plane.grounded ? 'GROUND OPERATIONS' : 'ACTIVE SORTIE');
      set('objective-detail', objective.detail);
      set('mission-measure', missionMeasure(sortie));
      set('map-bearing', 'BRG ' + heading(target));
      set('map-camera', cockpit ? 'COCKPIT' : 'CHASE');
      renderSystems(plane);
    }
  };
}
