/* TT Tube Zapper: the 3D things. A glowing toy tube of 16 candy-striped lanes with a chunky beaded rim, the zapper (a
   claw in the player's colour) with the brother riding it, the rim arrows that show where ← and → go, jelly critters
   with googly eyes (plain, hoppers with springy antennae, peanut-shaped splitters and their small halves), zaps,
   sparkles and confetti, a twilight sky with toy planets. All made in code; no image files. */
(function () {
  'use strict';
  const T = THREE, G = Kit.gfx, SH = TZ.shapes;
  const A = (TZ.art = {});
  const UP = new T.Vector3(0, 1, 0);
  const v1 = new T.Vector3(), v2 = new T.Vector3(), q1 = new T.Quaternion(), m4 = new T.Matrix4(), sc = new T.Vector3();

  // ---------- the sky: a twilight gradient, twinkly stars and a few toy planets ----------
  A.backdrop = function (scene) {
    const [cv, g] = G.makeCanvas(16, 512);
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#2a1b6e');
    gr.addColorStop(0.55, '#5a3cb8');
    gr.addColorStop(1, '#c86cc8');
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 512);
    scene.background = G.toTexture(cv);
    const n = 160, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 30;
      pos.set([Math.cos(a) * r, Math.sin(a) * r * 0.7, -30 - Math.random() * 20], i * 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const stars = new T.Points(geo, new T.PointsMaterial({ map: G.dotTexture(), size: 0.9, color: '#fff6c8', transparent: true, depthWrite: false, opacity: 0.9 }));
    scene.add(stars);
    const planets = [];
    [[-15, 9, -34, 2.6, '#ffb35e', '#ffe45e'], [17, -9, -38, 3.2, '#5ee0ff', '#ff9ad0'], [19, 11, -44, 1.8, '#8dff5a', null], [-18, -11, -40, 2.2, '#ff7ad8', '#7ff3ff']].forEach(([x, y, z, r, c, ring]) => {
      const p = new T.Group();
      p.position.set(x, y, z);
      G.mesh(new T.SphereGeometry(r, 24, 16), G.std(c, { roughness: 0.5, emissive: new T.Color(c).multiplyScalar(0.25) }), 0, 0, 0, p, false);
      if (ring) {
        const rg = new T.Mesh(new T.TorusGeometry(r * 1.6, r * 0.12, 6, 40), G.std(ring, { roughness: 0.4, emissive: new T.Color(ring).multiplyScalar(0.3) }));
        rg.rotation.x = 1.2;
        rg.scale.z = 0.4;
        p.add(rg);
      }
      // a sleepy smile on the big ones
      if (r > 2) {
        const face = new T.Group();
        face.position.set(0, 0, r * 0.98);
        p.add(face);
        const ink = G.std('#3a2050', { roughness: 0.6 });
        for (const sx of [-1, 1]) G.mesh(new T.TorusGeometry(r * 0.12, r * 0.025, 6, 12, Math.PI), ink, sx * r * 0.28, r * 0.15, 0, face, false).rotation.z = Math.PI;
        G.mesh(new T.TorusGeometry(r * 0.22, r * 0.03, 6, 14, Math.PI), ink, 0, -r * 0.12, 0, face, false).rotation.z = Math.PI;
      }
      scene.add(p);
      planets.push(p);
    });
    return {
      update(t) {
        stars.material.opacity = 0.75 + Math.sin(t * 2) * 0.15;
        planets.forEach((p, i) => { p.rotation.y = Math.sin(t * 0.3 + i) * 0.4; p.position.y += Math.sin(t * 0.8 + i) * 0.002; });
      },
    };
  };

  // ---------- cylinders between two points (the tube's edges), as instances ----------
  function rods(n, r, mat) {
    const im = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 8, 1), mat, n);
    im.frustumCulled = false;
    im.userData.r = r;
    return im;
  }
  function rod(im, i, a, b, r) {
    v1.set(a[0], a[1], a[2]);
    v2.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = v2.length() || 1e-4;
    q1.setFromUnitVectors(UP, v2.multiplyScalar(1 / len));
    v1.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    sc.set(r, len, r);
    m4.compose(v1, q1, sc);
    im.setMatrixAt(i, m4);
  }

  // ---------- the tube: lanes, edges, the beaded rim, the zapper's lane lit up ----------
  A.tube = function (scene) {
    const N = SH.N;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(N * 6 * 3), col = new Float32Array(N * 6 * 3);
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const lanes = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.55, metalness: 0.05, emissive: '#1a1030' }));
    lanes.frustumCulled = false;
    scene.add(lanes);
    // the lit lane
    const hgeo = new T.BufferGeometry();
    const hpos = new Float32Array(6 * 3);
    hgeo.setAttribute('position', new T.BufferAttribute(hpos, 3));
    const hmat = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const hi = new T.Mesh(hgeo, hmat);
    hi.frustumCulled = false;
    hi.renderOrder = 2;
    scene.add(hi);
    const edgeMat = new T.MeshStandardMaterial({ color: '#7ff3ff', emissive: '#7ff3ff', emissiveIntensity: 0.55, roughness: 0.35 });
    const rimMat = new T.MeshStandardMaterial({ color: '#7ff3ff', emissive: '#7ff3ff', emissiveIntensity: 0.35, roughness: 0.3 });
    const dividers = rods(N + 1, 0.045, edgeMat), far = rods(N, 0.04, edgeMat), rim = rods(N, 0.15, rimMat);
    const beads = new T.InstancedMesh(new T.SphereGeometry(1, 12, 8), new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.25 }), N + 1);
    beads.frustumCulled = false;
    for (const m of [dividers, far, rim, beads]) scene.add(m);
    // the super zap's ring of light running down the tube
    const ringMat = new T.MeshBasicMaterial({ color: '#fff6a8', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
    const ring = rods(N, 0.22, ringMat);
    ring.renderOrder = 3;
    scene.add(ring);
    const cA = new T.Color(), cB = new T.Color(), cF = new T.Color();
    let cur = null, curCols = '';
    let P3sh = null;
    const P3 = (pts, i, d) => SH.point(P3sh, i, d);
    function shape(sh) {
      P3sh = sh;
      const pts = sh.pts;
      const cols = sh.cols.join() + sh.edge;
      for (let i = 0; i < N; i++) {
        const a1 = P3(pts, i, 1), b1 = P3(pts, i + 1, 1), a0 = P3(pts, i, 0), b0 = P3(pts, i + 1, 0);
        pos.set([...a1, ...b1, ...b0, ...a1, ...b0, ...a0], i * 18);
        if (cols !== curCols) {
          cA.set(sh.cols[i % 2]);
          cF.copy(cA).multiplyScalar(0.35);
          for (let k = 0; k < 6; k++) { const c = k === 2 || k === 4 || k === 5 ? cF : cA; col.set([c.r, c.g, c.b], i * 18 + k * 3); }
        }
        rod(rim, i, a1, b1, 0.15);
        rod(far, i, a0, b0, 0.04);
      }
      const ends = sh.open ? N + 1 : N;
      for (let i = 0; i <= N; i++) {
        if (i < ends) rod(dividers, i, P3(pts, i, 1), P3(pts, i, 0), 0.045);
        else { m4.makeScale(0, 0, 0); dividers.setMatrixAt(i, m4); }
        const b = P3(pts, i, 1);
        const r = i < ends ? 0.24 : 0;
        m4.compose(v1.set(b[0], b[1], b[2]), q1.identity(), sc.set(r, r, r));
        beads.setMatrixAt(i, m4);
      }
      geo.attributes.position.needsUpdate = true;
      if (cols !== curCols) {
        geo.attributes.color.needsUpdate = true;
        cB.set(sh.edge);
        edgeMat.color.copy(cB);
        edgeMat.emissive.copy(cB);
        rimMat.color.copy(cB);
        rimMat.emissive.copy(cB);
        curCols = cols;
      }
      geo.computeVertexNormals();
      for (const m of [dividers, far, rim, beads]) m.instanceMatrix.needsUpdate = true;
      cur = sh;
    }
    return {
      set(sh, force) { if (force || sh !== cur) shape(sh); },
      // the zapper's lane glows in his colour, brighter while zapping
      light(sh, lane, color, k) {
        if (lane == null) { hi.visible = false; return; }
        hi.visible = true;
        P3sh = sh;
        const a1 = P3(sh.pts, lane, 1), b1 = P3(sh.pts, lane + 1, 1), a0 = P3(sh.pts, lane, 0), b0 = P3(sh.pts, lane + 1, 0);
        hpos.set([...a1, ...b1, ...b0, ...a1, ...b0, ...a0]);
        hgeo.attributes.position.needsUpdate = true;
        hmat.color.set(color);
        hmat.opacity = 0.22 + 0.25 * k;
      },
      // the super zap's ring at depth d (1 = the rim), fading with a
      wave(sh, d, a) {
        ringMat.opacity = a;
        ring.visible = a > 0.01;
        if (!ring.visible) return;
        P3sh = sh;
        for (let i = 0; i < N; i++) rod(ring, i, P3(sh.pts, i, d), P3(sh.pts, i + 1, d), 0.22 * (0.4 + 0.6 * d));
        ring.instanceMatrix.needsUpdate = true;
      },
      glow(k) { edgeMat.emissiveIntensity = 0.55 + k; rimMat.emissiveIntensity = 0.35 + k * 0.8; },
    };
  };

  // ---------- the zapper: a glowing claw on the rim, in the player's colour ----------
  A.zapper = function () {
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    const mat = G.std('#ffb02e', { roughness: 0.3, emissive: new T.Color('#ffb02e').multiplyScalar(0.45) });
    const dark = G.std('#2a1b6e', { roughness: 0.5 });
    // across the lane: a chunky bar; two prongs reaching into the tube; a nozzle in the middle
    G.mesh(new T.BoxGeometry(1, 0.22, 0.34), mat, 0, 0.12, 0, body);
    for (const sx of [-1, 1]) {
      const pr = G.mesh(new T.BoxGeometry(0.14, 0.14, 0.62), mat, sx * 0.46, -0.04, -0.26, body);
      pr.rotation.y = sx * 0.12;
      G.mesh(new T.SphereGeometry(0.11, 10, 8), mat, sx * 0.5, -0.04, -0.58, body);
    }
    const noz = G.mesh(new T.CylinderGeometry(0.1, 0.15, 0.4, 10), dark, 0, 0.02, -0.25, body);
    noz.rotation.x = Math.PI / 2;
    const tip = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: '#fff6a8', transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    tip.position.set(0, 0.02, -0.5);
    tip.scale.set(0.5, 0.5, 1);
    body.add(tip);
    g.userData = { mat, tip, body };
    g.userData.color = (c) => { mat.color.set(c); mat.emissive.set(c).multiplyScalar(0.45); };
    return g;
  };
  // put something on the rim at lane i of shape sh: x along the lane's rim, up = out of the tube; u = 0..1 along the rim
  A.onRim = function (obj, sh, lane, out, scale, along) {
    const L = SH.lane(sh.pts, lane);
    const u = along == null ? 0.5 : along;
    const x = L.a[0] + (L.b[0] - L.a[0]) * u, y = L.a[1] + (L.b[1] - L.a[1]) * u;
    obj.position.set(x + L.n[0] * out, y + L.n[1] * out, 0.05);
    obj.rotation.set(0, 0, Math.atan2(L.n[1], L.n[0]) - Math.PI / 2);
    if (scale != null) obj.scale.setScalar(scale);
    return L;
  };

  // ---------- the rim arrows: which way ← and → go from here ----------
  function keyTex(label, color) {
    const [c, g] = G.makeCanvas(128, 128);
    g.fillStyle = 'rgba(20,18,31,0.85)';
    G.roundRect(g, 8, 8, 112, 112, 26);
    g.fill();
    g.lineWidth = 7;
    g.strokeStyle = color;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = 'bold 76px system-ui, -apple-system, "Segoe UI Symbol", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 64, 70);
    return G.toTexture(c);
  }
  A.arrow = function (label, color) {
    const g = new T.Group();
    const shp = new T.Shape();
    shp.moveTo(0.5, 0); shp.lineTo(-0.1, 0.34); shp.lineTo(-0.1, 0.14); shp.lineTo(-0.5, 0.14); shp.lineTo(-0.5, -0.14); shp.lineTo(-0.1, -0.14); shp.lineTo(-0.1, -0.34); shp.closePath();
    const mat = G.std(color, { roughness: 0.3, emissive: new T.Color(color).multiplyScalar(0.6) });
    const m = new T.Mesh(new T.ExtrudeGeometry(shp, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }), mat);
    m.position.z = -0.06;
    const point = new T.Group(); // turned to point along the rim
    point.add(m);
    g.add(point);
    const texs = { key: keyTex(label, color), touch: keyTex(label === '→' ? '▶' : '◀', color) };
    const cap = new T.Sprite(new T.SpriteMaterial({ map: texs.key, depthTest: false, transparent: true }));
    cap.scale.set(0.62, 0.62, 1);
    cap.renderOrder = 6;
    g.add(cap);
    g.userData = { point, cap, texs, mat };
    return g;
  };

  // ---------- jelly critters ----------
  const KIND = {
    jelly: { color: '#ff5fa8', size: 1 },
    hopper: { color: '#7dea4a', size: 1 },
    splitter: { color: '#ffa02e', size: 1.25 },
    small: { color: '#ffe14a', size: 0.7 },
  };
  A.KIND = KIND;
  function face(parent, x, y, z, r, smile) {
    const white = G.std('#ffffff', { roughness: 0.2 }), ink = G.std('#1c1430', { roughness: 0.3 });
    const eyes = [];
    for (const sx of [-1, 1]) {
      const e = G.mesh(new T.SphereGeometry(r, 12, 10), white, x + sx * r * 1.25, y, z, parent, false);
      const p = G.mesh(new T.SphereGeometry(r * 0.5, 10, 8), ink, 0, 0, r * 0.72, e, false);
      eyes.push(p);
    }
    if (smile) {
      const m = G.mesh(new T.TorusGeometry(r * 0.9, r * 0.2, 6, 14, Math.PI), ink, x, y - r * 1.25, z + r * 0.1, parent, false);
      m.rotation.z = Math.PI;
      const pink = G.std('#ff9ad0', { roughness: 0.5 });
      for (const sx of [-1, 1]) G.mesh(new T.SphereGeometry(r * 0.35, 8, 6), pink, x + sx * r * 2.1, y - r * 0.9, z - r * 0.1, parent, false);
    }
    return eyes;
  }
  A.critter = function (kind) {
    const k = KIND[kind];
    const g = new T.Group();
    const body = new T.Group();
    g.add(body);
    const c = new T.Color(k.color);
    const mat = new T.MeshStandardMaterial({ color: c, roughness: 0.18, metalness: 0, emissive: c.clone().multiplyScalar(0.28) });
    const shine = G.std('#ffffff', { roughness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.5 });
    let eyes = [];
    if (kind === 'splitter') {
      // a peanut: two jellies stuck together, a face on each, ready to come apart
      for (const sx of [-1, 1]) {
        const b = G.mesh(new T.SphereGeometry(0.3, 18, 14), mat, sx * 0.22, 0, 0, body, false);
        b.scale.set(1, 1.05, 0.9);
        G.mesh(new T.SphereGeometry(0.06, 8, 6), shine, sx * 0.22 - 0.1, 0.16, 0.22, body, false);
        eyes = eyes.concat(face(body, sx * 0.22, 0.05, 0.22, 0.075, true));
      }
    } else {
      const b = G.mesh(new T.SphereGeometry(0.42, 20, 16), mat, 0, 0, 0, body, false);
      b.scale.set(1, 0.86, 0.85);
      G.mesh(new T.SphereGeometry(0.08, 8, 6), shine, -0.18, 0.2, 0.28, body, false);
      eyes = face(body, 0, 0.06, 0.3, 0.1, true);
      if (kind === 'hopper') {
        // springy antennae with bobbles: this one hops lanes
        const spring = G.std('#ffffff', { roughness: 0.3 }), bob = G.std('#ffe14a', { roughness: 0.3, emissive: new T.Color('#ffe14a').multiplyScalar(0.4) });
        for (const sx of [-1, 1]) {
          const a = G.mesh(new T.CylinderGeometry(0.025, 0.025, 0.32, 6), spring, sx * 0.16, 0.45, 0, body, false);
          a.rotation.z = -sx * 0.35;
          G.mesh(new T.SphereGeometry(0.08, 10, 8), bob, sx * 0.22, 0.6, 0, body, false);
        }
        // and little feet
        for (const sx of [-1, 1]) G.mesh(new T.SphereGeometry(0.12, 10, 8), mat, sx * 0.2, -0.34, 0.05, body, false).scale.set(1.2, 0.6, 1.3);
      }
      if (kind === 'small') b.scale.set(1, 0.9, 0.85);
    }
    g.userData = { kind, body, eyes, size: k.size, mat };
    return g;
  };

  // ---------- a zap: a sparkly ball of light ----------
  A.shot = function () {
    const g = new T.Group();
    const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: '#fff6a8', transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    glow.scale.set(1.1, 1.1, 1);
    g.add(glow);
    const core = new T.Mesh(new T.OctahedronGeometry(0.16, 0), new T.MeshBasicMaterial({ color: '#ffffff' }));
    g.add(core);
    g.userData = { glow, core };
    return g;
  };

  // ---------- confetti: one instanced mesh of little paper squares (from TT Pipe Bonk, from TT Barrel Climb) ----------
  A.confetti = function (scene, max) {
    max = max || 500;
    const geo = new T.PlaneGeometry(0.16, 0.1);
    const im = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ side: T.DoubleSide }), max);
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);
    im.frustumCulled = false;
    im.renderOrder = 4;
    scene.add(im);
    const ps = [];
    const col = new T.Color(), mm = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), v = new T.Vector3();
    const COLS = ['#ff3d7f', '#ffd400', '#18d4ff', '#7dff5a', '#ff8a1f', '#c77dff', '#ffffff'];
    for (let i = 0; i < max; i++) { im.setColorAt(i, col.set(COLS[i % COLS.length])); mm.makeScale(0, 0, 0); im.setMatrixAt(i, mm); }
    let next = 0;
    return {
      burst(x, y, z, n, power, colors, grav) {
        for (let i = 0; i < n; i++) {
          const k = next++ % max;
          const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * 2, sp = (0.4 + Math.random()) * (power || 4);
          ps[k] = { x, y, z: z || 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (grav == null ? 1.5 : 0), vz: b * sp * 0.5 + 1, rx: Math.random() * 6, ry: Math.random() * 6, life: 1.2 + Math.random() * 1.0, g: grav == null ? 6 : grav };
          im.setColorAt(k, col.set(colors ? colors[i % colors.length] : COLS[k % COLS.length]));
        }
        im.instanceColor.needsUpdate = true;
      },
      rain(x0, x1, y, n) {
        for (let i = 0; i < n; i++) {
          const k = next++ % max;
          ps[k] = { x: x0 + Math.random() * (x1 - x0), y: y + Math.random() * 3, z: 1 + Math.random() * 2, vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random(), vz: 0, rx: Math.random() * 6, ry: Math.random() * 6, life: 4 + Math.random() * 2, g: 6 };
          im.setColorAt(k, col.set(COLS[k % COLS.length]));
        }
        im.instanceColor.needsUpdate = true;
      },
      update(dt) {
        for (let k = 0; k < max; k++) {
          const p = ps[k];
          if (!p) continue;
          p.life -= dt;
          if (p.life <= 0) { ps[k] = null; mm.makeScale(0, 0, 0); im.setMatrixAt(k, mm); continue; }
          p.vy -= p.g * dt;
          p.vx *= 1 - 1.5 * dt;
          p.vz *= 1 - 1.5 * dt;
          if (p.g) p.vy = Math.max(p.vy, -2.2); else p.vy *= 1 - 1.5 * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          p.rx += dt * 7; p.ry += dt * 5;
          q.setFromEuler(e.set(p.rx, p.ry, 0));
          s.setScalar(Math.min(1, p.life * 2));
          mm.compose(v.set(p.x, p.y, p.z), q, s);
          im.setMatrixAt(k, mm);
        }
        im.instanceMatrix.needsUpdate = true;
      },
      clear() { for (let k = 0; k < max; k++) if (ps[k]) { ps[k] = null; mm.makeScale(0, 0, 0); im.setMatrixAt(k, mm); } im.instanceMatrix.needsUpdate = true; },
    };
  };

  // ---------- sparkles: little stars that fly out and fade (a zapped critter) ----------
  A.sparkles = function (scene, max) {
    const tex = G.emojiTexture('✨');
    const list = [];
    for (let i = 0; i < max; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      s.visible = false;
      s.renderOrder = 5;
      scene.add(s);
      list.push({ s, life: 0 });
    }
    let next = 0;
    return {
      burst(x, y, z, n, size) {
        for (let i = 0; i < n; i++) {
          const p = list[next++ % max];
          const a = Math.random() * Math.PI * 2, sp = (1 + Math.random() * 2) * size;
          Object.assign(p, { x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6 + Math.random() * 0.4, size: size * (0.5 + Math.random() * 0.4) });
          p.s.visible = true;
        }
      },
      update(dt) {
        for (const p of list) {
          if (p.life <= 0) { p.s.visible = false; continue; }
          p.life -= dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt;
          p.s.position.set(p.x, p.y, p.z);
          p.s.scale.setScalar(p.size * Math.min(1, p.life * 2.5));
          p.s.material.opacity = Math.min(1, p.life * 3);
        }
      },
      clear() { for (const p of list) { p.life = 0; p.s.visible = false; } },
    };
  };

  // ---------- emoji sprites ----------
  A.emoji = function (e, size) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(e), depthTest: false }));
    s.scale.set(size || 0.6, size || 0.6, 1);
    s.renderOrder = 7;
    s.userData.e = e;
    return s;
  };
  A.setEmoji = function (s, e) {
    if (s.userData.e === e) return;
    s.material.map = G.emojiTexture(e);
    s.material.needsUpdate = true;
    s.userData.e = e;
  };
})();
