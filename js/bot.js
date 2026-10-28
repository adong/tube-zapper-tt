/* TT Tube Zapper: the autopilot, for the title screen's demo and the check's "can a whole game be played" soak.
   It aims at the most urgent critter (one on the rim first, then the one that has climbed highest, nearer ones before
   farther ones), walks the short way round to its lane, and zaps while anything is in its own lane. Three or more on
   the rim at once: a super zap. It gives the same input a kid's keys or finger give (a target lane, like a finger). */
(function (root) {
  'use strict';
  const TZ = (root.TZ = root.TZ || {});
  function decide(w) {
    if (w.phase !== 'play' && w.phase !== 'ready') return {};
    const SH = TZ.shapes, z = w.zap, sh = w.shape;
    let best = null, bs = -Infinity;
    for (const c of w.critters) {
      const far = SH.apart(sh, z.lane, c.lane);
      let u = (c.st === 'rim' ? 2 + c.graceT : c.d) - far * 0.05;
      if (c.lane === z.lane) u += 0.25;
      if (u > bs) { bs = u; best = c; }
    }
    const mine = w.critters.some((c) => c.lane === z.lane);
    const rim = w.critters.filter((c) => c.st === 'rim').length;
    return { target: best ? best.lane : null, fire: mine, superPress: rim >= 3 };
  }
  TZ.bot = { decide };
})(typeof window !== 'undefined' ? window : globalThis);
