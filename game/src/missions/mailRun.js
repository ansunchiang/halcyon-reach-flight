import { FIELDS, fieldPoint } from '../world/chart.js';

export const MAIL_DESTINATION = FIELDS[1];

export function landingObjective(field, ahead = 178) {
  const point = fieldPoint(field, 0, -field.length / 2 + ahead);
  return { ...point, y: field.y, field, label: field.name + ' touchdown zone' };
}

export function checkDelivery(sortie, landing, field) {
  if (landing.field !== field) return { cue: 'Landed at ' + landing.field.name + ' · continue to ' + field.name };
  sortie.landing = landing;
  if (!landing.zone || landing.course > 25 || (sortie.definition.night && landing.along > 0)) {
    return { cue: 'Outside touchdown zone · circuit again' };
  }
  return { finish: true, cue: 'Touchdown recorded at ' + field.name };
}
