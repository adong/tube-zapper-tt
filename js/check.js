/* TT Tube Zapper: the headless check of the brief's rules, on the real rules in js/sim.js and js/shapes.js (no drawing).
   Runs in node (node tools/check.js) and in the page (game.check()).
   - shapes: every tube (circle, square, star, heart, bridge, flower, rainbow, diamond) has 16 lanes of a sensible width,
     closed ones close and open ones don't, every lane goes clockwise round the tube's middle, no two lanes cross, the
     far end is inside the rim, and the rim fits the camera's box.
   - zapOwnLane: on every tube, a zap down each of the 16 lanes pops the critter in that lane and no other; one zap pops
     one critter (the nearest); a zap down an empty lane hits nothing and fizzles at the far end.
   - split: a zapped splitter becomes two small critters, one in each lane beside it (on an open tube's end lane: its own
     and the next), and zapping both empties the tube; a super zap pops a splitter without splitting it.
   - hop: hoppers hop one lane at a time, never off an open tube's end; a zap hits a hopper in its new lane, not its old.
   - levelEnd: a level ends when every critter is gone, not while one is on the tube (a split-off small one too) or still
     to come, and it ends exactly once.
   - directions: on every tube and from every lane, → moves the zapper clockwise and ← counter-clockwise, held keys
     repeat the same way, an open tube's end stops it without sticking, a finger on the tube walks it the short way, and
     the first → of every level goes to the right.
   - plus super zaps (2 a level on EASY, 1 on NORMAL), lives and tickles (EASY 5, NORMAL 3; never stuck after one), the
     brother (super-zaps the whole tube for free, as often as he's called), 2 players taking turns, and the autopilot
     clearing all 8 tubes on EASY and NORMAL.
   fail() turns on one sabotage at a time (w.sab in js/sim.js, or a broken shape) and each must be caught by its check. */
