/* The Kept Cell Held (Confirmation). The checkout's green cell held among 47 outlined cells; on arrival the camera
   rises once to elevation over 0.9s with Settle and holds. One rise on y, nothing else. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['kept-cell-held'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var ctx = C.mount(slot, { fov: 36 });
    if (!ctx) return null;
    var CELL = 0.5, GAP = 0.09, STEP = CELL + GAP, KEPT = 34;
    var cells = C.makeCells(48, CELL, CELL, 0.12);
    cells.group.rotation.x = -Math.PI / 2;
    ctx.scene.add(cells.group);
    for (var i = 0; i < 48; i++) {
      var col = i % 8, row = Math.floor(i / 8);
      cells.setPosition(i, -3.5 * STEP + col * STEP, 2.5 * STEP - row * STEP, 0);
      cells.setState(i, i === KEPT ? 'kept' : 'unrun');
      if (i !== KEPT) cells.setRimOverride(i, C.P.g2);
    }
    var label = C.label(slot, '1 kept · order done', 'scene-label--kept');
    var t0 = -1, v = new T.Vector3();
    ctx.frame = function (dt, now) {
      if (t0 < 0) t0 = now;
      var k = C.EASE.settle(C.clamp((now - t0) / C.DUR.slow, 0, 1));
      var y = C.lerp(1.2, 6.5, k), z = C.lerp(4.5, 0.6, k);
      ctx.camera.position.set(0, y, z); ctx.camera.up.set(0, 0, -1); ctx.camera.lookAt(0, 0, 0); ctx.camera.updateMatrixWorld();
      cells.commit(now);
      /* the label sits at the slot's top left, above the lattice and inside the canvas at every size (pass 5) */
      label.style.visibility = 'visible';
      label.style.transform = 'translate(6px, 6px)';
    };
    ctx.start();
    return { ctx: ctx, setProgress: function () {}, dispose: ctx.dispose };
  };
})();
