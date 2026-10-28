/* TT Tube Zapper: sound effects, all synth through Kit.sound (so the page's one mute switch covers them).
   TZ.sfx.log counts every effect played, so tests can check sound in code while muted. */
(function () {
  'use strict';
  const S = Kit.sound;
  const log = {};
  const note = (name, fn) => (...a) => { log[name] = (log[name] || 0) + 1; fn(...a); };
  const chime = (fs, gap, vol, type) => fs.forEach((f, i) => S.tone({ type: type || 'triangle', f, dur: 0.16, vol, at: i * gap }));
  TZ.sfx = {
    log,
    move: note('move', () => S.tone({ type: 'square', f: 1400, dur: 0.025, vol: 0.025, lp: 3000 })),
    edge: note('edge', () => S.tone({ type: 'sine', f: 220, to: 180, dur: 0.06, vol: 0.05 })),
    zap: note('zap', () => { S.tone({ type: 'square', f: 1800, to: 420, dur: 0.12, vol: 0.05, lp: 2600 }); S.tone({ type: 'sine', f: 2400, to: 900, dur: 0.08, vol: 0.03 }); }),
    pop: note('pop', (big) => { S.tone({ type: 'sine', f: big ? 520 : 700, to: big ? 1400 : 1700, dur: 0.1, vol: 0.1 }); chime([1568, 2093], 0.05, 0.04, 'sine'); }),
    split: note('split', () => { S.tone({ type: 'sine', f: 300, to: 700, dur: 0.12, vol: 0.1 }); S.tone({ type: 'sine', f: 700, to: 340, dur: 0.14, vol: 0.08, at: 0.12 }); }),
    hop: note('hop', () => S.tone({ type: 'sine', f: 500, to: 900, dur: 0.08, vol: 0.03 })),
    spawn: note('spawn', () => S.tone({ type: 'sine', f: 160, to: 320, dur: 0.12, vol: 0.05 })),
    rim: note('rim', () => [880, 740, 880].forEach((f, i) => S.tone({ type: 'square', f, dur: 0.06, vol: 0.04, at: i * 0.08, lp: 2000 }))),
    tickle: note('tickle', () => { for (let i = 0; i < 8; i++) S.tone({ type: 'triangle', f: 700 + (i % 2) * 260 + i * 30, dur: 0.06, vol: 0.09, at: i * 0.07 }); }),
    slide: note('slide', () => S.tone({ type: 'sine', f: 900, to: 200, dur: 0.5, vol: 0.06 })),
    fizz: note('fizz', () => S.hiss({ f: 3000, to: 1200, dur: 0.06, vol: 0.015 })),
    superZap: note('superZap', () => { S.hiss({ f: 400, to: 4000, dur: 0.5, vol: 0.12 }); S.tone({ type: 'sawtooth', f: 110, to: 880, dur: 0.5, vol: 0.08, lp: 1800 }); chime([1047, 1319, 1568, 2093], 0.08, 0.07); }),
    noSuper: note('noSuper', () => S.tone({ type: 'triangle', f: 330, to: 260, dur: 0.18, vol: 0.07 })),
    clear: note('clear', () => chime([523, 659, 784, 1047], 0.12, 0.13)),
    morph: note('morph', () => { S.tone({ type: 'sine', f: 200, to: 800, dur: 1.2, vol: 0.06 }); S.hiss({ f: 800, to: 2400, dur: 1.2, vol: 0.03 }); }),
    go: note('go', () => { S.tone({ type: 'square', f: 660, dur: 0.1, vol: 0.06 }); S.tone({ type: 'square', f: 990, dur: 0.18, vol: 0.06, at: 0.12 }); }),
    turn: note('turn', () => chime([784, 988, 1175], 0.1, 0.08)),
    life: note('life', () => chime([784, 988, 1175, 1568], 0.09, 0.06, 'square')),
    buddy: note('buddy', () => { S.tone({ f: 400, to: 900, dur: 0.15, vol: 0.12 }); S.hiss({ f: 2000, to: 500, dur: 0.25, vol: 0.08 }); }),
    treat: note('treat', () => S.coin(4)),
    hi5: note('hi5', () => { S.hiss({ filter: 'bandpass', f: 1800, dur: 0.08, vol: 0.25, q: 1 }); S.tone({ f: 880, to: 1320, dur: 0.15, vol: 0.08, at: 0.05 }); }),
    win: note('win', () => chime([523, 659, 784, 1047, 784, 1047, 1319], 0.13, 0.12)),
    gameOver: note('gameOver', () => chime([523, 440, 392, 523], 0.2, 0.11)),
    click: note('click', () => S.click()),
  };
})();
