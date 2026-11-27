import { element } from './dispatch.js';
import { MISSIONS } from '../missions/missionDirector.js';

function labelNode(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

export function renderFlightReport(report, mission, medal) {
  element('debrief-title').textContent = report.crash ? 'Aircraft lost' : mission.name + ' complete';
  element('debrief-kicker').textContent = report.crash ? 'INCIDENT REPORT' : 'FLIGHT REPORT · ' + report.medal;
  element('debrief-result').textContent = report.crash
    ? 'Crashed: ' + report.crash.reason + ' at ' + report.crash.speed + ' kt'
    : report.landing ? report.landing.field.name + ' · ' + report.landing.grade + ' touchdown'
      : mission.id === 'ring' ? 'Eight survey gates recorded.' : 'Water delivered to the fire line.';
  const landing = report.landing;
  const rows = [
    ['Sortie time', report.time],
    ['Score', report.score + ' / 100'],
    ['Touchdown V/S', landing ? '−' + landing.sink.toFixed(1) + ' m/s' : '—'],
    ['Centreline', landing ? landing.across.toFixed(1) + ' m' : '—'],
    ['Fuel used', report.fuel.toFixed(1) + ' L'],
    ['Damage', Math.round(report.damage * 100) + '%']
  ];
  element('report').replaceChildren(...rows.map(([label, value]) => {
    const cell = document.createElement('div');
    cell.className = 'report-cell';
    cell.append(labelNode('small', label), labelNode('b', value));
    return cell;
  }));
  element('sortie-records').replaceChildren(...MISSIONS.map(sortie => {
    const row = document.createElement('li');
    const best = medal(sortie.id);
    row.dataset.medal = best === 'OPEN' && sortie === mission && !report.crash ? report.medal : best;
    row.append(labelNode('b', sortie.name), labelNode('small', sortie.objective), labelNode('strong', row.dataset.medal));
    return row;
  }));
}