(function (root) {
  'use strict';
  const TZ = (root.TZ = root.TZ || {});
  const S = () => TZ.sim, SH = () => TZ.shapes;
  const N = 16;

  // a world on level lv, playing, with nothing new coming and (frozen) critters that stand still
  function world(o) {
    o = o || {};
    const w = S().create({ level: o.level || 'easy', players: o.players || ['teddy'], seed: o.seed || 5, sabotage: o.sab });
    if (o.lv) { for (const p of w.players) p.lv = o.lv; S().loadLevel(w); }
    w.phase = 'play';
    w.phaseT = 0;
    w.queue = ['jelly']; // one still to come (it never comes), so the level doesn't end under the check
    w.noSpawn = true;
    w.freeze = o.freeze !== false;
    w.events = [];
    return w;
  }
  function run(w, inp, n, each) {
    const evs = [];
    for (let i = 0; i < n; i++) {
      S().step(w, typeof inp === 'function' ? inp(w, i) : inp);
      evs.push(...w.events);
      if (each && each(w, i) === false) break;
    }
    return evs;
  }
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const mid = (sh, i) => SH().lane(sh.pts, i).mid;
  const NAMES = ['circle', 'square', 'star', 'heart', 'bridge', 'flower', 'rainbow', 'diamond'];

  const checks = {
    shapes(sab) {
      const bad = [];
      const list = SH().make(sab);
      const ids = list.map((s) => s.id).join(',');
      if (ids !== NAMES.join(',')) bad.push(`tubes are ${ids}`);
      for (const sh of list) {
        const p = sh.pts;
        if (p.length !== N + 1) { bad.push(`${sh.id}: ${p.length - 1} lanes`); continue; }
        const ends = Math.hypot(p[N][0] - p[0][0], p[N][1] - p[0][1]);
        if (sh.open ? ends < 5 : ends > 1e-6) bad.push(`${sh.id}: ${sh.open ? 'open but its ends meet' : 'not closed'}`);
        let turn = 0;
        for (let i = 0; i < N; i++) {
          const L = SH().lane(p, i);
          if (L.w < 0.7 || L.w > 3.4) bad.push(`${sh.id} lane ${i}: ${L.w.toFixed(2)} m wide`);
          if (cross(L.a, L.b) >= 0) bad.push(`${sh.id} lane ${i} goes counter-clockwise`);
          turn += Math.atan2(cross(L.a, L.b), L.a[0] * L.b[0] + L.a[1] * L.b[1]);
          for (const q of [L.a, L.b]) if (Math.abs(q[0]) > 6.1 || Math.abs(q[1]) > 6.1) bad.push(`${sh.id} lane ${i} sticks out of the box`);
          const f = SH().at(p, i, 0), r = SH().at(p, i, 1);
          if (Math.hypot(f[0], f[1]) >= Math.hypot(r[0], r[1]) || f[2] >= r[2]) bad.push(`${sh.id} lane ${i}: far end not inside`);
          // no two lanes that don't share a point cross each other
          for (let j = i + 2; j < N; j++) {
            if (!sh.open && i === 0 && j === N - 1) continue;
            const M = SH().lane(p, j);
            const o1 = cross([L.b[0] - L.a[0], L.b[1] - L.a[1]], [M.a[0] - L.a[0], M.a[1] - L.a[1]]), o2 = cross([L.b[0] - L.a[0], L.b[1] - L.a[1]], [M.b[0] - L.a[0], M.b[1] - L.a[1]]);
            const o3 = cross([M.b[0] - M.a[0], M.b[1] - M.a[1]], [L.a[0] - M.a[0], L.a[1] - M.a[1]]), o4 = cross([M.b[0] - M.a[0], M.b[1] - M.a[1]], [L.b[0] - M.a[0], L.b[1] - M.a[1]]);
            if (o1 * o2 < 0 && o3 * o4 < 0) bad.push(`${sh.id}: lanes ${i} and ${j} cross`);
          }
        }
        if (!sh.open && Math.abs(turn + 2 * Math.PI) > 1e-3) bad.push(`${sh.id}: goes round ${(-turn / 2 / Math.PI).toFixed(2)} times`);
        if (sh.open && !(turn < -1)) bad.push(`${sh.id}: open tube doesn't go clockwise`);
      }
      return { ok: !bad.length, info: bad.length ? bad.slice(0, 6).join('; ') : `${list.length} tubes · 16 lanes each · all clockwise · none crossing` };
    },

    zapOwnLane(sab) {
      const bad = [];
      let n = 0;
      for (let lv = 0; lv < 8; lv++) {
        for (let k = 0; k < N; k++) {
          const w = world({ lv, sab });
          for (let i = 0; i < N; i++) S().addCritter(w, 'jelly', i, 0.5);
          w.zap.lane = k;
          S().fire(w);
          run(w, {}, 40);
          n++;
          const gone = [...Array(N).keys()].filter((i) => !w.critters.some((c) => c.lane === i));
          if (gone.length !== 1 || gone[0] !== k) bad.push(`${w.shape.id} lane ${k}: popped lanes [${gone}]`);
        }
        // one zap, two critters in its lane: only the nearer one pops
        const w2 = world({ lv, sab });
        const near = S().addCritter(w2, 'jelly', 3, 0.7), far = S().addCritter(w2, 'jelly', 3, 0.3);
        w2.zap.lane = 3;
        S().fire(w2);
        run(w2, {}, 40);
        if (w2.critters.includes(near) || !w2.critters.includes(far)) bad.push(`${w2.shape.id}: one zap popped ${2 - w2.critters.length} of two`);
        // an empty lane: nothing hit, the zap fizzles at the far end
        const w3 = world({ lv, sab });
        S().addCritter(w3, 'jelly', 9, 0.5);
        w3.zap.lane = 2;
        S().fire(w3);
        const ev = run(w3, {}, 40);
        if (w3.critters.length !== 1 || w3.shots.length || !ev.some((e) => e.type === 'fizz')) bad.push(`${w3.shape.id}: a zap down an empty lane hit something or never ended`);
      }
      return { ok: !bad.length, info: bad.length ? bad.slice(0, 5).join('; ') : `${n} zaps on 8 tubes: each popped only its own lane's critter, one at a time` };
    },

    split(sab) {
      const bad = [];
      for (const lv of [0, 4]) {
        for (const lane of [0, 7, 15]) {
          const w = world({ lv, sab });
          const sh = w.shape;
          S().addCritter(w, 'splitter', lane, 0.6);
          w.zap.lane = lane;
          S().fire(w);
          run(w, {}, 30);
          const smalls = w.critters.filter((c) => c.kind === 'small');
          const lanes = smalls.map((c) => c.lane).sort((a, b) => a - b);
          const want = [SH().step(sh, lane, -1), SH().step(sh, lane, 1)].sort((a, b) => a - b);
          if (smalls.length !== 2 || w.critters.length !== 2 || lanes[0] === lanes[1] || lanes.join() !== want.join()) {
            bad.push(`${sh.id} lane ${lane}: split into ${smalls.length} in lanes [${lanes}], want [${want}]`);
            continue;
          }
          for (const c of smalls.slice()) { w.zap.lane = c.lane; S().fire(w); run(w, {}, 30); }
          if (w.critters.length) bad.push(`${sh.id} lane ${lane}: ${w.critters.length} left after zapping both halves`);
        }
      }
      const w = world({ sab });
      S().addCritter(w, 'splitter', 4, 0.5);
      S().addCritter(w, 'jelly', 9, 0.5);
      S().superZap(w);
      if (w.critters.length) bad.push(`a super zap left ${w.critters.map((c) => c.kind)}`);
      return { ok: !bad.length, info: bad.length ? bad.slice(0, 5).join('; ') : 'a splitter splits into the two lanes beside it (circle and bridge, middle and end lanes); both halves zappable; a super zap pops it whole' };
    },

    hop(sab) {
      const bad = [];
      let hops = 0;
      for (const lv of [0, 4, 6]) {
        for (const start of [0, 8, 15]) {
          const w = world({ lv, sab });
          const c = S().addCritter(w, 'hopper', start, 0.05);
          w.freeze = true;
          let lane = c.lane, n = 0;
          run(w, {}, 60 * 30, () => {
            if (c.lane !== lane) {
              n++;
              if (SH().apart(w.shape, lane, c.lane) !== 1) bad.push(`${w.shape.id}: hopped ${lane} → ${c.lane}`);
              lane = c.lane;
            }
            if (c.lane < 0 || c.lane >= N) bad.push(`${w.shape.id}: off the tube at lane ${c.lane}`);
          });
          hops += n;
          if (n < 5) bad.push(`${w.shape.id} from lane ${start}: only ${n} hops in 30 s`);
        }
      }
      // a zap hits a hopper where it is now
      const w = world({ sab });
      const c = S().addCritter(w, 'hopper', 5, 0.5);
      c.hopT = 0;
      run(w, {}, Math.ceil(S().HOP_T * 60) + 2);
      const now = c.lane;
      if (now === 5) bad.push('the hopper never left lane 5');
      else {
        w.zap.lane = 5;
        S().fire(w);
        run(w, {}, 30);
        const missed = w.critters.includes(c);
        w.zap.lane = now;
        S().fire(w);
        run(w, {}, 30);
        if (!missed || w.critters.includes(c)) bad.push(`zap in its old lane ${missed ? 'missed' : 'HIT'}, in its new lane ${w.critters.includes(c) ? 'MISSED' : 'hit'}`);
      }
      return { ok: !bad.length, info: bad.length ? bad.slice(0, 5).join('; ') : `${hops} hops on circle, bridge and rainbow: always one lane, never off the end; zaps hit it in its new lane only` };
    },

    levelEnd(sab) {
      const bad = [];
      // three to come, each zapped as it climbs: the level ends only after the last one
      for (const level of ['easy', 'normal']) {
        const w = world({ level, sab, freeze: false });
        w.queue = ['jelly', 'hopper', 'jelly'];
        w.noSpawn = false;
        let clears = 0, early = false;
        run(w, () => {
          const c = w.critters.find((k) => k.d > 0.3);
          if (c) w.zap.lane = c.lane;
          return { fire: !!c };
        }, 60 * 40, (ww) => {
          const n = ww.events.filter((e) => e.type === 'clear').length;
          if (n && (ww.queue.length || ww.critters.length)) early = true;
          clears += n;
          return ww.phase !== 'morph';
        });
        if (early || clears !== 1) bad.push(`${level}: ${clears} clears${early ? ', one while critters were left' : ''}`);
      }
      // a small one left over from a splitter keeps the level going
      const w = world({ sab });
      w.queue = [];
      S().addCritter(w, 'splitter', 6, 0.5);
      w.zap.lane = 6;
      S().fire(w);
      let ev = run(w, {}, 20);
      const halves = w.critters.slice();
      if (ev.some((e) => e.type === 'clear')) bad.push('ended with the split halves still there');
      if (halves[0]) { w.zap.lane = halves[0].lane; S().fire(w); ev = run(w, {}, 20); }
      if (ev.some((e) => e.type === 'clear') || w.phase !== 'play') bad.push('ended with one half still there');
      if (halves[1]) { w.zap.lane = halves[1].lane; S().fire(w); ev = run(w, {}, 20); }
      if (!ev.some((e) => e.type === 'clear')) bad.push('never ended after the last critter');
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : 'ends once, only when no critter is on the tube or still to come' };
    },

    directions(sab) {
      const bad = [];
      let n = 0;
      for (let lv = 0; lv < 8; lv++) {
        for (const level of ['easy', 'normal']) {
          for (let k = 0; k < N; k++) {
            for (const dir of [1, -1]) {
              const w = world({ lv, level, sab });
              w.queue = ['jelly'];
              const sh = w.shape;
              w.zap.lane = k;
              const ev = run(w, { lr: dir }, 1);
              const to = w.zap.lane;
              n++;
              const end = sh.open && ((k === 0 && dir < 0) || (k === N - 1 && dir > 0));
              if (end) {
                if (to !== k || !ev.some((e) => e.type === 'edge')) bad.push(`${sh.id} lane ${k}: past the end`);
                continue;
              }
              const c = cross(mid(sh, k), mid(sh, to));
              if (to === k || (dir > 0 ? c >= 0 : c <= 0)) bad.push(`${sh.id} ${level} lane ${k}: ${dir > 0 ? '→' : '←'} went ${to === k ? 'nowhere' : c < 0 ? 'clockwise' : 'counter-clockwise'}`);
            }
          }
          // held: repeats, the same way round
          const w = world({ lv, level, sab });
          const sh = w.shape;
          const k0 = SH().startLane(sh);
          w.zap.lane = k0;
          let turn = 0, prev = k0, moves = 0;
          run(w, { lr: 1 }, 60, () => { const l = w.zap.lane; if (l !== prev) { turn += Math.sign(cross(mid(sh, prev), mid(sh, l))); moves++; prev = l; } });
          if (moves < 3 || turn !== -moves) bad.push(`${sh.id} ${level}: held → moved ${moves} lanes, ${turn === -moves ? 'all' : 'not all'} clockwise`);
          // an open tube's end: held → stops there, then ← still works
          if (sh.open) {
            const w2 = world({ lv, level, sab });
            w2.zap.lane = N - 2;
            run(w2, { lr: 1 }, 90);
            const atEnd = w2.zap.lane;
            run(w2, {}, 2);
            run(w2, { lr: -1 }, 1);
            if (atEnd !== N - 1 || w2.zap.lane !== N - 2) bad.push(`${sh.id}: held → ended at ${atEnd}, then ← went to ${w2.zap.lane}`);
          }
          // the first → of a level goes right on the screen
          const w3 = world({ lv, level, sab });
          const s3 = w3.shape, a = mid(s3, w3.zap.lane);
          run(w3, { lr: 1 }, 1);
          if (!(mid(s3, w3.zap.lane)[0] > a[0])) bad.push(`${s3.id}: the first → didn't go right`);
          // a finger on the tube: walks there the short way
          const w4 = world({ lv, level, sab });
          const s4 = w4.shape;
          w4.zap.lane = 2;
          const goal = s4.open ? 9 : 14;
          let steps = 0, last = 2;
          run(w4, { target: goal }, 240, () => { if (w4.zap.lane !== last) { steps++; last = w4.zap.lane; } return w4.zap.lane !== goal; });
          if (w4.zap.lane !== goal || steps !== SH().apart(s4, 2, goal)) bad.push(`${s4.id}: finger to lane ${goal} ended at ${w4.zap.lane} after ${steps} steps`);
        }
      }
      return { ok: !bad.length, info: bad.length ? bad.slice(0, 6).join('; ') : `${n} presses on 8 tubes: → always clockwise, ← counter-clockwise; held keys, open ends, fingers and every level's first → right` };
    },

    superZap(sab) {
      const bad = [];
      for (const [level, want] of [['easy', 2], ['normal', 1]]) {
        const w = world({ level, sab });
        if (S().P(w).supers !== want) bad.push(`${level}: ${S().P(w).supers} super zaps`);
        for (let i = 0; i <= want; i++) {
          for (const [k, lane] of [['jelly', 1], ['hopper', 5], ['splitter', 9], ['jelly', 13]]) S().addCritter(w, k, lane, 0.4 + lane / 40);
          const ev = run(w, { superPress: true }, 1);
          const left = w.critters.length;
          if (i < want && (left || !ev.some((e) => e.type === 'super'))) bad.push(`${level} super zap ${i + 1}: ${left} left`);
          if (i === want && (left !== 4 || !ev.some((e) => e.type === 'noSuper'))) bad.push(`${level}: a super zap with none left popped ${4 - left}`);
          w.critters = [];
        }
        // the next level gives them back
        w.queue = [];
        run(w, {}, 1);
        run(w, {}, 60 * 4);
        if (S().P(w).supers !== want || w.lv !== 1) bad.push(`${level}: next level has ${S().P(w).supers} (level ${w.lv + 1})`);
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : 'EASY 2, NORMAL 1 a level; each pops the whole tube; none left does nothing; they come back next level' };
    },

    lives(sab) {
      const bad = [];
      for (const [level, want] of [['easy', 5], ['normal', 3]]) {
        const w = world({ level, sab });
        const p = S().P(w);
        if (p.lives !== want) bad.push(`${level}: ${p.lives} lives`);
        // a critter reaching the rim in the zapper's lane tickles him after a moment
        w.zap.lane = 4;
        const c = S().addCritter(w, 'jelly', 4, 1);
        const other = S().addCritter(w, 'jelly', 10, 1);
        const ev = run(w, {}, Math.ceil(w.cfg.grace * 60) + 3);
        const t = ev.find((e) => e.type === 'tickle');
        if (!t || p.lives !== want - 1 || w.critters.includes(c)) bad.push(`${level}: no tickle (lives ${p.lives})`);
        if (other.st !== 'climb' || other.d > 0.5) bad.push(`${level}: the other rim critter didn't slide back`);
        // never stuck: right after, the zapper still moves both ways and still zaps
        const l0 = w.zap.lane;
        run(w, { lr: 1 }, 1);
        const l1 = w.zap.lane;
        run(w, {}, 2);
        run(w, { lr: -1 }, 1);
        const ev2 = run(w, { firePress: true }, 1);
        if (l1 === l0 || w.zap.lane !== l0 || !ev2.some((e) => e.type === 'zap')) bad.push(`${level}: after a tickle → ${l0}→${l1}, ← back to ${w.zap.lane}, zap ${ev2.some((e) => e.type === 'zap')}`);
        // for a moment after, nothing tickles; a zap during the moment before saves you
        S().addCritter(w, 'jelly', w.zap.lane, 1);
        run(w, {}, Math.ceil(w.cfg.grace * 60) + 3);
        if (p.lives !== want - 1) bad.push(`${level}: tickled again straight away`);
        const w2 = world({ level, sab });
        w2.zap.lane = 7;
        S().addCritter(w2, 'jelly', 7, 1);
        run(w2, {}, Math.floor(w2.cfg.grace * 30));
        run(w2, { firePress: true }, 1);
        run(w2, {}, 60);
        if (S().P(w2).lives !== want || w2.critters.length) bad.push(`${level}: zapping it on the rim didn't save you`);
        // the last life: game over (1 player)
        const w3 = world({ level, sab });
        S().P(w3).lives = 1;
        w3.zap.lane = 0;
        S().addCritter(w3, 'jelly', 0, 1);
        run(w3, {}, 90);
        if (w3.phase !== 'over') bad.push(`${level}: last life gone but phase ${w3.phase}`);
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : 'EASY 5, NORMAL 3; a rim critter in your lane tickles (a life), others slide back, zapper never stuck, a rim zap saves you, last life = game over' };
    },

    buddy(sab) {
      const bad = [];
      const w = world({ sab, players: ['tommy'] });
      const p = S().P(w);
      const supers = p.supers;
      let zaps = 0, treats = 0;
      for (let call = 0; call < 5; call++) {
        for (let i = 0; i < 6; i++) S().addCritter(w, i % 3 ? 'jelly' : 'splitter', i * 2, 0.3 + i * 0.1);
        S().addCritter(w, 'jelly', w.zap.lane, 1); // one on the rim in his lane: the brother's visit keeps you safe
        const lives = p.lives;
        if (!S().call(w)) bad.push(`call ${call + 1} refused`);
        if (call === 0 && w.buddy && w.buddy.who !== 'teddy') bad.push(`Tommy's brother is ${w.buddy.who}`);
        const ev = run(w, {}, Math.ceil(S().B_END * 60) + 4);
        const z = ev.find((e) => e.type === 'buddyZap');
        if (z && z.n >= 7) zaps++;
        if (ev.some((e) => e.type === 'treat')) treats++;
        if (w.critters.length) bad.push(`call ${call + 1}: ${w.critters.length} critters left after his super zap`);
        if (p.lives !== lives) bad.push(`call ${call + 1}: tickled while he was there`);
      }
      if (zaps !== 5 || treats !== 5) bad.push(`5 calls: ${zaps} super zaps, ${treats} treats`);
      if (p.supers !== supers) bad.push(`his super zaps used yours (${supers} → ${p.supers})`);
      // called again while he's still here: one more zap
      S().addCritter(w, 'jelly', 3, 0.4);
      S().call(w);
      run(w, {}, Math.ceil(S().B_ZAP * 60) + 5);
      S().addCritter(w, 'jelly', 8, 0.4);
      S().call(w);
      const more = w.events.some((e) => e.type === 'buddyMore'); // call() says it at once; the next step starts a new list
      run(w, {}, 40);
      if (w.critters.length || !more) bad.push('calling again while he was there did nothing');
      // 2 players: T is a high five, no zap
      const w2 = world({ sab, players: ['teddy', 'tommy'] });
      S().addCritter(w2, 'jelly', 3, 0.4);
      S().call(w2);
      const hi5 = w2.events.some((e) => e.type === 'hi5');
      run(w2, {}, 120);
      if (!hi5) bad.push('2 players: T gave no high five');
      if (w2.critters.length !== 1 || S().P(w2).score !== S().SCORE.hi5) bad.push(`2 players: T did ${w2.critters.length ? '' : 'a zap '}score ${S().P(w2).score}`);
      return { ok: !bad.length, info: bad.length ? bad.slice(0, 5).join('; ') : '5 calls in a row: each a treat and the whole tube super-zapped, your own super zaps untouched, no tickles while he is there; again mid-visit = one more; 2 players = high five' };
    },

    turns(sab) {
      const bad = [];
      const w = world({ sab, players: ['teddy', 'tommy'] });
      const [a, b] = w.players;
      // Teddy loses a life: Tommy's turn
      w.zap.lane = 3;
      S().addCritter(w, 'jelly', 3, 1);
      run(w, {}, 80);
      if (w.cur !== 1 || w.phase !== 'turn' || a.lives !== w.cfg.lives - 1) bad.push(`after Teddy's tickle: player ${w.cur + 1}, ${w.phase}, Teddy ${a.lives} lives`);
      // Tommy clears his level: back to Teddy, who restarts level 1; Tommy is on level 2
      run(w, {}, 60 * 3);
      w.phase = 'play';
      w.queue = [];
      w.critters = [];
      run(w, {}, 1);
      run(w, {}, 60 * 2);
      if (w.cur !== 0 || b.lv !== 1 || a.lv !== 0 || w.lv !== 0) bad.push(`after Tommy's clear: player ${w.cur + 1}, levels ${a.lv + 1} / ${b.lv + 1}, tube level ${w.lv + 1}`);
      // both out: game over
      a.lives = 1;
      b.lives = 1;
      for (let k = 0; k < 2; k++) {
        run(w, {}, 60 * 3);
        w.phase = 'play';
        w.noSpawn = true;
        w.zap.lane = 6;
        w.zap.inv = 0;
        S().addCritter(w, 'jelly', 6, 1);
        run(w, {}, 80);
      }
      if (w.phase !== 'over' || !a.out || !b.out) bad.push(`both out of lives: ${w.phase}, out ${a.out}/${b.out}`);
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : 'the turn passes on a lost life and on a clear; each keeps his own level; both out = game over' };
    },

    autopilot(sab) {
      const bad = [];
      const out = [];
      for (const level of ['easy', 'normal']) {
        for (const players of [['teddy'], ['teddy', 'tommy']]) {
          const w = S().create({ level, players, seed: 11, sabotage: sab });
          let t = 0;
          while (w.phase !== 'over' && t < 60 * 60 * 30) {
            S().step(w, TZ.bot.decide(w));
            t++;
          }
          const lost = w.players.map((p) => w.cfg.lives + Math.floor(p.score / 10000) - p.lives);
          out.push(`${level} ${players.length}P ${w.won && w.players.every((p) => p.done) ? 'all 8' : 'level ' + (w.lv + 1)} in ${Math.round(t / 3600)} min, lives lost ${lost.join('/')}`);
          if (!w.won || !w.players.every((p) => p.done)) bad.push(`${level} ${players.length}P: stopped on level ${w.lv + 1} (${w.phase}), lives lost ${lost}`);
        }
      }
      return { ok: !bad.length, info: bad.length ? bad.join('; ') : out.join(' · ') };
    },
  };

  const SABOTAGE = {
    shapeGap: ['shapes', 'the square has only 15 lanes'],
    zapWide: ['zapOwnLane', 'a zap also hits the lanes beside it'],
    zapThrough: ['zapOwnLane', 'a zap pops everything in its lane'],
    noSplit: ['split', 'splitters just pop'],
    splitSame: ['split', 'both halves land in the same lane'],
    noHop: ['hop', 'hoppers never hop'],
    hopFar: ['hop', 'hoppers jump two lanes'],
    endEarly: ['levelEnd', 'the level ends while critters are still to come'],
    endNever: ['levelEnd', 'the level never ends'],
    mirror: ['directions', '← and → swapped'],
    shapeMirror: ['directions', 'the heart drawn the other way round'],
    superNone: ['superZap', 'super zaps pop nothing'],
    easyLives: ['lives', 'EASY has 3 lives'],
    stuckAfterTickle: ['lives', 'the zapper stops moving after a tickle'],
    buddyNoZap: ['buddy', 'the brother pops in but never zaps'],
    noTurns: ['turns', '2 players never take turns'],
  };

  function runAll(only) {
    const results = [];
    for (const name of Object.keys(checks)) {
      if (only && !only.includes(name)) continue;
      let r;
      try { r = checks[name](null); } catch (e) { r = { ok: false, info: 'crashed: ' + (e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e) }; }
      results.push({ name, ok: r.ok, info: r.info });
    }
    const failed = results.filter((r) => !r.ok).map((r) => r.name);
    return { ok: !failed.length, results, failed };
  }
  function fail() {
    const caught = [];
    for (const [sabotage, [check, what]] of Object.entries(SABOTAGE)) {
      let r;
      try { r = checks[check](sabotage); } catch (e) { r = { ok: false, info: 'crashed: ' + e }; }
      caught.push({ sabotage, what, check, caught: !r.ok, failed: [r.info] });
    }
    return { ok: caught.every((c) => c.caught), caught };
  }
  TZ.check = { run: runAll, fail, checks, SABOTAGE };
})(typeof window !== 'undefined' ? window : globalThis);
