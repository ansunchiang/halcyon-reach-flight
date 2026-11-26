export const FIELDS = [
  { id: 'gull', name: 'Gullhaven', x: 115, z: -240, y: 24, length: 1000, width: 55, course: 0, strip: 'ASPHALT', code: 'GHV' },
  { id: 'tarn', name: 'Tarn Lake', x: 1270, z: -1830, y: 47, length: 650, width: 34, course: 0, strip: 'GRASS', code: 'TRL' },
  { id: 'cinder', name: 'Cinder Point', x: -1740, z: 680, y: 94, length: 570, width: 33, course: Math.PI / 2, strip: 'GRAVEL', code: 'CDR' }
];

export const LAKE = { x: 875, z: -1220, width: 405, length: 695, y: 39 };
export const FIRE = { x: 865, z: -2015, y: 55 };
export const FLARE = { x: -770, z: -1320 };
export const HARBOR = { x: 440, z: 365, name: 'Gullhaven Harbour' };
export const MAP = { west: -2890, east: 2450, north: -3380, south: 1370 };

export function fieldOffset(field, x, z) {
  const sin = Math.sin(field.course);
  const cos = Math.cos(field.course);
  return {
    across: (x - field.x) * cos + (z - field.z) * sin,
    along: (x - field.x) * sin - (z - field.z) * cos
  };
}

export function fieldPoint(field, across, along) {
  const sin = Math.sin(field.course);
  const cos = Math.cos(field.course);
  return { x: field.x + across * cos + along * sin, z: field.z + across * sin - along * cos };
}

export function fieldUnder(x, z) {
  return FIELDS.find(field => {
    const offset = fieldOffset(field, x, z);
    return Math.abs(offset.across) <= field.width / 2 + 5 && Math.abs(offset.along) <= field.length / 2 + 18;
  });
}
