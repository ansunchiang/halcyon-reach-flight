import { seededRandom, clamp } from '../core/math.js';

export function buildFlightAudio() {
  let context;
  let bus;
  let drive;
  let engine;
  let harmonic;
  let rush;
  let airFilter;
  let warning;
  let muted = false;
  let noiseBuffer;

  function tone(type, level, hz) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = hz;
    gain.gain.value = level;
    oscillator.connect(gain).connect(bus);
    oscillator.start();
    return { oscillator, gain };
  }

  function initialize() {
    if (!context) {
      context = new AudioContext();
      bus = context.createGain();
      bus.gain.value = .36;
      bus.connect(context.destination);
      drive = tone('triangle', 0, 43);
      engine = tone('sine', 0, 60);
      harmonic = tone('triangle', 0, 113);
      warning = tone('square', 0, 579);
      noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const random = seededRandom(5821);
      const wave = noiseBuffer.getChannelData(0);
      let slow = 0;
      for (let i = 0; i < wave.length; i++) {
        slow = slow * .73 + (random() * 2 - 1) * .27;
        wave[i] = slow;
      }
      const breath = context.createBufferSource();
      airFilter = context.createBiquadFilter();
      airFilter.type = 'lowpass';
      airFilter.frequency.value = 426;
      rush = context.createGain();
      rush.gain.value = 0;
      breath.buffer = noiseBuffer;
      breath.loop = true;
      breath.connect(airFilter).connect(rush).connect(bus);
      breath.start();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function transient(kind) {
    if (!context || muted) return;
    const now = context.currentTime;
    const isUi = kind === 'ui' || kind === 'gate';
    const heavy = kind === 'crash';
    if (isUi) {
      const note = tone('sine', .17, kind === 'gate' ? 481 : 327);
      note.oscillator.frequency.exponentialRampToValueAtTime(kind === 'gate' ? 815 : 490, now + .07);
      note.gain.gain.exponentialRampToValueAtTime(.001, now + .17);
      note.oscillator.stop(now + .18);
      return;
    }
    const sound = context.createBufferSource();
    sound.buffer = noiseBuffer;
    const low = context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.setValueAtTime(heavy ? 830 : 420, now);
    low.frequency.exponentialRampToValueAtTime(82, now + (heavy ? 1.1 : .24));
    const volume = context.createGain();
    volume.gain.setValueAtTime(heavy ? 1.6 : .65, now);
    volume.gain.exponentialRampToValueAtTime(.001, now + (heavy ? 1.45 : .33));
    sound.connect(low).connect(volume).connect(bus);
    sound.start();
    sound.stop(now + (heavy ? 1.5 : .37));
  }

  return {
    initialize, transient,
    toggle() {
      muted = !muted;
      if (bus) bus.gain.setTargetAtTime(muted ? 0 : .36, context.currentTime, .055);
      return muted;
    },
    update(plane, active, cockpit) {
      if (!context) return;
      const rpm = 34 + plane.power * 46;
      const now = context.currentTime;
      const live = active && !plane.crashed ? 1 : 0;
      drive.oscillator.frequency.setTargetAtTime(rpm * .97, now, .10);
      engine.oscillator.frequency.setTargetAtTime(rpm, now, .10);
      harmonic.oscillator.frequency.setTargetAtTime(rpm * 2.02, now, .11);
      drive.gain.gain.setTargetAtTime(live * (.076 + plane.power * .14), now, .09);
      engine.gain.gain.setTargetAtTime(live * (.10 + plane.power * .15), now, .09);
      harmonic.gain.gain.setTargetAtTime(live * plane.power * (cockpit ? .052 : .094), now, .09);
      airFilter.frequency.setTargetAtTime(336 + plane.speed * 17, now, .12);
      rush.gain.setTargetAtTime(live * clamp(plane.speed / 100, 0, .55) * (cockpit ? .63 : .89), now, .12);
      warning.gain.gain.setTargetAtTime(live && plane.stallWarning && plane.elapsed % .57 < .32 ? .10 : 0, now, .035);
    }
  };
}
