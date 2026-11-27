import { bindPilotInput } from './core/input.js';
import { FLIGHT_STEP, startFlightLoop } from './core/loop.js';
import { clamp, RAD } from './core/math.js';
import { createFlight, NEUTRAL, stepFlight } from './flight/flightModel.js';
import { createArchipelago } from './world/archipelago.js';
import { createFlightCamera } from './camera/flightCamera.js';
import { createHud } from './hud/hud.js';
import { createFlightCharts } from './hud/minimap.js';
import { MISSIONS, beginSortie, updateMission } from './missions/missionDirector.js';
import { scoreSortie } from './missions/debrief.js';
import { createDispatch, element } from './ui/dispatch.js';
import { renderFlightReport } from './ui/report.js';
import { buildFlightAudio } from './audio/engineSound.js';
import { SHOT_PRESETS } from './shots.js';

const view = element('view');
const world = createArchipelago(view);
const cameras = createFlightCamera();
const inputs = bindPilotInput(view);
const audio = buildFlightAudio();
const charts = createFlightCharts(element('dispatch-map'), element('minimap'));
const hud = createHud(element('instruments'), charts);
const dispatch = createDispatch(charts, launch);
const before = { x: 0, y: 0, z: 0 };
const titleRoute = {
  x: 393, y: 170, z: 681, yaw: -12 * RAD, speed: 48, roll: .11, pitch: .045,
  fuel: 42.8, grounded: false, throttle: .64, power: .64, gear: false, flaps: 0
};

let screen = 'title';
let sortie = beginSortie(MISSIONS[0]);
let preview = createFlight(titleRoute);
let time = 0;
let input = NEUTRAL;
let notification = '';
let notificationTime = 0;
let finishDelay = 0;
let pendingReport = null;
let requestAction = false;
let photoRig;

function switchScreen(next) {
  screen = next;
  document.body.dataset.screen = next;
  for (const panel of ['title', 'briefing', 'pause', 'debrief']) element(panel).hidden = next !== panel;
  element('hud').hidden = !['flight', 'pause', 'debrief'].includes(next);
  inputs.setActive(next === 'flight');
  if (next === 'briefing') dispatch.open();
}

function showDispatch() {
  audio.transient('ui');
  world.setTimeOfDay(false);
  cameras.reset();
  preview = createFlight(titleRoute);
  switchScreen('briefing');
}

function launch(mission) {
  audio.initialize();
  audio.transient('ui');
  sortie = beginSortie(mission);
  world.effects.reset();
  world.setTimeOfDay(Boolean(mission.night));
  cameras.reset(mission.night ? 'cockpit' : 'chase');
  pendingReport = null;
  finishDelay = notificationTime = 0;
  requestAction = false;
  input = NEUTRAL;
  switchScreen('flight');
}

function resize() {
  const { innerWidth: w, innerHeight: h } = window;
  world.resize(w, h);
  hud.resize(w, h);
  cameras.camera.aspect = w / h;
  cameras.camera.updateProjectionMatrix();
}

function say(message, seconds = 3) {
  notification = message;
  notificationTime = seconds;
}

function handleFlightEvent(event) {
  if (!event) return;
  world.effects.flightEvent(event, sortie.plane);
  if (event.type === 'takeoff') say('AIRBORNE · POSITIVE RATE');
  if (event.type === 'refuel') say('REFUELLING · HOLD BRAKES, POWER IDLE');
  if (event.type === 'rough') say('OFF-FIELD LANDING · AIRFRAME DAMAGE');
  if (event.type === 'bird') say('BIRD STRIKE · CHECK HANDLING');
  if (event.type === 'scrape') say('TREE STRIKE · CHECK AIRFRAME');
  if (event.type === 'touchdown') {
    const { sink, grade } = event.landing;
    say('Touchdown −' + sink.toFixed(1) + ' m/s · ' + grade, 4);
  }
  if (['touchdown', 'crash', 'rough', 'scrape', 'bird'].includes(event.type)) audio.transient(event.type);
}

function actInFlight(code) {
  const plane = sortie.plane;
  if (code === 'KeyF') plane.flaps = Math.min(3, plane.flaps + 1);
  if (code === 'KeyV') plane.flaps = Math.max(0, plane.flaps - 1);
  if (code === 'KeyG') {
    if (plane.grounded) say('GEAR LOCKED ON THE GROUND');
    else plane.gear = !plane.gear;
  }
  if (code === 'KeyB') plane.brakes = !plane.brakes;
  if (code === 'KeyC') cameras.toggle();
  if (code === 'Space') requestAction = true;
  if (code === 'Escape') switchScreen('pause');
}

function readActions() {
  const { actions, wheel, lookX, lookY } = inputs.readActions();
  for (const code of actions) {
    if (code === 'KeyM') say(audio.toggle() ? 'AUDIO MUTED' : 'AUDIO ON');
    if (code === 'KeyR' && ['flight', 'pause', 'debrief'].includes(screen)) {
      launch(sortie.definition);
      continue;
    }
    if (screen === 'flight') actInFlight(code);
    else if (screen === 'pause' && (code === 'Escape' || code === 'Enter')) switchScreen('flight');
    else if (screen === 'title' && (code === 'Enter' || code === 'Space')) showDispatch();
    else if (screen === 'briefing' && code === 'Escape') switchScreen('title');
    else if (screen === 'briefing' && code === 'Enter') launch(dispatch.selected());
  }
  if (screen === 'flight') {
    if (wheel) sortie.plane.throttle = clamp(sortie.plane.throttle + wheel, 0, 1);
    if (lookX || lookY) cameras.drag(lookX, lookY);
  }
}

