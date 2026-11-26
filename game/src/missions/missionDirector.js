import { clamp, distance, KNOT, RAD } from '../core/math.js';
import { FIELDS, fieldPoint } from '../world/chart.js';
import { createFlight } from '../flight/flightModel.js';
import { GATES, advanceRingRun } from './ringRun.js';
import { MAIL_DESTINATION, checkDelivery, landingObjective } from './mailRun.js';
import { FIRE_TARGET, LAKE_TARGET, advanceFireWatch } from './fireWatch.js';
import { RESCUE_TARGET, SEARCH_SECTOR, advanceSearchRescue } from './searchRescue.js';
import { duskStart } from './duskApproach.js';

export const MISSIONS = [
  { id: 'ring', name: 'Ring Run', tag: 'Precision flying', base: 'Cinder Point', time: '1–3 min', from: 2,
    summary: 'Fly eight survey gates from Cinder Point to the Marten Valley. Score for time and clean passes through the middle.',
    notes: ['Depart east from Cinder Point.', 'Cross each gate in sequence. A missed gate must be flown again.'],
    objective: '8 survey gates' },
  { id: 'mail', name: 'Mail Run', tag: 'Airfield transfer', base: 'Gullhaven', time: '2–4 min', from: 0,
    summary: 'Carry the harbour post to Tarn Lake. Join the approach from the south and land in the marked touchdown zone.',
    notes: ['Depart Gullhaven runway 36.', 'Aim for 62–72 kt with flaps on final. Touch down in the first third.'],
    objective: 'Land at Tarn Lake' },
  { id: 'fire', name: 'Fire Watch', tag: 'Water bomber', base: 'Tarn Lake', time: '2–5 min', from: 1, reverse: true,
    summary: 'Skim Tarn Lake to fill the Petrel’s scoop tank, then carry the water over the smoke at Marten Ridge.',
    notes: ['Gear up. Keep 2–11 m above the lake and 45–93 kt until the tank is full.', 'Drop with Space at 16–148 m AGL, upwind of the flame line.'],
    objective: 'Scoop and drop water' },
  { id: 'rescue', name: 'Search & Rescue', tag: 'Visual search', base: 'Gullhaven', time: '3–6 min', from: 0,
    summary: 'Find a hiker’s flare in Marten Valley. Orbit to radio a position fix, then bring the Petrel home.',
    notes: ['Scan the search sector for a red flare.', 'Track a 245° arc, staying 110–410 m from the flare, and land at Gullhaven.'],
    objective: 'Locate the hiker' },
  { id: 'dusk', name: 'Dusk Approach', tag: 'Crosswind landing', base: 'Gullhaven', time: '1–2 min', night: true,
    summary: 'You are on short final for runway 36. Use the PAPI and correct for a west crosswind before touchdown.',
    notes: ['Two red and two white PAPI lights indicate the approach path.', 'Use Q/E to straighten the nose as you flare. Touch down in the marked zone.'],
    objective: 'Land on runway 36' }
];

export function beginSortie(definition) {
  const field = FIELDS[definition.from ?? 0];
  const start = definition.night ? duskStart() : {
    ...fieldPoint(field, 0, (definition.reverse ? 1 : -1) * (field.length / 2 - 51)),
    yaw: field.course + (definition.reverse ? Math.PI : 0)
  };
  return {
    definition, plane: createFlight(start), gate: 0, accuracy: 0, missed: '', airborne: Boolean(definition.night),
    found: false, located: false, orbit: 0, lastOrbit: null, landing: null, dropQuality: 0, scooped: false
  };
}

export function activeObjective(sortie) {
  const { id, objective } = sortie.definition;
  const plane = sortie.plane;
  if (id === 'ring') {
    const gate = GATES[Math.min(sortie.gate, GATES.length - 1)];
    return { ...gate, label: 'Gate ' + Math.min(sortie.gate + 1, 8) + '/8', detail: sortie.missed || 'Cross the illuminated gate', kind: 'gate' };
  }
  if (id === 'fire') {
    return plane.load >= .65
      ? { ...FIRE_TARGET, detail: 'Release water over the flame line', kind: 'fire' }
      : { ...LAKE_TARGET, detail: 'Gear up · skim the lake at 2–11 m', kind: 'lake' };
  }
  if (id === 'rescue' && !sortie.located) {
    return sortie.found
      ? { ...RESCUE_TARGET, detail: Math.floor(Math.abs(sortie.orbit) / RAD) + '° / 245° of orbit logged', kind: 'rescue' }
      : { ...SEARCH_SECTOR, detail: 'Scan the valley for a red flare', kind: 'search' };
  }
  const field = id === 'mail' ? MAIL_DESTINATION : FIELDS[0];
  return { ...landingObjective(field), detail: id === 'rescue' ? 'RTB · bring the aircraft home' : objective, kind: 'landing' };
}

export function updateMission(sortie, before, event, action, dt) {
  const plane = sortie.plane;
  const { id } = sortie.definition;
  if (event?.type === 'crash') return { finish: true, crash: event };
  if (event?.type === 'takeoff' || !plane.grounded) sortie.airborne = true;
  if (event?.type === 'touchdown') {
    sortie.landing = event.landing;
    if (sortie.airborne && (id === 'mail' || id === 'dusk' || id === 'rescue' && sortie.located)) {
      return checkDelivery(sortie, event.landing, id === 'mail' ? MAIL_DESTINATION : FIELDS[0]);
    }
  }
  if (!sortie.airborne) return;
  if (id === 'ring' && !plane.grounded) return advanceRingRun(sortie, before, plane);
  if (id === 'fire') return advanceFireWatch(sortie, plane, action, dt);
  if (id === 'rescue') return advanceSearchRescue(sortie, plane);
}

export function showRange(plane, objective) {
  const meters = distance(plane, objective);
  return meters < 1000 ? Math.round(meters) + ' m' : (meters / 1000).toFixed(2) + ' km';
}

export function missionMeasure(sortie) {
  const { plane, definition } = sortie;
  if (definition.id === 'ring') return Math.min(8, sortie.gate) + ' / 8 GATES';
  if (definition.id === 'fire') return Math.round(plane.load * 100) + '% WATER';
  if (definition.id === 'rescue') return sortie.located ? 'RETURN TO BASE' : Math.floor(clamp(Math.abs(sortie.orbit) / (245 * RAD), 0, 1) * 100) + '% FIX';
  if (!plane.wind) return 'READY';
  if (definition.night) return Math.round(Math.abs(plane.wind.x) * KNOT) + ' KT CROSSWIND →';
  return plane.grounded ? 'GROUND ROLL' : 'EN ROUTE';
}
