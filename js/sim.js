/* TT Tube Zapper: the rules, with no drawing (so node can run them for the headless check). Fixed 1/60 s steps.
   The zapper sits on the rim of a 16-lane tube; jelly critters climb up the lanes from the far end. Space zaps down
   the zapper's lane: the zap hits the first critter in that lane and only that lane. A critter that reaches the rim
   walks along it toward the zapper and, if it sits in his lane for a moment, tickles him: a life gone.
   Kinds: jelly (plain), hopper (hops to the next lane now and then), splitter (zap it and it splits in two, one in
   each lane beside it), small (half a splitter, a bit quicker). A level ends when every critter is gone: none on the
   tube and none still to come. A super zap pops everything on the tube, 2 a level on EASY and 1 on NORMAL.
   The brother (1 player, T, any number of times): pops in, does his move, tosses a treat, then super-zaps the whole tube
   for free. 2 players take turns: the turn passes when a life is lost or a level is cleared; each keeps his own level.
   w.sab is a check's sabotage (js/check.js), never set in a real game. */
(function (root) {
  'use strict';
  const TZ = (root.TZ = root.TZ || {});
  const SH = () => TZ.shapes;
  const DT = 1 / 60;
  const LEVELS = 8;
  const SHOT_SPEED = 2.6; // d per second: a zap goes rim to far end in under half a second
  const MAX_SHOTS = 6;
  const HOP_T = 0.32; // seconds a hop between lanes takes (the critter changes lane halfway)
  const HIT_R = 0.035; // how near in depth a zap must pass to hit
  const B_TREAT = 0.6, B_ZAP = 1.25, B_END = 2.7, HI5_T = 1.0;
  const TREATS = ['🍦', '💧', '🧃', '🍪', '🍉', '🍌'];
  const SCORE = { jelly: 100, hopper: 150, splitter: 200, small: 50, rim: 50, treat: 100, hi5: 50, clear: 500 };
  const LIFE_EVERY = 10000;
  const CFG = {
    easy: { lives: 5, supers: 2, climb: 0.05, hopEvery: 1.9, rimStep: 1.0, grace: 0.8, spawnEvery: 2.4, maxOn: 4, count: (lv) => 6 + lv * 2, fire: 0.17, first: 0.24, repeat: 0.16, ready: 1.4 },
    normal: { lives: 3, supers: 1, climb: 0.085, hopEvery: 1.15, rimStep: 0.6, grace: 0.45, spawnEvery: 1.5, maxOn: 7, count: (lv) => 9 + lv * 3, fire: 0.14, first: 0.22, repeat: 0.12, ready: 1.1 },
  };
  const READY_T = 1.2, CLEAR_T = 1.6, MORPH_T = 1.4, OVER_T = 0.1, INV_T = 2.2;
  const SPEED = { jelly: 1, hopper: 0.9, splitter: 0.8, small: 1.35 };

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // o: { level: 'easy' | 'normal', players: ['teddy'] or ['teddy', 'tommy'], seed, sabotage, buddyFor, go }
  function create(o) {
    o = o || {};
    const level = o.level === 'normal' ? 'normal' : 'easy';
    const cfg = CFG[level];
    const who = o.players && o.players.length ? o.players : ['teddy'];
    const w = {
      level, cfg, sab: o.sabotage || null, rnd: rng(o.seed || 7), two: who.length === 2,
      shapes: SH().make(o.sabotage),
      buddyFor: o.buddyFor || ((id) => (id === 'tommy' ? 'teddy' : 'tommy')),
      players: who.map((id, i) => ({ i, who: id, score: 0, lives: level === 'easy' && o.sabotage === 'easyLives' ? 3 : cfg.lives, lv: 0, supers: cfg.supers, out: false, done: false, nextLife: LIFE_EVERY, zaps: 0 })),
      cur: 0, lv: 0, shape: null, from: null, morphT: 0,
      phase: 'ready', phaseT: 0, t: 0, won: false,
      zap: { lane: 0, dir: 0, moveT: 0, fireT: 0, inv: 0, giggle: 0, lastLane: 0 },
      critters: [], shots: [], queue: [], spawnT: 0, lastSpawn: -1,
      buddy: null, calls: 0, events: [], nextId: 1,
    };
    loadLevel(w);
    w.events = [];
    if (o.go) { w.phase = 'play'; w.phaseT = 0; }
    return w;
  }
  const P = (w) => w.players[w.cur];
  const shapeOf = (w, lv) => w.shapes[lv % w.shapes.length];

  // the critters a level sends, in order: plain jellies first, then hoppers, then splitters
  function buildQueue(w, lv) {
    const n = w.cfg.count(lv);
    const q = [];
    const hard = w.level === 'normal' ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const r = w.rnd();
      let k = 'jelly';
      if (lv + hard >= 1 && r < 0.3 + lv * 0.03) k = 'hopper';
      if (lv + hard >= 2 && r > 0.78 - lv * 0.03) k = 'splitter';
      q.push(i < 2 ? 'jelly' : k);
    }
    return q;
  }
  function loadLevel(w) {
    const p = P(w);
    w.lv = p.lv;
    w.shape = shapeOf(w, w.lv);
    w.from = null;
    w.queue = buildQueue(w, w.lv);
    w.critters = [];
    w.shots = [];
    w.spawnT = 0.5;
    w.lastSpawn = -1;
    p.supers = w.cfg.supers;
    w.zap.lane = SH().startLane(w.shape);
    w.zap.dir = 0;
    w.zap.moveT = 0;
    w.zap.inv = 0;
    w.phase = 'ready';
    w.phaseT = 0;
    w.events.push({ type: 'level', lv: w.lv, shape: w.shape.id, who: p.who });
  }
  const speedMul = (w) => (1 + Math.min(w.lv, 7) * 0.06) * (w.freeze ? 0 : 1); // w.freeze: the checks' critters stand still

  function addCritter(w, kind, lane, d, extra) {
    const c = Object.assign({ id: w.nextId++, kind, lane, d: d || 0, st: d >= 1 ? 'rim' : 'climb', hop: null, hopT: w.cfg.hopEvery * (0.6 + w.rnd() * 0.6), hdir: w.rnd() < 0.5 ? -1 : 1, rimT: w.cfg.rimStep, graceT: 0, born: w.t }, extra || {});
    if (c.st === 'rim') c.d = 1;
    w.critters.push(c);
    return c;
  }

  // ---------- one step ----------
  // inp: { lr: -1 | 0 | 1 (held), fire: held, firePress, superPress, target: a lane or null (a finger on the tube) }
  function step(w, inp) {
    inp = inp || {};
    w.events = [];
    w.t += DT;
    w.phaseT += DT;
    const z = w.zap;
    z.inv = Math.max(0, z.inv - DT);
    z.giggle = Math.max(0, z.giggle - DT);
    buddyStep(w);
    switch (w.phase) {
      case 'ready':
        control(w, inp, false);
        shotsStep(w);
        if (w.phaseT >= w.cfg.ready) { w.phase = 'play'; w.phaseT = 0; w.events.push({ type: 'go' }); }
        break;
      case 'play':
        control(w, inp, true);
        spawnStep(w);
        crittersStep(w);
        shotsStep(w);
        endCheck(w);
        break;
      case 'clear':
        shotsStep(w);
        if (w.phaseT >= CLEAR_T) afterClear(w);
        break;
      case 'morph':
      case 'turn':
        w.morphT += DT;
        if (w.morphT >= MORPH_T) { w.from = null; w.phase = 'ready'; w.phaseT = 0; w.events.push({ type: 'ready', lv: w.lv, who: P(w).who }); }
        break;
      default:
        break;
    }
  }

  // the zapper: ← counter-clockwise, → clockwise, one lane a press, repeating while held; a finger on the tube walks it there
  function control(w, inp, live) {
    const z = w.zap;
    let dir = inp.lr ? Math.sign(inp.lr) : 0;
    if (w.sab === 'mirror') dir = -dir;
    if (!dir && inp.target != null && inp.target !== z.lane) dir = SH().toward(w.shape, z.lane, inp.target);
    if (dir) {
      if (dir !== z.dir) { move(w, dir); z.moveT = w.cfg.first; }
      else {
        z.moveT -= DT;
        if (z.moveT <= 0) { move(w, dir); z.moveT = inp.target != null && !inp.lr ? w.cfg.repeat * 0.8 : w.cfg.repeat; }
      }
    }
    z.dir = dir;
    // zapping: a press zaps at once, holding keeps zapping
    z.fireT = Math.max(0, z.fireT - DT);
    if (inp.firePress || (inp.fire && z.fireT <= 0)) fire(w);
    if (inp.superPress && live) superZap(w);
  }
  function move(w, dir) {
    const z = w.zap;
    if (inp_stuck(w)) return;
    const to = SH().step(w.shape, z.lane, dir);
    if (to === z.lane) { w.events.push({ type: 'edge', dir }); return; }
    z.lastLane = z.lane;
    z.lane = to;
    w.events.push({ type: 'move', dir, lane: to });
  }
  const inp_stuck = (w) => w.sab === 'stuckAfterTickle' && P(w).lives < w.cfg.lives;
  function fire(w) {
    const z = w.zap;
    if (w.shots.length >= MAX_SHOTS) return false;
    z.fireT = w.cfg.fire;
    const s = { id: w.nextId++, lane: z.lane, d: 1 };
    w.shots.push(s);
    P(w).zaps++;
    w.events.push({ type: 'zap', lane: z.lane });
    hitTest(w, s, 1 + HIT_R);
    return true;
  }
  function shotsStep(w) {
    for (const s of w.shots.slice()) {
      if (s.dead) continue;
      const d0 = s.d;
      s.d -= SHOT_SPEED * DT;
      hitTest(w, s, d0);
      if (!s.dead && s.d < 0) { s.dead = true; w.events.push({ type: 'fizz', lane: s.lane }); }
    }
    w.shots = w.shots.filter((s) => !s.dead);
  }
  // a zap hits the first critter in its own lane between where it was and where it is now
  function hitTest(w, s, d0) {
    if (s.dead) return;
    let best = null;
    for (const c of w.critters) {
      const same = w.sab === 'zapWide' ? SH().apart(w.shape, c.lane, s.lane) <= 1 : c.lane === s.lane;
      if (!same) continue;
      if (c.d < s.d - HIT_R || c.d > d0 + HIT_R) continue;
      if (!best || c.d > best.d) best = c;
    }
    if (!best) return;
    if (w.sab === 'zapThrough') {
      for (const c of w.critters.slice()) if (c.lane === s.lane && c.d >= s.d - HIT_R && c.d <= d0 + HIT_R) pop(w, c, 'zap');
      return;
    }
    s.dead = true;
    pop(w, best, 'zap');
  }
  // a critter turns into sparkles; a splitter zapped (not super-zapped) becomes two small ones, one in each lane beside it
  function pop(w, c, how) {
    const i = w.critters.indexOf(c);
    if (i < 0) return;
    w.critters.splice(i, 1);
    const p = P(w);
    const pts = SCORE[c.kind] + (c.st === 'rim' ? SCORE.rim : 0);
    addScore(w, p, pts);
    w.events.push({ type: 'pop', kind: c.kind, lane: c.lane, d: c.d, how, pts, id: c.id });
    if (c.kind === 'splitter' && how === 'zap' && w.sab !== 'noSplit') {
      // the lanes on each side (at an open tube's end, its own lane and the one beside it)
      const a = SH().step(w.shape, c.lane, -1);
      const b = w.sab === 'splitSame' ? a : SH().step(w.shape, c.lane, 1);
      const d = Math.min(c.d, 0.94);
      addCritter(w, 'small', a, d, { hdir: -1 });
      addCritter(w, 'small', b, d, { hdir: 1 });
      w.events.push({ type: 'split', lane: c.lane, a, b, d });
    }
  }
  function addScore(w, p, n) {
    p.score += n;
    while (p.score >= p.nextLife) { p.nextLife += LIFE_EVERY; p.lives++; w.events.push({ type: 'extraLife', i: p.i }); }
  }
  function superZap(w) {
    const p = P(w);
    if (p.supers <= 0) { w.events.push({ type: 'noSuper' }); return false; }
    p.supers--;
    zapAll(w, 'super');
    w.events.push({ type: 'super', left: p.supers });
    return true;
  }
  function zapAll(w, how) {
    if (w.sab === 'superNone' && how === 'super') return 0;
    if (w.sab === 'buddyNoZap' && how === 'buddy') return 0;
    const all = w.critters.slice();
    for (const c of all) pop(w, c, how);
    w.shots = [];
    return all.length;
  }

  function spawnStep(w) {
    if (!w.queue.length || w.noSpawn) return; // w.noSpawn: a check's world, where nothing new comes
    const on = w.critters.length;
    w.spawnT -= DT;
    if (on === 0) w.spawnT = Math.min(w.spawnT, 0.35);
    if (w.spawnT > 0 || on >= w.cfg.maxOn) return;
    const kind = w.queue.shift();
    let lane = Math.floor(w.rnd() * SH().N);
    if (lane === w.lastSpawn) lane = (lane + 5) % SH().N;
    w.lastSpawn = lane;
    const c = addCritter(w, kind, lane, 0);
    w.spawnT = w.cfg.spawnEvery * (0.8 + w.rnd() * 0.4);
    w.events.push({ type: 'spawn', kind, lane, id: c.id });
  }

  function crittersStep(w) {
    const z = w.zap, cfg = w.cfg, sh = w.shape;
    const safe = z.inv > 0 || (w.buddy && w.buddy.kind === 'zap');
    for (const c of w.critters.slice()) {
      if (c.st === 'climb') {
        if (c.hop) {
          c.hop.t += DT;
          if (c.hop.t >= HOP_T / 2 && c.lane !== c.hop.to) c.lane = c.hop.to;
          if (c.hop.t >= HOP_T) c.hop = null;
          continue;
        }
        c.d += cfg.climb * SPEED[c.kind] * speedMul(w) * DT;
        if (c.kind === 'hopper' && w.sab !== 'noHop') {
          c.hopT -= DT;
          if (c.hopT <= 0 && c.d < 0.93) {
            let dir = c.hdir;
            if (w.rnd() < 0.25) dir = -dir;
            let to = SH().step(sh, c.lane, dir);
            if (to === c.lane) { dir = -dir; to = SH().step(sh, c.lane, dir); }
            if (w.sab === 'hopFar') to = SH().step(sh, to, dir);
            c.hdir = dir;
            c.hop = { from: c.lane, to, t: 0 };
            c.hopT = cfg.hopEvery * (0.7 + w.rnd() * 0.6);
            w.events.push({ type: 'hop', id: c.id, from: c.lane, to });
          }
        }
        if (c.d >= 1) { c.d = 1; c.st = 'rim'; c.rimT = cfg.rimStep; c.graceT = 0; w.events.push({ type: 'rim', id: c.id, lane: c.lane }); }
        continue;
      }
      // on the rim: it walks toward the zapper one lane at a time; sitting in his lane a moment tickles him
      if (c.lane === z.lane) {
        c.graceT += DT;
        if (c.graceT >= cfg.grace && !safe) { tickle(w, c); return; }
        continue;
      }
      c.graceT = 0;
      c.rimT -= DT;
      if (c.rimT <= 0) {
        const from = c.lane;
        c.lane = SH().step(sh, c.lane, SH().toward(sh, c.lane, z.lane));
        c.rimT = cfg.rimStep;
        w.events.push({ type: 'rimHop', id: c.id, from, to: c.lane });
      }
    }
  }

  // tickled! a life goes, the tickler giggles away and the others on the rim slide back down
  function tickle(w, c) {
    const p = P(w);
    w.critters.splice(w.critters.indexOf(c), 1);
    p.lives--;
    w.zap.giggle = 1.2;
    w.zap.inv = INV_T;
    w.shots = [];
    for (const o of w.critters) if (o.st === 'rim' || o.d > 0.8) { o.st = 'climb'; o.d = 0.3; o.hop = null; w.events.push({ type: 'slide', id: o.id }); }
    w.events.push({ type: 'tickle', i: p.i, who: p.who, lane: c.lane, kind: c.kind, lives: p.lives });
    if (p.lives <= 0) { p.out = true; w.events.push({ type: 'out', i: p.i, who: p.who }); }
    const next = nextPlayer(w);
    if (w.two && w.sab !== 'noTurns' && next !== w.cur && next >= 0) return passTurn(w, next);
    if (p.out) return gameOver(w);
  }
  function nextPlayer(w) {
    for (let k = 1; k <= w.players.length; k++) {
      const j = (w.cur + k) % w.players.length;
      if (!w.players[j].out && !w.players[j].done) return j;
    }
    return -1;
  }
  function passTurn(w, next) {
    const from = w.shape;
    w.cur = next;
    loadLevel(w);
    w.events.pop(); // loadLevel's 'level' event: the turn event says it
    w.from = from;
    w.morphT = 0;
    w.phase = 'turn';
    w.phaseT = 0;
    w.events.push({ type: 'turn', i: next, who: P(w).who, lv: w.lv });
  }
  function gameOver(w) {
    w.won = w.players.some((p) => p.done);
    w.phase = 'over';
    w.phaseT = 0;
    w.critters = [];
    w.shots = [];
    w.events.push({ type: 'over', won: w.won });
  }

  function endCheck(w) {
    if (w.sab === 'endNever') return;
    const left = w.sab === 'endEarly' ? 0 : w.queue.length;
    if (w.critters.length || left) return;
    const p = P(w);
    const bonus = SCORE.clear * (w.lv + 1);
    addScore(w, p, bonus);
    w.phase = 'clear';
    w.phaseT = 0;
    w.shots = [];
    w.events.push({ type: 'clear', lv: w.lv, bonus, who: p.who });
  }
  function afterClear(w) {
    const p = P(w);
    p.lv++;
    if (p.lv >= LEVELS) {
      p.done = true;
      w.events.push({ type: 'allClear', i: p.i, who: p.who });
      const next = nextPlayer(w);
      if (next < 0) { w.won = true; return gameOver(w); }
      return passTurn(w, next);
    }
    const next = w.two && w.sab !== 'noTurns' ? nextPlayer(w) : w.cur;
    if (next !== w.cur && next >= 0) return passTurn(w, next);
    const from = w.shape;
    loadLevel(w);
    w.from = from;
    w.morphT = 0;
    w.phase = 'morph';
    w.phaseT = 0;
  }

  // ---------- the brother ----------
  function call(w) {
    if (w.phase === 'over') return false;
    if (w.two) {
      if (w.buddy) return false;
      w.buddy = { kind: 'hi5', t: 0 };
      addScore(w, P(w), SCORE.hi5);
      w.events.push({ type: 'hi5' });
      return true;
    }
    if (w.buddy) {
      // called again while he's here: one more super zap
      if (w.buddy.t > B_ZAP) { w.buddy.t = B_ZAP - 0.3; w.buddy.n++; w.events.push({ type: 'buddyMore' }); }
      else w.buddy.more = true;
      return true;
    }
    const who = w.buddyFor(P(w).who);
    w.buddy = { kind: 'zap', who, t: 0, n: 0, treat: TREATS[w.calls % TREATS.length], more: false };
    w.calls++;
    w.events.push({ type: 'buddyIn', who });
    return true;
  }
  function buddyStep(w) {
    const b = w.buddy;
    if (!b) return;
    const t0 = b.t;
    b.t += DT;
    if (b.kind === 'hi5') { if (b.t >= HI5_T) w.buddy = null; return; }
    if (t0 < B_TREAT && b.t >= B_TREAT && b.n === 0) { addScore(w, P(w), SCORE.treat); w.events.push({ type: 'treat', e: b.treat }); }
    if (t0 < B_ZAP && b.t >= B_ZAP) {
      const live = w.phase === 'play' || w.phase === 'ready';
      const n = live ? zapAll(w, 'buddy') : 0;
      w.events.push({ type: 'buddyZap', who: b.who, n });
      w.zap.inv = Math.max(w.zap.inv, 0.8);
      if (b.more) { b.more = false; b.t = B_ZAP - 0.3; b.n++; w.events.push({ type: 'buddyMore' }); }
    }
    if (b.t >= B_END) { w.buddy = null; w.events.push({ type: 'buddyOut' }); }
  }

  // ---------- for the checks and the page ----------
  // the zapper's rim spot and the shape as drawn now (mid-morph it is between two tubes)
  function shapeNow(w) {
    if (!w.from) return w.shape;
    const u = Math.min(1, w.morphT / MORPH_T);
    const e = u * u * (3 - 2 * u);
    return SH().mix(w.from, w.shape, e);
  }

  TZ.sim = { DT, LEVELS, CFG, SCORE, TREATS, SHOT_SPEED, MAX_SHOTS, HOP_T, B_TREAT, B_ZAP, B_END, MORPH_T, CLEAR_T, INV_T, create, step, call, addCritter, fire, superZap, pop, shapeNow, loadLevel, P };
})(typeof window !== 'undefined' ? window : globalThis);