function advanceFlight(dt) {
  const { plane, definition } = sortie;
  if (pendingReport) {
    if (!plane.crashed && plane.grounded) {
      const coast = Math.min(plane.speed, dt * 6.5);
      plane.speed -= coast;
      plane.x += Math.sin(plane.yaw) * plane.speed * dt;
      plane.z -= Math.cos(plane.yaw) * plane.speed * dt;
      plane.throttle = Math.max(0, plane.throttle - dt * .64);
      plane.power = Math.max(.12, plane.power - dt * .37);
    }
    finishDelay -= dt;
    if (finishDelay <= 0) {
      if (!photoRig) dispatch.save(definition.id, pendingReport);
      renderFlightReport(pendingReport, definition, dispatch.medal);
      switchScreen('debrief');
    }
    return;
  }
  before.x = plane.x;
  before.y = plane.y;
  before.z = plane.z;
  const event = stepFlight(plane, input, dt, definition.night ? 'dusk' : 'day');
  handleFlightEvent(event);
  const outcome = updateMission(sortie, before, event, requestAction, dt);
  requestAction = false;
  if (!outcome) return;
  if (outcome.drop) world.effects.drop(plane, outcome.finish);
  if (outcome.cue && event?.type !== 'touchdown' && !sortie.dropQuality) say(outcome.cue);
  if (outcome.cue && event?.type === 'touchdown' && !outcome.finish) say(notification + ' · ' + outcome.cue, 4);
  if (outcome.cue && definition.id === 'ring') audio.transient('gate');
  if (outcome.finish) {
    pendingReport = scoreSortie(definition, sortie, plane, outcome.crash);
    finishDelay = outcome.crash ? 1.55 : outcome.drop ? 2.5 : photoRig ? .56 : 2.1;
    if (outcome.crash) {
      cameras.reset('chase');
      say('Crashed: ' + outcome.crash.reason + ' at ' + outcome.crash.speed + ' kt', 4);
    }
  }
}

function update(dt) {
  if (screen === 'flight') {
    input = inputs.controls();
    notificationTime -= dt;
    advanceFlight(dt);
  }
}

function paint(dt) {
  if (screen !== 'pause') time += dt;
  const menu = screen === 'title' || screen === 'briefing';
  const cockpit = !menu && cameras.mode === 'cockpit';
  const shown = menu ? { definition: MISSIONS[0], gate: -1, plane: preview } : sortie;
  if (menu) {
    preview.x = titleRoute.x + Math.sin(time * .25) * 28;
    preview.z = titleRoute.z - Math.sin(time * .18) * 53;
    preview.roll = .115 + Math.sin(time * .60) * .083;
  }
  cameras.update(shown.plane, dt, menu, photoRig);
  world.paint(shown, input, cameras.camera, screen === 'pause' ? 0 : dt, time, cockpit);
  document.body.dataset.view = cockpit ? 'cockpit' : 'chase';
  if (!menu) hud.draw(sortie, cameras.camera, cockpit, notificationTime > 0 ? notification : '');
  else hud.clear();
  audio.update(sortie.plane, screen === 'flight', cockpit);
}

function runShot(preset) {
  photoRig = preset.rig;
  const mission = MISSIONS.find(record => record.id === preset.mission);
  sortie = beginSortie(mission);
  if (preset.plane) sortie.plane = createFlight(preset.plane);
  if (preset.gate !== undefined) sortie.gate = preset.gate;
  if (preset.actionFrame !== undefined) sortie.scooped = sortie.plane.load >= .65;
  if (preset.located) sortie.found = sortie.located = true;
  sortie.airborne = !sortie.plane.grounded;
  time = preset.time;
  input = { ...NEUTRAL, ...preset.controls };
  world.setTimeOfDay(Boolean(mission.night));
  cameras.reset(preset.camera);
  dispatch.select(mission);
  switchScreen(preset.screen ?? 'flight');
  let frames = 0;
  function expose() {
    if (frames === preset.actionFrame) requestAction = true;
    if (screen === 'flight') advanceFlight(FLIGHT_STEP);
    paint(1 / 60);
    if (++frames < (preset.frames ?? 20)) requestAnimationFrame(expose);
    else window.__shotReady = true;
  }
  requestAnimationFrame(expose);
  addEventListener('resize', () => paint(0));
}

element('open-briefing').addEventListener('click', () => {
  audio.initialize();
  showDispatch();
});
element('brief-back').addEventListener('click', () => switchScreen('title'));
element('resume').addEventListener('click', () => switchScreen('flight'));
element('pause-restart').addEventListener('click', () => launch(sortie.definition));
element('pause-dispatch').addEventListener('click', showDispatch);
element('debrief-restart').addEventListener('click', () => launch(sortie.definition));
element('debrief-dispatch').addEventListener('click', showDispatch);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'flight' && !pendingReport && !preset) switchScreen('pause');
});
addEventListener('resize', resize);
resize();
const shotName = new URLSearchParams(location.search).get('shot');
const preset = Object.hasOwn(SHOT_PRESETS, shotName) ? SHOT_PRESETS[shotName] : null;
if (preset) runShot(preset);
else startFlightLoop(update, dt => {
  readActions();
  paint(dt);
});
