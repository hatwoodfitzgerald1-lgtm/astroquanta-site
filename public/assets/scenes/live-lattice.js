/* The Live Lattice (Sweep). The visitor's N cells, 8 across, seen top down behind frame B: outlined at rest, filling
   grey and green live as the run proceeds (sweep.js reports every cell as it fills). N changing rebuilds the lattice
   cell by cell; the camera is a fixed birdseye that pulls back with N and pushes in slowly as the reader scrolls. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['live-lattice'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var ctx = C.mount(slot, { fov: 40 });
    if (!ctx) return null;
    var CELL = 0.5, GAP = 0.09, STEP = CELL + GAP;
    var MAX = 96;
    var cells = C.makeCells(MAX, CELL, CELL, 0.12);
    cells.group.rotation.x = -Math.PI / 2;      /* the lattice lies flat; the camera looks straight down */
    ctx.scene.add(cells.group);
    var n = 48, p = 0, dist = 8, targetDist = 8, first = true;
    var label = C.label(slot, '48 / 48 · outlined');
    var shown = 0, kept = 0, killed = 0;
    function layout() {
      var rows = Math.ceil(n / 8);
      for (var i = 0; i < MAX; i++) {
        var col = i % 8, row = Math.floor(i / 8);
        cells.setPosition(i, -3.5 * STEP + col * STEP, (rows - 1) / 2 * STEP - row * STEP, 0);
        cells.setScale(i, i < n ? 1 : 0.0001);
      }
      var need = Math.max(rows * STEP, 8 * STEP / (ctx.w / ctx.h)) / 2 / Math.tan(20 * Math.PI / 180) + 1.2;
      targetDist = need;
      label.textContent = shown + ' / ' + n + (shown ? ' · ' + killed + ' killed · ' + kept + ' kept' : ' · outlined');
    }
    layout();
    ctx.onResize = function () { layout(); };
    var v = new T.Vector3();
    ctx.frame = function (dt, now) {
      var k = first ? 1 : 1 - Math.pow(0.9, dt * 60);
      dist += (targetDist - dist) * k;
      var d = dist * (1 - 0.08 * p);
      ctx.camera.position.set(0, d, 0.0001);
      ctx.camera.up.set(0, 0, -1);
      ctx.camera.lookAt(0, 0, 0);
      ctx.camera.updateMatrixWorld();
      for (var i = 0; i < n; i++) {
        if (cells.cells[i].state === 'unrun') { var s = Math.sin((Math.floor(now) / 6 + i / n) * Math.PI * 2); cells.setRimOverride(i, s > 0 ? C.P.g2 : C.P.hair); }
        else cells.setRimOverride(i, null);
      }
      cells.commit(now);
      var rows = Math.ceil(n / 8);
      v.set(-3.5 * STEP - CELL / 2, 0, -((rows - 1) / 2 * STEP + CELL / 2));
      C.place(ctx, label, v, 0, -18);
      first = false;
    };
    var api = {
      ctx: ctx,
      setProgress: function (v) { p = C.clamp(v, 0, 1); ctx.start(); },
      rebuild: function (count) {
        n = C.clamp(count, 8, MAX); shown = 0; kept = 0; killed = 0;
        for (var i = 0; i < MAX; i++) cells.setState(i, 'unrun');
        layout(); ctx.start();
      },
      setCell: function (id, state) {
        var i = id - 1; if (i < 0 || i >= n) return;
        if (cells.cells[i].state === 'unrun') { shown++; if (state === 'kept') kept++; else killed++; }
        cells.setState(i, state, performance.now() / 1000);
        label.textContent = shown + ' / ' + n + ' · ' + killed + ' killed · ' + kept + ' kept';
        ctx.start();
      },
      dispose: function () { if (st && st.kill) st.kill(); ctx.dispose(); }
    };
    /* replay the state sweep.js already has */
    if (AQ.sweepState) { api.rebuild(AQ.sweepState.n); AQ.sweepState.cells.forEach(function (s, i) { if (s) api.setCell(i + 1, s); }); }
    var st = C.progress(slot.closest('section') || slot, function (v) { p = v; ctx.start(); });
    ctx.start();
    return api;
  };
})();
