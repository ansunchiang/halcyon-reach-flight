import { MISSIONS } from '../missions/missionDirector.js';

export const element = id => document.getElementById(id);

export function createDispatch(charts, launch) {
  let selected = MISSIONS[0];
  let records = {};
  try {
    records = JSON.parse(localStorage.getItem('halcyon-reach.flight-records') || '{}') ?? {};
  } catch {
    records = {};
  }
  const buttons = new Map();
  for (const mission of MISSIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sortie';
    button.dataset.mission = mission.id;
    const title = document.createElement('b');
    title.textContent = mission.name;
    const tag = document.createElement('small');
    tag.textContent = mission.tag;
    const medal = document.createElement('span');
    medal.className = 'medal';
    button.append(title, tag, medal);
    button.addEventListener('click', () => select(mission));
    buttons.set(mission.id, { button, medal });
    element('mission-list').append(button);
  }

  function select(mission) {
    selected = mission;
    for (const [id, { button, medal }] of buttons) {
      button.setAttribute('aria-pressed', String(id === mission.id));
      medal.textContent = records[id]?.medal ? '✦ ' + records[id].medal + ' · ' + records[id].score : '◇ MEDAL OPEN';
    }
    element('brief-tag').textContent = mission.tag.toUpperCase();
    element('brief-name').textContent = mission.name;
    element('brief-base').textContent = (mission.night ? 'FINAL · ' : 'DEP · ') + mission.base.toUpperCase();
    element('brief-time').textContent = mission.time;
    element('brief-summary').textContent = mission.summary;
    element('brief-notes').replaceChildren(...mission.notes.map(note => {
      const line = document.createElement('li');
      line.textContent = note;
      return line;
    }));
    charts.drawDispatch(mission.id);
  }

  element('launch').addEventListener('click', () => launch(selected));
  return {
    select,
    open() { select(selected); },
    selected() { return selected; },
    save(id, report) {
      if (report.crash || (records[id]?.score ?? -1) >= report.score) return;
      records[id] = { medal: report.medal, score: report.score };
      try {
        localStorage.setItem('halcyon-reach.flight-records', JSON.stringify(records));
      } catch {
        // The running page still remembers medals when storage is unavailable.
      }
    }
  };
}
