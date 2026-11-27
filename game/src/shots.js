import { RAD } from './core/math.js';

export const SHOT_PRESETS = {
  cover: {
    mission: 'ring', camera: 'chase', time: 38, gate: 3, hudClass: 'shot-clean',
    rig: { range: 22.1, rise: 9.65, swing: -.13, tilt: -.19 },
    plane: {
      x: 88, y: 117, z: 644, yaw: 3.7 * RAD, roll: .25, pitch: .04, grounded: false,
      speed: 52.1, vy: .13, throttle: .66, power: .66, gear: false, flaps: 1,
      fuel: 38.4, fuelUsed: 9.6, elapsed: 58.4
    },
    controls: { roll: .34 }
  },
  approach: {
    mission: 'dusk', camera: 'cockpit', time: 83, hudClass: 'shot-clean shot-cockpit',
    plane: {
      x: 114, y: 48.6, z: 625, yaw: -2.0 * RAD, roll: -.018, pitch: .013, grounded: false,
      speed: 36.5, vy: -2.1, throttle: .41, power: .41, gear: true, flaps: 2,
      fuel: 28.3, fuelUsed: 6.1, elapsed: 23.7
    }
  },
  fire: {
    mission: 'fire', camera: 'chase', time: 17.5, frames: 68, actionFrame: 8,
    rig: { range: 30, rise: 11, swing: -.37, sight: -.05, tilt: -.255 },
    plane: {
      x: 833, y: 97, z: -1897, yaw: 13 * RAD, roll: -.14, pitch: .024, grounded: false,
      speed: 40.5, vy: -.25, throttle: .60, power: .51, gear: false, flaps: 1,
      fuel: 10.4, fuelUsed: 14.6, damage: .29, load: .92, elapsed: 92.7
    },
    controls: { roll: -.105 }
  },
  briefing: { mission: 'ring', camera: 'chase', time: 47, screen: 'briefing' },
  touchdown: {
    mission: 'rescue', camera: 'chase', time: 47, frames: 64, located: true,
    rig: { range: 22, rise: 6.4, swing: .22, sight: -.055, tilt: -.108 },
    plane: { x: 116.5, y: 25.54, z: 110, speed: 32, vy: -1.23, roll: .035, pitch: .063,
      yaw: .005, grounded: false, throttle: .23, power: .23, flaps: 2, fuel: 39.4, fuelUsed: 8.6, elapsed: 167.5 }
  }
};
