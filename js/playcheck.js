/* TT Tube Zapper: the play check with real keys and taps, in the page: game.playCheck().
   Everything here presses keys with real keydown/keyup events on window and taps the touch buttons (and the tube) with
   pointer events, so it goes through the same input code a kid's fingers do (never the autopilot). Time moves with
   game.step, which runs the same frame code as the browser's own frames. Positions are read on the screen.
   - direction: on all 8 tubes, EASY and NORMAL, for Teddy, Tommy and both brothers' turns in 2 players, from every
     lane: → moves the zapper clockwise on the screen and the way the → rim arrow points, ← counter-clockwise and the
     way the ← arrow points (A D and the ◀ ▶ buttons too), an open tube's end stops it, and every level's first → goes
     to the right.
   - the game itself with real keys: Space zaps down its own lane only, holding it keeps zapping, ⚡ zaps, ↓ and 💫
     super-zap, a finger on the tube walks the zapper to that lane and zaps.
   - nothing leaves him stuck: a tickle, a key held through pause, a lost window, a cancelled touch, the brother's
     visit, the next level's new tube, the 2 player turn change, an open tube's end, and a "keyboard kid" mashing keys
     on every tube.
   game.playCheck('mirror') and game.playCheck('stuck') prove the check fails when the controls are wrong. */
