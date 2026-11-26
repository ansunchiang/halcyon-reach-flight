import { clamp } from '../core/math.js';

export function elapsedLabel(seconds) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(Math.floor(seconds) % 60).padStart(2, '0');
}

export function scoreSortie(definition, sortie, plane, crash) {
  const landing = sortie.landing;
  let quality = .75;
  if (definition.id === 'ring') quality = .37 + sortie.accuracy / 8 * .63 - Math.max(0, plane.elapsed - 116) / 1400;
  if (definition.id === 'fire') quality = .48 + sortie.dropQuality * .52;
  if (landing && !['ring', 'fire'].includes(definition.id)) {
    quality = .99 - landing.sink * .065 - landing.across * .009 - landing.course * .005;
  }
  const score = crash ? 0 : Math.round(clamp(quality - plane.damage * .5 - Math.max(0, plane.fuelUsed - 8) * .014, 0, 1) * 100);
  const medal = crash ? 'NO MEDAL' : score >= 83 ? 'GOLD' : score >= 68 ? 'SILVER' : 'BRONZE';
  return { score, medal, crash, landing, time: elapsedLabel(plane.elapsed), fuel: plane.fuelUsed, damage: plane.damage };
}
