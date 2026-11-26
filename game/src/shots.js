import { RAD } from './core/math.js';

export const SHOT_PRESETS = {
  cover: {
    mission: 'ring', camera: 'chase', time: 38, gate: 3,
    plane: {
      x: 88, y: 117, z: 644, yaw: 3.7 * RAD, roll: .25, pitch: .04, grounded: false,
      speed: 52.1, vy: .13, throttle: .66, power: .66, gear: false, flaps: 0,
      fuel: 38.4, fuelUsed: 9.6, elapsed: 58.4
    },
    controls: { roll: .20 }
  },
  approach: {
    mission: 'dusk', camera: 'cockpit', time: 83,
    plane: {
      x: 114, y: 54.5, z: 748, yaw: -2.0 * RAD, roll: -.018, pitch: .013, grounded: false,
      speed: 36.5, vy: -2.1, throttle: .41, power: .41, gear: true, flaps: 2,
      fuel: 28.3, fuelUsed: 6.1, elapsed: 23.7
    }
  },
  fire: {
    mission: 'fire', camera: 'chase', time: 17.5, frames: 55,
    plane: {
      x: 620, y: 46.0, z: -1385, yaw: 14.4 * RAD, roll: -.18, pitch: .012, grounded: false,
      speed: 39.7, vy: -.25, throttle: .60, power: .51, gear: false, flaps: 1,
      fuel: 10.4, fuelUsed: 14.6, damage: .29, load: .44, elapsed: 92.7
    },
    controls: { roll: -.105 }
  },
  briefing: { mission: 'ring', camera: 'chase', time: 47, screen: 'briefing' }
};
