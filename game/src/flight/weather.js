export function windAt(plane, regime) {
  const t = plane.elapsed;
  const gust = Math.sin(t * .79 + plane.z * .012) * .37 + Math.sin(t * 1.73 + plane.x * .014) * .19;
  const ridgeAir = plane.x < -420 && plane.z < -680;
  return {
    x: (regime === 'dusk' ? 6.9 : 1.65) + gust * (regime === 'dusk' ? 2.1 : 1.2),
    z: regime === 'dusk' ? -1.8 : 2.3,
    lift: gust * (ridgeAir ? 2.0 : .62),
    roll: gust * (ridgeAir ? .12 : .052)
  };
}
