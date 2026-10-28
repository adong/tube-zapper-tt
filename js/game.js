/* TT Tube Zapper: the page. The Three.js scene with a fixed arcade camera looking down the tube, the HUD and screens,
   keys, touch buttons and a finger on the tube, the brother who pops in to super-zap, the celebrations, and the
   window.game test hooks. The rules are js/sim.js (fixed 1/60 s steps); the tubes are js/shapes.js; the 3D things are
   js/art.js; sounds are js/sfx.js. */
(function () {
  'use strict';
  const T = THREE, S = TZ.sim, SH = TZ.shapes, A = TZ.art, SFX = TZ.sfx;
  const $ = (id) => document.getElementById(id);
  const PI = Math.PI, DT = S.DT, N = SH.N;
  const KEY = 'tubeZapperTT.v1';
  const NAME = (id) => (Kit.roster.get(id) || { name: id.toUpperCase() }).name;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const RIDER = 0.5; // the kit's people are 2 m tall; riding the zapper they're 1 m
  const FRIENDS = { easy: [['foxy', 9000], ['froggy', 5000]], normal: [['foxy', 16000], ['froggy', 9000]] };
  const COLOR = { teddy: '#ffb02e', tommy: '#7dff5a' };
  const WORDS = ['SPARKLE!', 'POP!', 'BLOOP!', 'TWINKLE!', 'FIZZ!'];

  const store = {
    d: {},
    load() {
      try { this.d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { this.d = {}; }
      this.d.top = this.d.top || {};
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { /* private mode: fine */ } },
    table(level) {
      const t = (this.d.top[level] || []).slice();
      for (const [who, score] of FRIENDS[level]) if (!t.some((r) => r.who === who && r.cpu)) t.push({ who, score, cpu: true });
      return t.sort((a, b) => b.score - a.score).slice(0, 6);
    },
    add(level, who, score) {
      if (!score) return null;
      const row = { who, score, at: Date.now() + Math.random() };
      const mine = (this.d.top[level] || []).concat([row]).sort((a, b) => b.score - a.score).slice(0, 5);
      this.d.top[level] = mine;
      this.save();
      return mine.includes(row) ? row : null;
    },
  };

  const G = {
    screen: 'loading', w: null, demo: false, paused: false, hold: false, autoPause: true,
    keys: {}, taps: {}, touch: { l: 0, r: 0, z: 0 }, firePress: false, superPress: false, finger: null, acc: 0, time: 0,
    players: 1, who: 'teddy', level: 'easy', sab: null, botInp: null,
    scene2: null, overT: 0, newRows: [], frame: 0, k: 1, vis: 0, visLv: -1, waveT: 9, zapK: 0, flash: 0, hopVis: new Map(),
  };
  let renderer, scene, cam, sky, tube, zapper, arrows, confetti, sparkles, treat, last = 0;
  const people = {}, props = {};
  let portraits = {};
  const pools = { jelly: [], hopper: [], splitter: [], small: [], shot: [] };
  const live = new Map(); // id → mesh for critters ('c' + id) and shots ('s' + id)
  const v3 = new T.Vector3();

  // ---------- start-up ----------
  function boot() {
    renderer = new T.WebGLRenderer({ canvas: $('game'), antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(2, Math.max(1, devicePixelRatio || 1)));
    scene = new T.Scene();
    cam = new T.PerspectiveCamera(36, 1, 1, 200);
    scene.add(new T.HemisphereLight('#ffffff', '#6a4cc9', 0.9));
    const sun = new T.DirectionalLight('#fff4dd', 0.7);
    sun.position.set(-6, 10, 30);
    scene.add(sun);
    sky = A.backdrop(scene);
    tube = A.tube(scene);
    zapper = A.zapper();
    scene.add(zapper);
    arrows = { r: A.arrow('→', '#ffd400'), l: A.arrow('←', '#18d4ff') };
    scene.add(arrows.r, arrows.l);
    confetti = A.confetti(scene, 700);
    sparkles = A.sparkles(scene, 60);
    for (const id of ['teddy', 'tommy', 'foxy', 'froggy']) {
      const r = Kit.roster.get(id);
      const p = Kit.people.build(r.look);
      const holder = new T.Group(); // placed on the rim (or on the ground); the person turns inside it
      holder.add(p.root);
      holder.visible = false;
      scene.add(holder);
      p.holder = holder;
      people[id] = p;
      G.people = people;
    }
    for (const id of ['teddy', 'tommy']) {
      const o = (props[id] = {});
      o.ball = A.emoji('🏀', 0.32);
      o.peace = A.emoji('✌️', 0.36);
      o.glove = A.emoji('🥊', 0.3);
      for (const k of ['ball', 'peace', 'glove']) { o[k].visible = false; scene.add(o[k]); }
    }
    treat = A.emoji('🍦', 0.45);
    treat.visible = false;
    scene.add(treat);
    portraits = Kit.portraits(['teddy', 'tommy', 'foxy', 'froggy'].map((id) => Kit.roster.get(id)), { size: 128 });
    store.load();
    const o = store.d.opts || {};
    if (o.players === 2) G.players = 2;
    if (o.who === 'tommy') G.who = 'tommy';
    if (o.level === 'normal') G.level = 'normal';
    setupUI();
    addEventListener('resize', fit);
    showTitle();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------- the fixed arcade camera: straight down the tube, the whole rim fitting the free part of the page ----------
  const BOX = { x0: -6.6, x1: 6.6, y0: -6.6, y1: 6.6 }; // every tube's rim, its riders and the rim arrows' key caps
  function fit() {
    const W = innerWidth, H = innerHeight;
    renderer.setSize(W, H, false);
    const short = H <= 460, narrow = W <= 520;
    const top = short ? 50 : narrow ? 58 : 68;
    const bw = BOX.x1 - BOX.x0, bh = BOX.y1 - BOX.y0;
    const kOf = (m) => Math.min(Math.max(50, W - m[0] - m[1]) / bw, Math.max(50, H - m[2] - m[3]) / bh);
    let m = [58, 10, top, 8];
    if (document.body.classList.contains('touch') && (G.screen === 'play' || G.screen === 'pause')) {
      // the buttons sit in the bottom corners: keep the tube beside them or above them, whichever is bigger
      const box = (sel) => {
        const rs = [...document.querySelectorAll(sel + ' button')].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect());
        return rs.length ? { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), top: Math.min(...rs.map((r) => r.top)) } : { left: W, right: 0, top: H };
      };
      const lp = box('.lpad'), rp = box('.rpad');
      const side = [Math.max(58, lp.right + 6), Math.max(10, W - rp.left + 6), top, 8];
      const below = [58, 10, top, Math.max(H - lp.top, H - rp.top) + 6];
      m = kOf(side) >= kOf(below) ? side : below;
    }
    const k = kOf(m);
    const sw = W - m[0] - m[1], sh = H - m[2] - m[3];
    const viewH = H / k;
    const D = viewH / 2 / Math.tan((cam.fov * PI) / 360);
    const offX = m[0] + sw / 2 - W / 2, offY = m[2] + sh / 2 - H / 2;
    const cx = (BOX.x0 + BOX.x1) / 2 - offX / k, cy = (BOX.y0 + BOX.y1) / 2 + offY / k;
    cam.aspect = W / H;
    cam.position.set(cx, cy, D);
    cam.near = Math.max(0.5, D * 0.3);
    cam.far = D + 80;
    cam.lookAt(cx, cy, 0);
    cam.updateProjectionMatrix();
    G.k = k;
    G.margins = m;
    // the corners of the screen on the rim's plane: Foxy and Froggy cheer from the bottom ones
    G.view = { x0: cx - W / 2 / k, x1: cx + W / 2 / k, y0: cy - H / 2 / k, y1: cy + H / 2 / k };
  }
  function toScreen(x, y, z) {
    v3.set(x, y, z || 0).project(cam);
    return [(v3.x * 0.5 + 0.5) * innerWidth, (-v3.y * 0.5 + 0.5) * innerHeight];
  }

  // ---------- games ----------
  function newWorld(demo) {
    const who = demo ? ['teddy'] : G.players === 2 ? ['teddy', 'tommy'] : [G.who];
    const w = S.create({ level: demo ? 'easy' : G.level, players: who, seed: (Math.random() * 1e9) | 0, buddyFor: (id) => Kit.roster.buddyFor(id) });
    if (demo) w.players[0].lives = 99;
    return w;
  }
  function play() {
    Kit.sound.init();
    store.d.opts = { players: G.players, who: G.who, level: G.level };
    store.save();
    G.w = newWorld(false);
    G.demo = false;
    G.paused = false;
    G.overT = 0;
    G.scene2 = null;
    resetInput();
    G.acc = 0;
    G.vis = G.w.zap.lane;
    confetti.clear();
    sparkles.clear();
    clearPops();
    document.body.classList.toggle('two', G.w.two);
    showScreen('play');
    setupBud();
    bigLevel(G.w.two ? `${NAME(S.P(G.w).who)} FIRST!` : null);
    Kit.sound.music('play');
  }
  function resetInput() {
    G.keys = {};
    G.taps = {};
    G.touch = { l: 0, r: 0, z: 0 };
    G.firePress = G.superPress = false;
    G.finger = null;
    document.querySelectorAll('#touch .down').forEach((b) => b.classList.remove('down'));
  }
  function setupBud() {
    const w = G.w;
    const who = w.two ? null : Kit.roster.buddyFor(w.players[0].who);
    const img = w.two ? portraits[w.players[1].who] : portraits[who];
    $('budBtn').querySelector('img').src = img || '';
    document.querySelector('.tb.call img').src = img || '';
    setText($('budLbl'), w.two ? 'HIGH FIVE' : `CALL ${NAME(who)}`);
    setText(document.querySelector('.tb.call small'), w.two ? '✋' : 'CALL');
  }
  function call() {
    if (!G.w || G.demo || G.screen !== 'play' || G.paused) return false;
    const ok = S.call(G.w);
    if (ok) handleEvents(G.w.events.splice(0));
    return ok;
  }
  const shapeName = (lv) => (G.w ? G.w.shapes[lv % G.w.shapes.length].name : '');
  const levelLine = () => (G.w ? `LEVEL ${G.w.lv + 1} · ${shapeName(G.w.lv)}` : '');
  function bigLevel(first) {
    const w = G.w;
    big(first || `LEVEL ${w.lv + 1}`, first ? levelLine() : `${shapeName(w.lv)} · READY?`);
  }

  // ---------- screens ----------
  function showScreen(id) {
    G.screen = id;
    for (const s of ['title', 'pause', 'results']) $(s).classList.toggle('hidden', s !== id);
    $('hud').classList.toggle('hidden', id === 'title' || id === 'results');
    $('touch').classList.toggle('hidden', id !== 'play');
    $('menuMute').classList.toggle('hidden', id === 'play' || id === 'pause');
    document.body.classList.toggle('title', id === 'title');
    if (id !== 'play' && id !== 'pause') { $('bigmsg').classList.remove('show'); $('toast').classList.remove('show'); clearPops(); }
    fit();
  }
  function showTitle() {
    G.w = newWorld(true);
    G.demo = true;
    G.paused = false;
    G.scene2 = null;
    G.vis = G.w.zap.lane;
    confetti.clear();
    sparkles.clear();
    clearPops();
    document.body.classList.remove('two');
    showScreen('title');
    refreshTitle();
    Kit.sound.music('title');
  }
  function refreshTitle() {
    document.querySelectorAll('[data-players]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.players === G.players)));
    document.querySelectorAll('[data-who]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.who === G.who)));
    document.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.level === G.level)));
    $('whoRow').classList.toggle('off', G.players === 2);
    const top = store.table(G.level)[0];
    setText($('titleHi'), `HI-SCORE ${fmt(top.score)} · ${NAME(top.who)}`);
  }
  function setOpt(k, v) {
    G[k] = v;
    SFX.click();
    refreshTitle();
  }
  function pause() {
    if (G.screen !== 'play' || G.paused) return;
    G.paused = true;
    showScreen('pause');
    Kit.sound.music('pause');
  }
  function resume() {
    if (!G.paused) return;
    G.paused = false;
    resetInput();
    showScreen('play');
    Kit.sound.music('play');
  }
  function showResults() {
    const w = G.w;
    const ps = w.players;
    G.newRows = ps.map((p) => store.add(w.level, p.who, p.score)).filter(Boolean);
    const order = ps.slice().sort((a, b) => b.score - a.score);
    const tie = ps.length === 2 && ps[0].score === ps[1].score;
    let title;
    if (ps.length === 2) title = tie ? "IT'S A TIE!" : `${NAME(order[0].who)} WINS!`;
    else title = w.won ? 'ALL 8 TUBES ZAPPED!' : 'GREAT ZAPPING!';
    setText($('resTitle'), title);
    const pl = ps[0];
    setText($('resSub'), ps.length === 2 ? `${NAME(ps[0].who)} ${fmt(ps[0].score)} · ${NAME(ps[1].who)} ${fmt(ps[1].score)}` : `${fmt(pl.score)} points · level ${Math.min(S.LEVELS, pl.lv + 1)}`);
    const rows = store.table(w.level);
    const tb = $('resTable');
    tb.innerHTML = '';
    const cap = document.createElement('caption');
    cap.textContent = w.level === 'easy' ? '🐣 TOP ZAPPERS' : '🔥 TOP ZAPPERS';
    tb.appendChild(cap);
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      if (G.newRows.some((n) => n.at === r.at && n.who === r.who && n.score === r.score)) tr.className = 'me';
      tr.innerHTML = `<td class="rk">${i + 1}</td><td class="who"><img alt="" src="${portraits[r.who] || ''}"><span>${NAME(r.who)}</span></td><td class="pts">${fmt(r.score)}</td>`;
      tb.appendChild(tr);
    });
    const best = $('resBest');
    const isTop = G.newRows.some((n) => rows[0] && n.score === rows[0].score && n.who === rows[0].who && n.at === rows[0].at);
    setText(best, isTop ? '⭐ NEW HI-SCORE!' : G.newRows.length ? '⭐ ON THE BOARD!' : '');
    best.classList.toggle('new', G.newRows.length > 0);
    // the winner (the top scorer) in the middle doing his move; his brother beside him
    G.scene2 = { kind: 'win', who: order.map((p) => p.who), t: 0 };
    showScreen('results');
    SFX.win();
    Kit.sound.music('over');
  }

  // ---------- keys, touch buttons and a finger on the tube ----------
  // ← A counter-clockwise, → D clockwise; Space ↑ W J K zap (hold to keep zapping); ↓ S Z X Shift super zap.
  // 2 players take turns, so both use the same keys.
  const LR = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
  const FIRE = ['Space', 'ArrowUp', 'KeyW', 'KeyJ', 'KeyK'];
  const SUPER = ['ArrowDown', 'KeyS', 'KeyZ', 'KeyX', 'ShiftLeft', 'ShiftRight'];
  function readInput() {
    let lr = 0;
    for (const c in G.keys) if (G.keys[c] && LR[c]) lr += LR[c];
    if (G.touch.r) lr += 1;
    if (G.touch.l) lr -= 1;
    if (!lr && G.taps.lr) lr = G.taps.lr; // a tap shorter than a frame still moves
    lr = Math.sign(lr);
    if (G.sab === 'mirror') lr = -lr; // the play check's own sabotages
    let fire = FIRE.some((c) => G.keys[c]) || !!G.touch.z;
    let target = null;
    if (G.finger) { target = laneAt(G.finger.x, G.finger.y); fire = true; }
    const out = { lr, fire, firePress: G.firePress, superPress: G.superPress, target };
    if (G.sab === 'stuck' && G.w.zap.giggle > 0 || G.sab === 'stuck' && G.stuckLatch) { G.stuckLatch = true; out.lr = 0; out.target = null; }
    G.taps = {};
    G.firePress = G.superPress = false;
    return out;
  }
  // the lane under a finger: the one whose middle line (rim to far end) on screen is nearest
  function laneAt(px, py) {
    const sh = S.shapeNow(G.w);
    let best = null, bd = Infinity;
    for (let i = 0; i < N; i++) {
      const r = SH.at(sh, i, 1), f = SH.at(sh, i, 0);
      const [ax, ay] = toScreen(r[0], r[1], r[2]), [bx, by] = toScreen(f[0], f[1], f[2]);
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
      const d = Math.hypot(px - ax - dx * u, py - ay - dy * u);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function setupUI() {
    const logo = () => {
      const zh = Kit.lang.is('zh');
      $('logoText').textContent = zh ? TZ.ZH : TZ.TITLE;
      $('logoSub').textContent = zh ? TZ.TITLE : '';
    };
    $('tagline').textContent = TZ.TAGLINE;
    logo();
    Kit.lang.onChange(logo);
    document.querySelectorAll('[data-who] img').forEach((im) => (im.src = portraits[im.parentNode.dataset.who] || ''));
    document.querySelectorAll('[data-players]').forEach((b) => b.addEventListener('click', () => setOpt('players', +b.dataset.players)));
    document.querySelectorAll('[data-who]').forEach((b) => b.addEventListener('click', () => setOpt('who', b.dataset.who)));
    document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => setOpt('level', b.dataset.level)));
    $('startBtn').addEventListener('click', play);
    $('pauseBtn').addEventListener('click', pause);
    $('resumeBtn').addEventListener('click', resume);
    $('quitBtn').addEventListener('click', showTitle);
    $('againBtn').addEventListener('click', play);
    $('menuBtn').addEventListener('click', showTitle);
    $('budBtn').addEventListener('click', call);
    const syncMute = () => document.querySelectorAll('.muteBtn').forEach((b) => (b.textContent = Kit.sound.isMuted() ? '🔇' : '🔊'));
    document.querySelectorAll('.muteBtn').forEach((b) => b.addEventListener('click', () => { Kit.sound.init(); Kit.sound.toggleMute(); syncMute(); }));
    Kit.sound.onMute(syncMute);
    syncMute();

    addEventListener('pointerdown', (e) => {
      Kit.sound.init();
      if (e.pointerType === 'touch' && !document.body.classList.contains('touch')) {
        document.body.classList.add('touch');
        fit();
      }
    }, true);
    if (matchMedia('(hover: none) and (pointer: coarse)').matches || /[?&]touch=1/.test(location.search)) document.body.classList.add('touch');

    addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      Kit.sound.init();
      const c = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
      if (c === 'KeyM' && !e.repeat) { Kit.sound.toggleMute(); syncMute(); return; }
      if (G.screen === 'title') {
        if (e.repeat) return;
        if (c === 'Digit1') setOpt('players', 1);
        else if (c === 'Digit2') setOpt('players', 2);
        else if (c === 'KeyE') setOpt('level', 'easy');
        else if (c === 'KeyN') setOpt('level', 'normal');
        else if ((c === 'KeyC' || c === 'ArrowLeft' || c === 'ArrowRight') && G.players === 1) setOpt('who', G.who === 'teddy' ? 'tommy' : 'teddy');
        else if (c === 'Enter' || c === 'Space') play();
        return;
      }
      if (G.screen === 'results') {
        if (e.repeat) return;
        if (c === 'Enter' || c === 'Space') play();
        else if (c === 'Escape' || c === 'KeyQ') showTitle();
        return;
      }
      if (G.paused) {
        if (e.repeat) return;
        if (c === 'KeyP' || c === 'Escape' || c === 'Space' || c === 'Enter') resume();
        else if (c === 'KeyQ') showTitle();
        return;
      }
      if (G.screen === 'play') {
        if ((c === 'KeyP' || c === 'Escape') && !e.repeat) return pause();
        if ((c === 'KeyT' || c === 'Enter' || c === 'NumpadEnter') && !e.repeat) { call(); return; }
        if (SUPER.includes(c)) { if (!e.repeat) G.superPress = true; return; }
        if (FIRE.includes(c) && !e.repeat) G.firePress = true;
        if (LR[c] && !e.repeat) G.taps.lr = LR[c];
        G.keys[c] = true;
      }
    });
    addEventListener('keyup', (e) => { G.keys[e.code] = false; });
    addEventListener('blur', () => { G.keys = {}; G.touch = { l: 0, r: 0, z: 0 }; G.finger = null; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.autoPause && G.screen === 'play' && !G.paused) pause();
      if (document.hidden) Kit.sound.suspend();
      else Kit.sound.resume();
    });

    // touch buttons: ◀ ▶, ZAP (hold), SUPER, and the brother's face
    const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (err) { /* a test's pointer: fine */ } };
    document.querySelectorAll('#touch [data-a]').forEach((b) => {
      const a = b.dataset.a;
      const on = (v) => {
        b.classList.toggle('down', v);
        if (a === 'call') { if (v) call(); return; }
        if (a === 'super') { if (v) G.superPress = true; return; }
        if (a === 'z') { G.touch.z = v ? 1 : 0; if (v) G.firePress = true; return; }
        G.touch[a] = v ? 1 : 0;
        if (v) G.taps.lr = a === 'r' ? 1 : -1;
      };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); capture(b, e); on(true); });
      b.addEventListener('pointerup', () => on(false));
      b.addEventListener('pointercancel', () => on(false));
      b.addEventListener('lostpointercapture', () => on(false));
    });
    // a finger (or the mouse) on the tube: the zapper walks to that lane and zaps
    const cv = $('game');
    cv.addEventListener('pointerdown', (e) => {
      if (G.screen !== 'play' || G.paused) return;
      e.preventDefault();
      capture(cv, e);
      G.finger = { id: e.pointerId, x: e.clientX, y: e.clientY };
      G.firePress = true;
    });
    cv.addEventListener('pointermove', (e) => { if (G.finger && G.finger.id === e.pointerId) { G.finger.x = e.clientX; G.finger.y = e.clientY; } });
    const lift = (e) => { if (G.finger && G.finger.id === e.pointerId) G.finger = null; };
    cv.addEventListener('pointerup', lift);
    cv.addEventListener('pointercancel', lift);
    cv.addEventListener('lostpointercapture', lift);
  }

  // ---------- each frame ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000));
    last = now;
    if (!G.hold) advance(dt);
    draw();
  }
  function advance(dt) {
    G.time += dt;
    G.frame++;
    const w = G.w;
    if (!w) return;
    const frozen = G.paused || G.screen === 'pause';
    if (!frozen) {
      G.acc = Math.min(G.acc + dt, 0.25);
      while (G.acc >= DT - 1e-9) {
        G.acc -= DT;
        tick();
      }
      visuals(dt);
    }
  }
  function tick() {
    const w = G.w;
    let inp;
    if (G.demo) inp = TZ.bot.decide(w);
    else if (G.screen === 'play') inp = readInput();
    else inp = null;
    S.step(w, inp);
    handleEvents(w.events);
    if (G.demo) {
      if (w.phase === 'over' || w.t > 300) { G.w = newWorld(true); G.vis = G.w.zap.lane; }
    } else if (w.phase === 'over' && G.screen === 'play') {
      G.overT += DT;
      if (G.overT > 2.4) showResults();
    }
  }

  // ---------- what the rules said happened ----------
  function critterPos(c, out) {
    const sh = S.shapeNow(G.w);
    return SH.at(sh, c.lane, c.d, out);
  }
  function handleEvents(evs) {
    const w = G.w;
    const loud = !G.demo;
    const snd = (f, ...a) => { if (loud) f(...a); };
    const sh = w.shape;
    for (const e of evs) {
      switch (e.type) {
        case 'move': snd(SFX.move); break;
        case 'edge': snd(SFX.edge); break;
        case 'zap': snd(SFX.zap); G.zapK = 1; break;
        case 'fizz': if (Math.random() < 0.3) snd(SFX.fizz); break;
        case 'pop': {
          const p = SH.at(sh, e.lane, e.d);
          const s = laneScale(sh, e.lane, e.d);
          sparkles.burst(p[0], p[1], p[2] + 0.3, 6, s * 0.9);
          confetti.burst(p[0], p[1], p[2] + 0.3, e.how === 'zap' ? 10 : 6, 2.5 * s, null, 0);
          if (e.how === 'zap') { snd(SFX.pop, e.kind === 'splitter'); popAt(p, `+${e.pts}`, e.d > 0.6 ? WORDS[e.id % WORDS.length] : null); }
          break;
        }
        case 'split': snd(SFX.split); popAt(SH.at(sh, e.lane, e.d), 'SPLIT!', null, 'cool'); break;
        case 'hop': if (Math.random() < 0.4) snd(SFX.hop); break;
        case 'spawn': snd(SFX.spawn); break;
        case 'rim': snd(SFX.rim); popAt(SH.at(sh, e.lane, 1), 'ON THE RIM!', null, 'ouch'); break;
        case 'tickle':
          snd(SFX.tickle);
          popAt(SH.at(sh, e.lane, 1), 'TEE-HEE! TICKLE!', null, 'big');
          if (w.two || e.lives > 0) toast(e.lives > 0 ? `${NAME(e.who)}: ${e.lives} ${e.lives === 1 ? 'LIFE' : 'LIVES'} LEFT` : `${NAME(e.who)} IS OUT OF LIVES`);
          break;
        case 'slide': break;
        case 'super':
          snd(SFX.superZap);
          G.waveT = 0;
          big('SUPER ZAP!', e.left ? `${e.left} MORE THIS LEVEL` : '');
          break;
        case 'noSuper': snd(SFX.noSuper); toast(w.two ? 'NO SUPER ZAPS LEFT' : `NO SUPER ZAPS LEFT · CALL ${NAME(w.buddyFor(S.P(w).who))}!`); break;
        case 'go': snd(SFX.go); big('GO!'); break;
        case 'ready': bigLevel(); break;
        case 'clear':
          snd(SFX.clear);
          big('LEVEL CLEAR!', `+${fmt(e.bonus)}`);
          confetti.rain(-6, 6, 6, 70);
          break;
        case 'turn':
          snd(SFX.turn);
          big(`${NAME(e.who)}'S TURN!`, `LEVEL ${e.lv + 1} · ${shapeName(e.lv)}`);
          break;
        case 'allClear': snd(SFX.win); toast(`${NAME(e.who)} ZAPPED ALL 8 TUBES!`); break;
        case 'buddyIn': snd(SFX.buddy); break;
        case 'treat': snd(SFX.treat); popAt(rimSpot(w.zap.lane, 1.6), `${e.e} +100`); break;
        case 'buddyZap':
          snd(SFX.superZap);
          G.waveT = 0;
          toast(`${NAME(e.who)} SAYS: SUPER ZAP!`);
          break;
        case 'buddyMore': popAt(rimSpot(w.zap.lane, 2.2), 'ONE MORE ZAP!', null, 'cool'); break;
        case 'hi5': snd(SFX.hi5); popAt(rimSpot(w.zap.lane, 2), 'HIGH FIVE! ✋ +50', null, 'big'); { const p = rimSpot(w.zap.lane, 1); confetti.burst(p[0], p[1], 0.8, 24, 3.5); } break;
        case 'extraLife': snd(SFX.life); popAt(rimSpot(w.zap.lane, 2.4), 'EXTRA LIFE!', null, 'big'); break;
        case 'out': break;
        case 'over': snd(e.won ? SFX.win : SFX.gameOver); big(e.won ? 'ALL TUBES ZAPPED!' : 'GAME OVER'); break;
      }
      if (e.type === 'level' && w.phase === 'morph') { snd(SFX.morph); big(`NEXT: ${shapeName(e.lv)}`); }
    }
  }
  const laneScale = (sh, lane, d) => Math.min(1.35 * (SH.FAR + (1 - SH.FAR) * d), SH.width(sh, lane, d) * 0.62);
  function rimSpot(lane, out) {
    const sh = S.shapeNow(G.w);
    const L = SH.lane(sh.pts, lane);
    return [L.mid[0] + L.n[0] * out, L.mid[1] + L.n[1] * out, 0.3];
  }

  // ---------- pops, toasts, big words (page text, so 中文 works by itself) ----------
  function popAt(p, text, word, cls) {
    pop(p[0], p[1], p[2], text, cls);
    if (word) pop(p[0], p[1] + 0.6, p[2], word, 'cool');
  }
  function pop(x, y, z, text, cls) {
    if (G.demo) return;
    const [sx, sy] = toScreen(x, y, z);
    const d = document.createElement('div');
    d.className = 'pop' + (cls ? ' ' + cls : '');
    d.textContent = text;
    d.style.left = Math.max(50, Math.min(innerWidth - 50, sx)) + 'px';
    d.style.top = Math.max(60, Math.min(innerHeight - 40, sy)) + 'px';
    $('pops').appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }
  function clearPops() { $('pops').innerHTML = ''; }
  let toastTimer = 0;
  function toast(text) {
    if (G.demo) return;
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  let bigTimer = 0;
  function big(text, small) {
    if (G.demo) return;
    const b = $('bigmsg');
    b.innerHTML = '';
    b.appendChild(document.createTextNode(text));
    if (small) { const s = document.createElement('small'); s.textContent = small; b.appendChild(s); }
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(bigTimer);
    bigTimer = setTimeout(() => b.classList.remove('show'), 1400);
  }
  function setText(el, s) {
    if (!el || el._t === s) return;
    el._t = s;
    el.textContent = s;
  }

  // ---------- drawing the world ----------
  function signature(who, n) {
    const sig = (Kit.roster.get(who) || {}).signature || ['wave'];
    return sig[(n || 0) % sig.length];
  }
  function visuals(dt) {
    const w = G.w;
    const k = 1 - Math.exp(-16 * dt);
    const sh = S.shapeNow(w);
    tube.set(sh, !!w.from);
    sky.update(G.time);
    if (G.scene2) G.scene2.t += dt;
    G.zapK = Math.max(0, G.zapK - dt * 6);
    // the super zap's ring of light runs down the tube
    G.waveT += dt;
    const wt = G.waveT / 0.55;
    tube.wave(sh, Math.max(0, 1 - wt), wt < 1 ? 1 - wt * 0.6 : 0);
    tube.glow(wt < 1 ? (1 - wt) * 1.2 : 0);
    const playing = !G.scene2 && w.phase !== 'over';
    // the zapper glides to its lane (round the short way)
    const target = w.zap.lane;
    if (sh.open || G.visLv !== w.lv) { if (G.visLv !== w.lv || w.from) G.vis = target; }
    let dv = target - G.vis;
    if (!sh.open) { dv = ((((dv + N / 2) % N) + N) % N) - N / 2; }
    G.vis += dv * Math.min(1, 1 - Math.exp(-32 * dt));
    if (Math.abs(target - G.vis) < 0.002 || Math.abs(dv) < 0.002) G.vis = target;
    if (!sh.open) G.vis = ((G.vis % N) + N) % N;
    G.visLv = w.lv;
    const morphing = w.phase === 'morph' || w.phase === 'turn';
    const p = S.P(w);
    const col = COLOR[p.who] || '#ffb02e';
    zapper.visible = playing;
    arrows.r.visible = arrows.l.visible = false;
    if (playing) {
      const [lane, along] = rimPlace(sh);
      const L = A.onRim(zapper, sh, lane, 0.02, null, along);
      zapper.scale.set(Math.min(1.5, L.w * 0.8), 1, 1);
      zapper.userData.color(col);
      zapper.userData.tip.material.opacity = 0.4 + G.zapK * 0.6;
      zapper.userData.body.position.z = -G.zapK * 0.08;
      tube.light(sh, morphing ? null : w.zap.lane, col, G.zapK);
      if (!morphing && !G.demo) rimArrows(sh, w.zap.lane);
    } else tube.light(sh, null);
    critters(sh, dt, k);
    shots(sh);
    riders(sh, dt, k, playing);
    buddy(sh, dt, k);
    spectators(dt, k);
    confetti.update(dt);
    sparkles.update(dt);
    const sc = G.scene2;
    if (sc && sc.kind === 'win' && Math.floor(sc.t * 2) !== Math.floor((sc.t - dt) * 2)) confetti.rain(-6, 6, 7, 30);
    hud();
  }
  // where the gliding zapper is drawn: a lane and how far along its rim (G.vis is a lane number; .5 past it is its middle)
  function rimPlace(sh) {
    const f = G.vis + 0.5, fl = Math.floor(f);
    return [sh.open ? Math.min(N - 1, fl) : ((fl % N) + N) % N, f - fl];
  }
  // the arrows beside the zapper: → toward the next lane clockwise, ← toward the next lane counter-clockwise
  function rimArrows(sh, lane) {
    const touch = document.body.classList.contains('touch');
    for (const [key, dir] of [['r', 1], ['l', -1]]) {
      const a = arrows[key];
      const to = SH.step(sh, lane, dir);
      if (to === lane) { a.visible = false; continue; }
      a.visible = true;
      const L0 = SH.lane(sh.pts, lane), L1 = SH.lane(sh.pts, to);
      const out = 0.5;
      const px = L1.mid[0] + L1.n[0] * out, py = L1.mid[1] + L1.n[1] * out;
      a.position.set(px, py, 0.25);
      a.userData.point.rotation.set(0, 0, Math.atan2(L1.mid[1] - L0.mid[1], L1.mid[0] - L0.mid[0]));
      const s = Math.min(1.1, Math.max(0.7, L1.w * 0.5));
      a.userData.point.scale.setScalar(s);
      a.userData.cap.position.set(L1.n[0] * 0.75, L1.n[1] * 0.75, 0.3);
      const want = touch ? a.userData.texs.touch : a.userData.texs.key;
      if (a.userData.cap.material.map !== want) { a.userData.cap.material.map = want; a.userData.cap.material.needsUpdate = true; }
      a.userData.cap.material.opacity = 0.9;
    }
  }

  function meshFor(key, kind) {
    let m = live.get(key);
    if (!m) {
      m = pools[kind].pop() || (kind === 'shot' ? A.shot() : A.critter(kind));
      m.userData.pool = kind;
      if (!m.parent) scene.add(m);
      m.visible = true;
      m.userData.seen = 0;
      m.userData.vl = null;
      live.set(key, m);
    }
    m.userData.seen = G.frame;
    return m;
  }
  function sweep(prefix) {
    for (const [key, m] of live) {
      if (key[0] !== prefix || m.userData.seen === G.frame) continue;
      m.visible = false;
      live.delete(key);
      pools[m.userData.pool].push(m);
    }
  }
  const pa = [0, 0, 0], pb = [0, 0, 0];
  function critters(sh, dt, k) {
    const w = G.w;
    for (const c of w.critters) {
      const m = meshFor('c' + c.id, c.kind);
      const u = m.userData;
      const t = G.time * 6 + c.id;
      // where it is: in its lane at depth d; mid-hop, an arc from one lane to the next; walking the rim, a glide
      let lane = c.lane, d = c.d, lift = 0;
      if (c.hop) {
        const e = Math.min(1, c.hop.t / S.HOP_T);
        SH.at(sh, c.hop.from, d, pa);
        SH.at(sh, c.hop.to, d, pb);
        for (let i = 0; i < 3; i++) pa[i] += (pb[i] - pa[i]) * e;
        lift = Math.sin(e * PI) * 0.6;
        u.vl = null;
      } else {
        if (c.st === 'rim') {
          if (u.vl == null) u.vl = lane;
          let dv = lane - u.vl;
          if (!sh.open) dv = ((((dv + N / 2) % N) + N) % N) - N / 2;
          u.vl += dv * Math.min(1, k * 1.2);
          if (Math.abs(dv) < 0.01) u.vl = lane;
          const lo = Math.floor(u.vl), e = u.vl - lo;
          const l0 = sh.open ? Math.max(0, Math.min(N - 1, lo)) : ((lo % N) + N) % N;
          const l1 = sh.open ? Math.max(0, Math.min(N - 1, lo + 1)) : (((lo + 1) % N) + N) % N;
          SH.at(sh, l0, 1, pa);
          SH.at(sh, l1, 1, pb);
          for (let i = 0; i < 3; i++) pa[i] += (pb[i] - pa[i]) * e;
          lift = Math.abs(Math.sin(e * PI)) * 0.4;
        } else { SH.at(sh, lane, d, pa); u.vl = null; }
      }
      const s = laneScale(sh, lane, d) * u.size;
      // it sits on the lane's inside: nudged toward the tube's middle by about its own size
      const L = SH.lane(sh.pts, lane);
      const inward = s * 0.42 + lift * s;
      m.position.set(pa[0] - L.n[0] * inward, pa[1] - L.n[1] * inward, pa[2] + (c.st === 'rim' ? 0.35 : 0.1));
      const wob = Math.sin(t * 1.3) * 0.08;
      const born = Math.min(1, (w.t - c.born) * 3);
      m.scale.set(s * (1 + wob) * born, s * (1 - wob) * born, s * born);
      m.rotation.set(0, 0, Math.sin(t * 0.7) * 0.15);
      // looking at the zapper, and fidgety when it's on the rim
      const ey = c.st === 'rim' ? Math.sin(G.time * 18) * 0.03 : 0;
      for (const e of u.eyes) { e.position.x = Math.sin(t * 0.5) * 0.02; e.position.y = ey; }
    }
    sweep('c');
  }
  function shots(sh) {
    const w = G.w;
    for (const s of w.shots) {
      const m = meshFor('s' + s.id, 'shot');
      SH.at(sh, s.lane, s.d, pa);
      m.position.set(pa[0], pa[1], pa[2] + 0.2);
      const sc = laneScale(sh, s.lane, s.d);
      m.scale.setScalar(sc * 0.8);
      m.userData.core.rotation.set(G.time * 9, G.time * 7, 0);
    }
    sweep('s');
  }

  // ---------- the brothers ----------
  function hideProps(id) { for (const kk of ['ball', 'peace', 'glove']) props[id][kk].visible = false; }
  function sigProps(id, mode) {
    const P = people[id], o = props[id];
    P.holder.updateMatrixWorld(true);
    if (mode === 'jumpshot') {
      o.ball.visible = true;
      Kit.people.handWorld(P, 1, v3);
      o.ball.position.set(v3.x, v3.y + 0.15 + Math.max(0, Math.sin(G.time * 4)) * 0.5, v3.z + 0.2);
    } else if (mode === 'peace') {
      o.peace.visible = true;
      P.head.getWorldPosition(v3);
      o.peace.position.set(v3.x + 0.3, v3.y + 0.2 + Math.sin(G.time * 5) * 0.05, v3.z + 0.3);
    } else if (mode === 'boxing') {
      o.glove.visible = true;
      Kit.people.handWorld(P, Math.sin(G.time * 8) > 0 ? 1 : -1, v3);
      o.glove.position.set(v3.x, v3.y, v3.z + 0.2);
    }
  }
  function riders(sh, dt, k, playing) {
    const w = G.w, sc = G.scene2;
    for (const id of ['teddy', 'tommy']) { hideProps(id); people[id].holder.visible = false; }
    if (sc && sc.kind === 'win') return winPose(dt, k);
    if (!playing) return;
    const p = S.P(w);
    const P = people[p.who];
    P.holder.visible = true;
    // he rides on top of the zapper, on the outside of the rim, looking down the tube
    const [lane, along] = rimPlace(sh);
    A.onRim(P.holder, sh, lane, 0.12, RIDER, along);
    const celebrate = w.phase === 'clear';
    let mode = 'grab', ph = G.time * 8, ry = 0.5;
    if (G.zapK > 0.5) mode = 'give';
    if (w.zap.giggle > 0) { mode = 'fall'; ry = Math.sin(G.time * 30) * 0.5 + 0.5; }
    if (w.phase === 'morph' || w.phase === 'turn' || w.phase === 'ready') mode = 'stand';
    if (celebrate) { mode = signature(p.who, w.lv); ry = PI; }
    if (w.buddy && w.buddy.kind === 'hi5' && w.buddy.t < 0.8) { mode = 'give'; ry = -0.9; }
    P.root.rotation.y += (ry - P.root.rotation.y) * Math.min(1, k * 1.4);
    P.root.position.set(0, w.zap.giggle > 0 ? Math.abs(Math.sin(G.time * 22)) * 0.3 : celebrate ? Math.abs(Math.sin(G.time * 5)) * 0.5 : 0, 0);
    Kit.people.pose(P, ph, mode, k);
    P.rig.position.y = 0;
    if (celebrate) sigProps(p.who, mode);
    // flashing while nothing can tickle him
    P.root.visible = !(w.zap.inv > 0 && w.zap.giggle <= 0 && Math.floor(G.time * 12) % 2 === 0 && !w.buddy);
  }
  function winPose(dt, k) {
    const ids = G.scene2.who;
    ids.forEach((id, i) => {
      const P = people[id];
      P.holder.visible = true;
      P.root.visible = true;
      P.holder.position.set(ids.length === 2 ? (i ? 2.2 : -0.6) : 0, -3.2, 3);
      P.holder.rotation.set(0, 0, 0);
      P.holder.scale.setScalar(i ? 0.9 : 1.1);
      P.root.rotation.y = PI + (i ? -0.3 : 0);
      P.root.position.set(0, i ? 0 : Math.abs(Math.sin(G.time * 4)) * 0.4, 0);
      const mode = i ? 'wave' : signature(id, Math.floor(G.scene2.t / 2.5));
      Kit.people.pose(P, G.time * 8, mode, k);
      P.rig.position.y = 0;
      if (!i) sigProps(id, mode);
    });
  }
  function buddy(sh, dt, k) {
    const w = G.w, bd = w.buddy;
    treat.visible = false;
    if (!bd || (G.scene2 && G.scene2.kind === 'win')) return;
    const id = bd.kind === 'hi5' ? w.players[1 - w.cur].who : bd.who;
    const B = people[id];
    const r = Kit.roster.get(id) || {};
    const t = bd.t;
    // he pops in on the rim two lanes along (the lane beside the zapper has the rim arrow)
    let side = SH.step(sh, SH.step(sh, w.zap.lane, 1), 1);
    if (SH.apart(sh, side, w.zap.lane) < 2) side = SH.step(sh, SH.step(sh, w.zap.lane, -1), -1);
    const end = bd.kind === 'hi5' ? 1.0 : S.B_END;
    const grow = Math.min(1, t * 5) * (t > end - 0.25 ? Math.max(0.01, (end - t) / 0.25) : 1);
    B.holder.visible = true;
    B.root.visible = true;
    A.onRim(B.holder, sh, side, 0.12, RIDER * (r.buddyScale || 0.8) * grow);
    let mode, ry = PI, y = 0;
    if (bd.kind === 'hi5') { mode = 'give'; ry = 0.9; }
    else if (t < 0.6 && bd.n === 0) mode = signature(id, w.calls);
    else if (t < S.B_ZAP + 0.25) { mode = 'jumpshot'; y = Math.sin(Math.min(1, (t - 0.6) / 0.65) * PI) * 1.2; ry = 0.3; }
    else mode = 'wave';
    B.root.rotation.y = ry;
    B.root.position.set(0, y, 0);
    Kit.people.pose(B, G.time * 8, mode, k);
    B.rig.position.y = 0;
    if (mode === 'peace' || mode === 'jumpshot' || mode === 'boxing') sigProps(id, mode);
    if (bd.kind === 'zap' && t >= 0.55 && t < 0.9 && bd.n === 0) {
      const u = (t - 0.55) / 0.35;
      const a = rimSpot(side, 0.9), b = rimSpot(w.zap.lane, 0.7);
      treat.visible = true;
      A.setEmoji(treat, bd.treat);
      treat.position.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * PI) * 0.9, 0.9);
    }
  }
  function spectators(dt, k) {
    const w = G.w, V = G.view;
    if (!V) return;
    const happy = w.phase === 'clear' || (G.scene2 && G.scene2.kind === 'win') || G.waveT < 0.8;
    const waiting = w.two && !G.scene2 && !(w.buddy && w.buddy.kind === 'hi5') ? w.players[1 - w.cur] : null;
    const spots = [['foxy', V.x0 + 1.3, 0], ['froggy', V.x1 - 1.3, 1]];
    if (waiting && !waiting.out) spots.push([waiting.who, V.x0 + 2.6, 2]);
    for (const [id, x, i] of spots) {
      const P = people[id];
      if (G.scene2 && (id === 'teddy' || id === 'tommy')) continue;
      P.holder.visible = true;
      P.root.visible = true;
      P.holder.position.set(x, V.y0 + 0.9 + (happy ? Math.abs(Math.sin(G.time * 7 + i)) * 0.25 : 0), 1.5);
      P.holder.rotation.set(0, 0, 0);
      P.holder.scale.setScalar(0.55);
      P.root.position.set(0, 0, 0);
      P.root.rotation.y = PI + (x < 0 ? -0.4 : 0.4);
      Kit.people.pose(P, G.time * 7, happy ? 'wave' : 'stand', k);
      P.rig.position.y = 0;
    }
  }

  // ---------- HUD ----------
  function hud() {
    const w = G.w;
    if (!w || G.demo) return;
    const top = store.table(w.level)[0].score;
    for (let i = 0; i < 2; i++) {
      const box = $('hudP' + i);
      const pl = w.players[i];
      box.style.display = pl ? '' : 'none';
      if (!pl) continue;
      setText(box.querySelector('.lbl'), NAME(pl.who));
      setText(box.querySelector('.sc'), fmt(pl.score));
      setText(box.querySelector('.lives'), pl.out ? '—' : pl.lives > 6 ? `❤️ ×${pl.lives}` : '❤️'.repeat(Math.max(0, pl.lives)));
      box.classList.toggle('on', w.two && i === w.cur);
    }
    setText($('hudHi'), fmt(Math.max(top, ...w.players.map((p) => p.score))));
    setText($('hudStage'), levelLine());
    const sup = S.P(w).supers;
    setText($('hudSuper'), sup ? '💫'.repeat(sup) : '—');
    setText(document.querySelector('.tb.super small'), `SUPER ×${sup}`);
    document.querySelector('.tb.super').classList.toggle('empty', !sup);
    const on = !!w.buddy;
    $('budBtn').classList.toggle('on', on);
    document.querySelector('.tb.call').classList.toggle('on', on);
  }

  function draw() {
    renderer.render(scene, cam);
  }

  // ---------- test hooks ----------
  function zapperScreen() {
    zapper.updateMatrixWorld(true);
    zapper.getWorldPosition(v3);
    return toScreen(v3.x, v3.y, v3.z);
  }
  function arrowScreen(key) {
    const a = arrows[key];
    if (!a.visible) return null;
    a.updateMatrixWorld(true);
    const base = new T.Vector3(-0.4, 0, 0), tip = new T.Vector3(0.4, 0, 0);
    a.userData.point.localToWorld(base);
    a.userData.point.localToWorld(tip);
    const [bx, by] = toScreen(base.x, base.y, base.z), [tx, ty] = toScreen(tip.x, tip.y, tip.z);
    return { x: Math.round((bx + tx) / 2), y: Math.round((by + ty) / 2), dx: tx - bx, dy: ty - by };
  }
  function state() {
    const w = G.w;
    if (!w) return { screen: G.screen };
    const [zx, zy] = zapperScreen();
    const [cx, cy] = toScreen(0, 0, 0);
    return {
      screen: G.screen, paused: G.paused, demo: G.demo, phase: w.phase, lv: w.lv, shape: w.shape.id, level: w.level, two: w.two, cur: w.cur,
      lane: w.zap.lane, zx: Math.round(zx * 10) / 10, zy: Math.round(zy * 10) / 10, center: [Math.round(cx), Math.round(cy)], arrowR: arrowScreen('r'), arrowL: arrowScreen('l'),
      players: w.players.map((p) => ({ who: p.who, score: p.score, lives: p.lives, lv: p.lv, supers: p.supers, out: p.out, done: p.done })),
      critters: w.critters.map((c) => ({ id: c.id, kind: c.kind, lane: c.lane, d: +c.d.toFixed(3), st: c.st })), shots: w.shots.length, queue: w.queue.length,
      inv: +w.zap.inv.toFixed(2), giggle: +w.zap.giggle.toFixed(2),
      buddy: w.buddy && { kind: w.buddy.kind, who: w.buddy.who, t: +w.buddy.t.toFixed(2) },
      muted: Kit.sound.isMuted(), sfx: Object.assign({}, SFX.log), lang: Kit.lang.get(), touch: document.body.classList.contains('touch'),
    };
  }
  window.game = {
    start(o) {
      o = o || {};
      if (o.players) G.players = o.players;
      if (o.who) G.who = o.who;
      if (o.level) G.level = o.level;
      play();
      if (o.lv != null) { for (const p of G.w.players) p.lv = o.lv; S.loadLevel(G.w); G.w.events = []; G.vis = G.w.zap.lane; bigLevel(); }
      if (o.go) { G.w.phase = 'play'; G.w.phaseT = 0; }
      return state();
    },
    step(secs, o) {
      const n = Math.max(1, Math.round((secs || DT) / DT));
      for (let i = 0; i < n; i++) advance(DT);
      if (!o || o.draw !== false) draw();
      return state();
    },
    state,
    hold(v) { G.hold = v !== false; return G.hold; },
    call,
    pause, resume, showTitle, showResults,
    check: (only) => TZ.check.run(only),
    checkFail: () => TZ.check.fail(),
    // no critters and none to come (tests that only look at moving); the level stays on
    quiet() { G.w.critters = []; G.w.shots = []; G.w.queue = ['jelly']; G.w.noSpawn = true; return state(); },
    critter(kind, lane, d) { return S.addCritter(G.w, kind, lane, d || 0); },
    lane(n) { G.w.zap.lane = n; G.vis = n; return state(); },
    sabotage(s) { G.sab = s || null; G.stuckLatch = false; return G.sab; },
    laneAt,
    toScreen,
    world: () => G.w,
    G,
    info() { draw(); const r = renderer.info.render; let meshes = 0; scene.traverseVisible((ob) => { if (ob.isMesh || ob.isSprite) meshes++; }); return { calls: r.calls, triangles: r.triangles, meshes, pixelRatio: renderer.getPixelRatio() }; },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
