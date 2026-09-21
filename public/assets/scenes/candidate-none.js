/* Candidate None (404). The 48 cell corridor with every cell grey from the first frame: the camera walks through the
   four gates on its own (and faster with the scroll), the cells hold at their gates and nothing survives; no turn,
   the Fraction reads 0 / 48. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['candidate-none'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var ctx = C.mount(slot, { fov: 45 });
    if (!ctx) return null;
    var G = opts.gateOfIndex.map(function (g) { return g === 5 ? 4 : g; });   /* the six that would have been kept die at capacity */
    var GATE_P = [0.18, 0.38, 0.58, 0.76], CELL = 0.34, GAP = 0.06;
    var W = 8 * CELL + 7 * GAP, H = 6 * CELL + 5 * GAP, AHEAD = 5.5, SPEED = 35;
    var GATE_Z = GATE_P.map(function (p) { return -SPEED * p; });
    var cells = C.makeCells(48, CELL, CELL, 0.05);
    ctx.scene.add(cells.group);
    GATE_Z.forEach(function (z) { var r = C.hairRect(W + 0.12, H + 0.16); r.position.set(0, 0, z); ctx.scene.add(r); });
    var home = [];
    for (var i = 0; i < 48; i++) home.push({ x: -W / 2 + CELL / 2 + (i % 8) * (CELL + GAP), y: H / 2 - CELL / 2 - Math.floor(i / 8) * (CELL + GAP) });
    ctx.onResize = function (w, h) { ctx.camera.setViewOffset(w, h, 0, 0, w, h); };
    ctx.onResize(ctx.w, ctx.h);
    var label = C.label(slot, '0 / 48 · nothing cleared');
    var p = 0, cur = 0, first = true, v = new T.Vector3(), auto = 0;
    ctx.frame = function (dt, now) {
      /* the dolly runs on its own at a slow walk (the whole corridor in 24s) and the scroll can push it further */
      auto = Math.min(1, auto + dt / 24);
      var want = Math.max(auto, p);
      var k = first ? 1 : 1 - Math.pow(0.92, dt * 60);
      cur += (want - cur) * k;
      var latZ = -SPEED * cur;
      for (var i = 0; i < 48; i++) {
        var gi = G[i] - 1, dead = cur >= GATE_P[gi];
        cells.setPosition(i, home[i].x, home[i].y, dead ? GATE_Z[gi] : latZ);
        cells.setState(i, 'dead', first ? undefined : now);
        cells.setRimOverride(i, dead ? null : (Math.sin((Math.floor(now) / 6 + i / 48) * Math.PI * 2) > 0 ? C.P.g2 : C.P.g1));
      }
      cells.commit(now);
      ctx.camera.position.set(0, 0, AHEAD + latZ); ctx.camera.lookAt(0, 0, latZ - 100); ctx.camera.updateMatrixWorld();
      v.set(-W / 2, -H / 2 - 0.06, latZ); C.place(ctx, label, v, 0, 6);
      first = false;
    };
    var st = C.progress(slot.closest('section') || slot, function (val) { p = val; ctx.start(); }, { start: 'top 60%', end: 'bottom 20%' });
    ctx.start();
    return { ctx: ctx, setProgress: function (val) { p = C.clamp(val, 0, 1); ctx.start(); }, dispose: function () { if (st && st.kill) st.kill(); ctx.dispose(); } };
  };
})();
