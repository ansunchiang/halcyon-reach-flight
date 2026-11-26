const HELD = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight']);
const COMMANDS = new Set(['KeyF', 'KeyV', 'KeyG', 'KeyB', 'KeyC', 'KeyR', 'Space', 'Escape', 'Enter', 'KeyM']);

export function bindPilotInput(canvas) {
  const down = new Set();
  let actions = [];
  let wheel = 0;
  let lookX = 0;
  let lookY = 0;
  let pointer = null;
  let active = false;

  addEventListener('keydown', event => {
    if (HELD.has(event.code)) {
      if (active) event.preventDefault();
      down.add(event.code);
    }
    if (COMMANDS.has(event.code) && !event.repeat) {
      if (active || event.code === 'Escape') event.preventDefault();
      if (!active && event.target instanceof HTMLButtonElement && (event.code === 'Enter' || event.code === 'Space')) return;
      actions.push(event.code);
    }
  });
  addEventListener('keyup', event => down.delete(event.code));
  addEventListener('blur', () => {
    down.clear();
    pointer = null;
  });
  canvas.addEventListener('wheel', event => {
    if (!active) return;
    event.preventDefault();
    wheel += Math.sign(-event.deltaY) * .045;
  }, { passive: false });
  canvas.addEventListener('pointerdown', event => {
    if (!active || event.button !== 0) return;
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
  });
  canvas.addEventListener('pointermove', event => {
    if (pointer !== event.pointerId) return;
    lookX += event.movementX;
    lookY += event.movementY;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, () => { pointer = null; });
  }

  const key = code => Number(down.has(code));
  return {
    setActive(value) { active = value; },
    controls() {
      return {
        pitch: key('KeyW') - key('KeyS'), roll: key('KeyD') - key('KeyA'),
        rudder: key('KeyE') - key('KeyQ'),
        throttle: Math.max(key('ShiftLeft'), key('ShiftRight')) - Math.max(key('ControlLeft'), key('ControlRight'))
      };
    },
    readActions() {
      const result = { actions, wheel, lookX, lookY };
      actions = [];
      wheel = lookX = lookY = 0;
      return result;
    }
  };
}