(function () {
  'use strict';
  const NAMES = { ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', Space: ' ', KeyT: 't', KeyP: 'p', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's', KeyM: 'm', Enter: 'Enter', Escape: 'Escape' };
  const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: NAMES[code] || code, bubbles: true, cancelable: true }));
  const step = (s) => game.step(s, { draw: false });
  const st = () => game.state();
  const SH = TZ.shapes, N = SH.N;
  function press(code, secs) {
    key(code, true);
    step(secs || 1 / 60);
    key(code, false);
    step(1 / 60);
  }
  const button = (a) => [...document.querySelectorAll(`#touch [data-a="${a}"]`)].find((b) => b.offsetParent);
  function tap(a, secs, cancel) {
    const el = button(a);
    if (!el) return false;
    const o = { pointerId: 30 + 'lrzs'.indexOf(a[0]), bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    step(secs || 1 / 60);
    el.dispatchEvent(new PointerEvent(cancel ? 'pointercancel' : 'pointerup', o));
    step(1 / 60);
    return true;
  }
  // a finger on the tube at a screen point
  function finger(x, y, secs) {
    const cv = document.getElementById('game');
    const o = { pointerId: 41, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y };
    cv.dispatchEvent(new PointerEvent('pointerdown', o));
    step(secs);
    cv.dispatchEvent(new PointerEvent('pointerup', o));
    step(1 / 60);
  }
  function fresh(lv, o) {
    game.start(Object.assign({ lv, go: true, level: 'easy', players: 1, who: 'teddy' }, o || {}));
    game.quiet();
    step(0.1);
    return st();
  }
  // on the screen (y down), clockwise round c means a positive cross product
  const turnOf = (c, a, b) => (a[0] - c[0]) * (b[1] - c[1]) - (a[1] - c[1]) * (b[0] - c[0]);
  const settle = () => step(0.2);

  function run(sab) {
    const results = [];
    const ok = (name, pass, info) => results.push({ name, ok: !!pass, info });
    const wasHold = game.G.hold, wasAuto = game.G.autoPause;
    game.hold(true);
    game.G.autoPause = false;
    const hadTouch = document.body.classList.contains('touch');
    game.sabotage(sab || null);
    try {
      // ---------- direction on every tube, from every lane ----------
      const setups = [['teddy', 1, 0, 'keys'], ['tommy', 1, 0, 'keys'], ['teddy', 2, 0, 'keys'], ['teddy', 2, 1, 'keys'], ['teddy', 1, 0, 'AD'], ['tommy', 1, 0, 'touch']];
      for (let lv = 0; lv < 8; lv++) {
        for (const level of ['easy', 'normal']) {
          for (const [who, players, cur, how] of setups) {
            if (level === 'normal' && how !== 'keys') continue;
            document.body.classList.toggle('touch', how === 'touch');
            fresh(lv, { who, players, level });
            if (cur) { const w = game.world(); w.cur = 1; w.players[1].lv = lv; TZ.sim.loadLevel(w); w.phase = 'play'; game.quiet(); step(0.1); }
            const sh = game.world().shape;
            const tag = `${sh.id} ${level} ${players === 2 ? '2P ' + st().players[cur].who : who} ${how}`;
            const bad = [];
            const R = how === 'AD' ? 'KeyD' : 'ArrowRight', L = how === 'AD' ? 'KeyA' : 'ArrowLeft';
            for (let k = 0; k < N; k++) {
              for (const [dir, code, ar] of [[1, R, 'arrowR'], [-1, L, 'arrowL']]) {
                game.lane(k);
                settle();
                const a = st();
                const arrow = a[ar];
                if (how === 'touch') tap(dir > 0 ? 'r' : 'l'); else press(code);
                settle();
                const b = st();
                const want = SH.step(sh, k, dir);
                if (want === k) { if (b.lane !== k || arrow) bad.push(`lane ${k} ${dir > 0 ? '→' : '←'}: past the end or an arrow shown`); continue; }
                const mv = [b.zx - a.zx, b.zy - a.zy];
                const cw = turnOf(a.center, [a.zx, a.zy], [b.zx, b.zy]);
                const along = arrow ? mv[0] * arrow.dx + mv[1] * arrow.dy : -1;
                const toward = arrow ? mv[0] * (arrow.x - a.zx) + mv[1] * (arrow.y - a.zy) : -1;
                if (b.lane !== want || Math.hypot(mv[0], mv[1]) < 8 || (dir > 0 ? cw <= 0 : cw >= 0) || along <= 0 || toward <= 0) {
                  bad.push(`lane ${k} ${dir > 0 ? '→' : '←'}: to lane ${b.lane} (want ${want}), moved ${mv.map(Math.round)} px, ${cw > 0 ? 'clockwise' : 'counter-clockwise'}, ${along > 0 ? 'with' : 'AGAINST'} its arrow`);
                }
              }
            }
            ok(`dir ${tag}`, !bad.length, bad.length ? bad.slice(0, 3).join('; ') : '→ clockwise and ← counter-clockwise from all 16 lanes, each the way its rim arrow points');
            // the level's first → goes right on the screen
            fresh(lv, { who, players, level });
            const a = st();
            if (how === 'touch') tap('r'); else press(R);
            settle();
            const b = st();
            ok(`first → ${tag}`, b.zx - a.zx > 8, `${Math.round(a.zx)} → ${Math.round(b.zx)} px`);
          }
        }
      }
      document.body.classList.toggle('touch', hadTouch);

      // ---------- the game itself with real keys and taps ----------
      for (const level of ['easy', 'normal']) {
        fresh(0, { level });
        game.lane(4);
        const mine = game.critter('jelly', 4, 0.6), next = game.critter('jelly', 5, 0.6);
        const w = game.world();
        w.freeze = true;
        press('Space');
        step(0.4);
        const c = w.critters;
        ok(`Space zaps its own lane ${level}`, !c.includes(mine) && c.includes(next), `own lane ${c.includes(mine) ? 'MISSED' : 'popped'}, next lane ${c.includes(next) ? 'untouched' : 'POPPED'}`);
        // held: keeps zapping
        const z0 = st().sfx.zap || 0;
        key('Space', true);
        step(0.8);
        key('Space', false);
        step(0.05);
        const held = (st().sfx.zap || 0) - z0;
        ok(`held Space keeps zapping ${level}`, held >= 4, `${held} zaps in 0.8 s`);
        // ⚡ and 💫 buttons, ↓
        document.body.classList.add('touch');
        game.lane(7);
        const t1 = game.critter('jelly', 7, 0.5);
        tap('z');
        step(0.4);
        ok(`⚡ button zaps ${level}`, !w.critters.includes(t1), w.critters.includes(t1) ? 'missed' : 'popped');
        for (let i = 0; i < 4; i++) game.critter('jelly', i * 4 + 1, 0.4);
        press('ArrowDown');
        step(0.1);
        const left1 = st().critters.length;
        for (let i = 0; i < 4; i++) game.critter('jelly', i * 4 + 2, 0.4);
        tap('super');
        step(0.1);
        const left2 = st().critters.length;
        ok(`↓ and 💫 super-zap ${level}`, left1 === 0 && (level === 'easy' ? left2 === 0 : left2 === 4), `after ↓: ${left1} left; after 💫: ${left2} left (${level === 'easy' ? '2' : '1'} a level)`);
        // a finger on the tube: goes there and zaps
        game.lane(1);
        const t2 = game.critter('jelly', 9, 0.6);
        const sh = w.shape;
        const p = SH.at(sh, 9, 0.75);
        const [fx, fy] = game.toScreen(p[0], p[1], p[2]);
        finger(fx, fy, 1.6);
        ok(`finger on the tube ${level}`, st().lane === 9 && !w.critters.includes(t2), `zapper at lane ${st().lane} (want 9), critter ${w.critters.includes(t2) ? 'still there' : 'popped'}`);
        document.body.classList.toggle('touch', hadTouch);
      }

      // ---------- nothing leaves him stuck ----------
      const moves = (tag) => {
        const a = st();
        press('ArrowRight');
        settle();
        const b = st();
        press('ArrowLeft');
        settle();
        const c = st();
        const z0 = st().sfx.zap || 0;
        press('Space');
        const zapped = (st().sfx.zap || 0) > z0;
        return { ok: b.lane !== a.lane && c.lane === a.lane && zapped, info: `${tag}: → ${a.lane}→${b.lane}, ← back to ${c.lane}, zap ${zapped}` };
      };
      for (const level of ['easy', 'normal']) {
        // a tickle
        fresh(0, { level });
        game.lane(3);
        game.critter('jelly', 3, 1);
        step(1.2);
        const tk = st();
        step(0.3);
        let r = moves('after a tickle');
        ok(`not stuck: tickle ${level}`, tk.players[0].lives === (level === 'easy' ? 4 : 2) && r.ok, `lives ${tk.players[0].lives}; ${r.info}`);
        // a key held through pause
        fresh(1, { level });
        key('ArrowRight', true);
        step(0.05);
        press('KeyP');
        key('ArrowRight', false);
        step(0.1);
        press('KeyP');
        const l0 = st().lane;
        step(0.6);
        const l1 = st().lane;
        r = moves('after pause');
        ok(`not stuck: key held through pause ${level}`, l0 === l1 && st().screen === 'play' && r.ok, `still moving after resume: ${l0 !== l1}; ${r.info}`);
        // a lost window
        fresh(2, { level });
        key('ArrowLeft', true);
        step(0.1);
        dispatchEvent(new Event('blur'));
        const b0 = st().lane;
        step(0.6);
        key('ArrowLeft', false);
        r = moves('after blur');
        ok(`not stuck: lost window ${level}`, st().lane === b0 && r.ok, `kept going: ${st().lane !== b0}; ${r.info}`);
        // a cancelled touch
        document.body.classList.add('touch');
        fresh(3, { level });
        tap('l', 0.05, true);
        const c0 = st().lane;
        step(0.6);
        const c1 = st().lane;
        r = moves('after a cancelled touch');
        ok(`not stuck: cancelled touch ${level}`, c0 === c1 && r.ok, `kept going: ${c0 !== c1}; ${r.info}`);
        document.body.classList.toggle('touch', hadTouch);
        // the brother's visit
        fresh(0, { level, who: 'tommy' });
        press('KeyT');
        step(0.3);
        r = moves('during the visit');
        step(3);
        const r2 = moves('after the visit');
        ok(`not stuck: brother's visit ${level}`, r.ok && r2.ok, `${r.info}; ${r2.info}`);
        // the next level's new tube
        fresh(3, { level });
        const w = game.world();
        w.queue = [];
        step(0.1);
        step(TZ.sim.CLEAR_T + TZ.sim.MORPH_T + 1.6);
        r = moves(`level ${w.lv + 1} (${w.shape.id})`);
        ok(`not stuck: next tube ${level}`, w.lv === 4 && st().phase === 'play' && r.ok, `phase ${st().phase}; ${r.info}`);
        // 2 players: the turn passes, the same keys drive the next brother
        fresh(0, { level, players: 2 });
        game.lane(5);
        game.critter('jelly', 5, 1);
        step(1.2);
        const cur = st().cur;
        step(TZ.sim.MORPH_T + 1.6);
        r = moves('Tommy\'s turn');
        ok(`not stuck: 2 player turn ${level}`, cur === 1 && st().phase === 'play' && r.ok, `turn went to player ${cur + 1}; ${r.info}`);
        // an open tube's end
        fresh(4, { level });
        game.lane(13);
        key('ArrowRight', true);
        step(1.5);
        key('ArrowRight', false);
        step(0.05);
        const end = st().lane;
        press('ArrowLeft');
        settle();
        ok(`not stuck: bridge end ${level}`, end === 15 && st().lane === 14, `held → stopped at ${end}, then ← to ${st().lane}`);
      }
      // a keyboard kid mashing keys on every tube
      const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyT', 'Enter'];
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let lv = 0; lv < 8; lv++) {
        game.start({ lv, level: lv % 2 ? 'normal' : 'easy', players: lv % 3 ? 1 : 2 });
        for (let i = 0; i < 90; i++) {
          const k = KEYS[Math.floor(rnd() * KEYS.length)];
          key(k, true);
          step(0.03 + rnd() * 0.15);
          if (rnd() < 0.7) key(k, false);
          step(0.03);
        }
        for (const k of KEYS) key(k, false);
        step(0.3);
        if (st().screen !== 'play') game.start({ lv, go: true });
        game.quiet();
        game.world().from = null; // mid-turn or mid-morph: straight back to playing
        game.world().phase = 'play';
        step(0.5);
        const r = moves(`tube ${lv + 1}`);
        ok(`not stuck: keyboard kid on ${game.world().shape.id}`, r.ok, r.info);
      }
    } catch (e) {
      ok('crashed', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
    } finally {
      game.sabotage(null);
      document.body.classList.toggle('touch', hadTouch);
      for (const k of Object.keys(NAMES)) key(k, false);
      game.G.autoPause = wasAuto;
      game.showTitle();
      game.hold(wasHold);
    }
    const failed = results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.info}`);
    return { ok: !failed.length, total: results.length, failed, results };
  }
  window.game.playCheck = run;
})();
