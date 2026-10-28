/* TT Tube Zapper: the tube shapes. Every tube is 16 lanes; a shape is its 17 rim points, in clockwise order as seen from
   the camera (x right, y up, looking down the tube to -z). A closed shape's last point is its first; an open one (the
   flat bridge, the rainbow) has two ends, and sits above the middle so its clockwise way is also to the right.
   Lane i runs from rim point i to point i + 1. The far end is DEPTH metres away: the rim made smaller (FAR), or for the
   bridge a wide line lower down, like a road into the distance. So a lane is a long four-sided strip from the far end
   up to the rim. d = 0 is the far end, d = 1 the rim.
   ← moves the zapper to lane i - 1 (counter-clockwise), → to lane i + 1 (clockwise). */
(function (root) {
  'use strict';
  const TZ = (root.TZ = root.TZ || {});
  const N = 16, FAR = 0.3, DEPTH = 12;
  const PI = Math.PI;

  // points at equal angles going clockwise from the top; rf gives the radius of point i
  function polar(rf, phase) {
    const p = [];
    for (let i = 0; i < N; i++) {
      const a = PI / 2 + phase - (i * 2 * PI) / N;
      const r = rf(i, a);
      p.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    p.push(p[0].slice());
    return p;
  }
  // a closed polygon through the corners, n lanes per side
  function poly(corners, per) {
    const p = [];
    for (let c = 0; c < corners.length; c++) {
      const a = corners[c], b = corners[(c + 1) % corners.length];
      for (let k = 0; k < per; k++) p.push([a[0] + ((b[0] - a[0]) * k) / per, a[1] + ((b[1] - a[1]) * k) / per]);
    }
    p.push(p[0].slice());
    return p;
  }
  // the heart: the classic curve, cut into 16 lanes of the same length, starting at the dip on top and going clockwise
  function heart() {
    const raw = [];
    const M = 800;
    for (let i = 0; i <= M; i++) {
      const t = (i / M) * 2 * PI;
      raw.push([16 * Math.pow(Math.sin(t), 3), 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
    }
    let y0 = Infinity, y1 = -Infinity;
    for (const q of raw) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const k = 0.31, cy = (y0 + y1) / 2 + 0.6; // a little high, so the lanes around the dip stay roomy
    const pts = raw.map((q) => [q[0] * k, (q[1] - cy) * k]);
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1];
    const out = [];
    let j = 1;
    for (let i = 0; i < N; i++) {
      const want = (i * total) / N;
      while (len[j] < want) j++;
      const u = (want - len[j - 1]) / (len[j] - len[j - 1] || 1);
      out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]);
    }
    out.push(out[0].slice());
    return out;
  }
  function line(x0, x1, y) {
    const p = [];
    for (let i = 0; i <= N; i++) p.push([x0 + ((x1 - x0) * i) / N, y]);
    return p;
  }
  function arc(r, cy) {
    const p = [];
    for (let i = 0; i <= N; i++) { const a = PI - (i * PI) / N; p.push([Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return p;
  }

  // the colours: two stripes for the lanes and one for the glowing edges
  const DEFS = [
    { id: 'circle', name: 'CIRCLE', open: false, make: () => polar(() => 5, PI / N), cols: ['#3a2a8f', '#4b37b3'], edge: '#7ff3ff' },
    { id: 'square', name: 'SQUARE', open: false, make: () => poly([[-4.5, 4.5], [4.5, 4.5], [4.5, -4.5], [-4.5, -4.5]], 4), cols: ['#1d5a8a', '#2470a8'], edge: '#ffe45e' },
    { id: 'star', name: 'STAR', open: false, make: () => polar((i) => (i % 2 ? 2.75 : 5.5), 0), cols: ['#6a2a8a', '#8235a8'], edge: '#ffd400' },
    { id: 'heart', name: 'HEART', open: false, make: heart, cols: ['#8a2a5a', '#a8356e'], edge: '#ff9ad0' },
    { id: 'bridge', name: 'BRIDGE', open: true, make: () => line(-6.2, 6.2, 2.7), far: (p) => p.map((q) => [q[0] * 0.6, -0.9]), cols: ['#2a6a4a', '#33845b'], edge: '#b6ff6a' },
    { id: 'flower', name: 'FLOWER', open: false, make: () => polar((i, a) => 4.35 + 0.95 * Math.cos(4 * (a - PI / 2)), 0), cols: ['#7a3a1a', '#9a4b22'], edge: '#ffb35e' },
    { id: 'rainbow', name: 'RAINBOW', open: true, make: () => arc(5.5, -1.4), cols: ['#28408a', '#3352a8'], edge: '#ff7ad8' },
    { id: 'diamond', name: 'DIAMOND', open: false, make: () => poly([[0, 5.6], [5.6, 0], [0, -5.6], [-5.6, 0]], 4), cols: ['#1a6a7a', '#22849a'], edge: '#c9a0ff' },
  ];

  // the list of tubes; a check's sabotage can break one on purpose
  function make(sab) {
    return DEFS.map((d) => {
      let pts = d.make();
      if (sab === 'shapeGap' && d.id === 'square') pts = pts.slice(0, N); // a lane missing: only 15
      if (sab === 'shapeMirror' && d.id === 'heart') pts = pts.slice().reverse(); // counter-clockwise: ← and → swap
      const far = d.far ? d.far(pts) : pts.map((q) => [q[0] * FAR, q[1] * FAR]);
      return { id: d.id, name: d.name, open: d.open, pts, far, cols: d.cols, edge: d.edge };
    });
  }

  // one lane: its two rim points, middle, width, and the outward direction (away from the tube's middle)
  function lane(pts, i) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], w = Math.hypot(dx, dy) || 1;
    return { a, b, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], w, n: [-dy / w, dx / w], t: [dx / w, dy / w] };
  }
  // a rim point i at depth d (0 far end .. 1 rim), in 3D
  function point(sh, i, d, out) {
    out = out || [0, 0, 0];
    const a = sh.far[i], b = sh.pts[i];
    out[0] = a[0] + (b[0] - a[0]) * d;
    out[1] = a[1] + (b[1] - a[1]) * d;
    out[2] = -DEPTH * (1 - d);
    return out;
  }
  // where lane i's middle is at depth d, in 3D
  function at(sh, i, d, out) {
    out = out || [0, 0, 0];
    const a0 = sh.far[i], a1 = sh.far[i + 1], b0 = sh.pts[i], b1 = sh.pts[i + 1];
    out[0] = (a0[0] + a1[0]) / 2 + ((b0[0] + b1[0]) / 2 - (a0[0] + a1[0]) / 2) * d;
    out[1] = (a0[1] + a1[1]) / 2 + ((b0[1] + b1[1]) / 2 - (a0[1] + a1[1]) / 2) * d;
    out[2] = -DEPTH * (1 - d);
    return out;
  }
  // how wide lane i is at depth d
  function width(sh, i, d) {
    const p = point(sh, i, d), q = point(sh, i + 1, d);
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  }
  // the lane a zapper starts on: the highest one (the middle one if two tie), so → first goes right
  function startLane(shape) {
    let best = 0, by = -Infinity;
    for (let i = 0; i < N; i++) {
      const m = lane(shape.pts, i).mid;
      const score = m[1] - Math.abs(m[0]) * 0.01;
      if (score > by + 1e-6) { by = score; best = i; }
    }
    return best;
  }
  // the lane next to i going dir (+1 clockwise, -1 counter-clockwise): wraps round a closed tube, stops at an open one's ends
  function step(shape, i, dir) {
    const n = shape.pts.length - 1;
    if (shape.open) return Math.max(0, Math.min(n - 1, i + dir));
    return (((i + dir) % n) + n) % n;
  }
  // the shortest way from lane i to lane j: +1, -1 or 0
  function toward(shape, i, j) {
    if (i === j) return 0;
    if (shape.open) return j > i ? 1 : -1;
    const n = shape.pts.length - 1;
    return (j - i + n) % n <= n / 2 ? 1 : -1;
  }
  // lanes between i and j (round the short way on a closed tube)
  function apart(shape, i, j) {
    if (shape.open) return Math.abs(i - j);
    const n = shape.pts.length - 1, k = Math.abs(i - j) % n;
    return Math.min(k, n - k);
  }
  // the rim halfway between two shapes, for the morph from one tube to the next
  function mix(a, b, u) {
    const lerp = (A, B) => A.map((p, i) => [p[0] + (B[i][0] - p[0]) * u, p[1] + (B[i][1] - p[1]) * u]);
    return { id: b.id, name: b.name, open: u < 0.5 ? a.open : b.open, pts: lerp(a.pts, b.pts), far: lerp(a.far, b.far), cols: b.cols, edge: b.edge };
  }

  TZ.shapes = { N, FAR, DEPTH, DEFS, make, lane, point, at, width, startLane, step, toward, apart, mix };
})(typeof window !== 'undefined' ? window : globalThis);
