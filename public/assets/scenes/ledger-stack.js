/* The Ledger Stack (About). The 48 log rows as thin slabs stacked on y, the killed rows grey and the kept rows green,
   standing as a column; scroll rides the camera straight up the stack so the reader climbs the log. A label follows
   the row at the camera's height and reports its trial and gate. No turn. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['ledger-stack'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var G = opts.gateOfIndex;
    var NAMES = { 1: 'point in time', 2: 'walk forward', 3: 'costs', 4: 'capacity', 5: 'kept' };
    var ctx = C.mount(slot, { fov: 38 });
    if (!ctx) return null;
    /* pass 6: the slabs are log rows, thin in depth (D 0.24, was 1.2), so the six kept rows read as green lines in the
       stack rather than green blocks; the accent share of the About viewport stays under 2 percent by intent */
    var W = 3.2, H = 0.04, D = 0.24, STEP = 0.17;
    var cells = C.makeCells(48, W, H, D);
    ctx.scene.add(cells.group);
    for (var i = 0; i < 48; i++) {
      cells.setPosition(i, 0, i * STEP, 0);
      cells.setState(i, G[i] === 5 ? 'kept' : 'killed');
    }
    var top = 47 * STEP;
    var label = C.label(slot, 'row 01 · killed · point in time');
    var count = C.label(slot, '48 rows · 6 kept', 'scene-label--g3');
    var p = 0, camY = 0, first = true, lastRow = -1;
    var v = new T.Vector3();
    ctx.frame = function (dt, now) {
      var targetY = C.lerp(-0.6, top + 0.6, p);
      var k = first ? 1 : 1 - Math.pow(0.9, dt * 60);
      camY += (targetY - camY) * k;
      ctx.camera.position.set(3.4, camY + 1.6, 6.4);
      ctx.camera.lookAt(0, camY, 0);
      ctx.camera.updateMatrixWorld();
      var row = C.clamp(Math.round(camY / STEP), 0, 47);
      if (row !== lastRow) {
        lastRow = row;
        label.textContent = 'row ' + String(row + 1).padStart(2, '0') + ' · ' + (G[row] === 5 ? 'kept' : 'killed · ' + NAMES[G[row]]);
        label.classList.toggle('scene-label--kept', G[row] === 5);
        for (var j = 0; j < 48; j++) cells.setRimOverride(j, j === row ? C.P.g3 : null);
      }
      cells.commit(now);
      v.set(W / 2 + 0.1, row * STEP, D / 2);
      C.place(ctx, label, v, 8, -6);
      v.set(-W / 2, top + 0.5, D / 2);
      C.place(ctx, count, v, 0, -14);
      first = false;
    };
    var drive = slot.closest('.about-grid') || slot;
    var st = C.progress(drive, function (val) { p = val; ctx.start(); }, { start: 'top 60%', end: 'bottom 60%' });
    ctx.start();
    return { ctx: ctx, setProgress: function (val) { p = C.clamp(val, 0, 1); ctx.start(); }, dispose: function () { if (st && st.kill) st.kill(); ctx.dispose(); } };
  };
})();
