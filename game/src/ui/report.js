import { element } from './dispatch.js';

export function renderFlightReport(report, mission) {
  element('debrief-title').textContent = report.crash ? 'Aircraft lost' : mission.name + ' complete';
  element('debrief-kicker').textContent = report.crash ? 'INCIDENT REPORT' : 'FLIGHT REPORT · ' + report.medal;
  element('debrief-result').textContent = report.crash
    ? 'Crashed: ' + report.crash.reason + ' at ' + report.crash.speed + ' kt'
    : report.landing ? report.landing.field.name + ' · ' + report.landing.grade + ' touchdown'
      : mission.id === 'ring' ? 'Eight survey gates recorded.' : 'Water delivered to the fire line.';
  const landing = report.landing;
  const rows = [
    ['Time airborne / sortie', report.time],
    ['Score', report.score + ' / 100'],
    ['Touchdown V/S', landing ? '−' + landing.sink.toFixed(1) + ' m/s' : '—'],
    ['Centreline', landing ? landing.across.toFixed(1) + ' m' : '—'],
    ['Fuel used', report.fuel.toFixed(1) + ' L'],
    ['Damage', Math.round(report.damage * 100) + '%']
  ];
  element('report').replaceChildren(...rows.map(([label, value]) => {
    const cell = document.createElement('div');
    cell.className = 'report-cell';
    const key = document.createElement('small');
    const data = document.createElement('b');
    key.textContent = label;
    data.textContent = value;
    cell.append(key, data);
    return cell;
  }));
}
