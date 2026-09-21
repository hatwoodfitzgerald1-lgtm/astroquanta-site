/* The Candidate Cell (Checkout). One cell centred and outlined in the hairline; each completed section (contact,
   billing, payment, order) draws one of its four edges in grey 3 with Settle; when every required field validates
   and both boxes are ticked the cell fills kept green and the camera pushes in half a unit. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['candidate-cell'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var ctx = C.mount(slot, { fov: 30 });
    if (!ctx) return null;
    var S = 1;
    var cell = C.makeCells(1, S, S, 0.22);
    cell.setPosition(0, 0, 0, 0); cell.setState(0, 'unrun'); cell.setRimOverride(0, C.P.hair);
    ctx.scene.add(cell.group);
    /* the four edges as separate lines that scale from their origin */
    var edges = [];
    var defs = [[-S / 2, S / 2, S / 2, S / 2], [S / 2, S / 2, S / 2, -S / 2], [S / 2, -S / 2, -S / 2, -S / 2], [-S / 2, -S / 2, -S / 2, S / 2]];
    defs.forEach(function (d) {
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute([d[0], d[1], 0.12, d[0], d[1], 0.12], 3));
      var l = new T.Line(g, new T.LineBasicMaterial({ color: C.HEX.g3 }));
      l.userData = { d: d, t0: -1, on: false, k: 0 };
      ctx.scene.add(l); edges.push(l);
    });
    var label = C.label(slot, 'candidate · 0 of 4 sections');
    label.style.cssText = 'left: 8px; bottom: 6px; top: auto; visibility: visible;';
    var sections = [false, false, false, false], all = false, push = 0, pushT = 0;
    var v = new T.Vector3();
    ctx.onResize = function (w, h) { ctx.camera.setViewOffset(w, h, -0.28 * w, 0, w, h); };
    ctx.onResize(ctx.w, ctx.h);
    ctx.frame = function (dt, now) {
      edges.forEach(function (l) {
        var u = l.userData, k = u.on ? (u.t0 < 0 ? 1 : C.EASE.settle(C.clamp((now - u.t0) / C.DUR.base, 0, 1))) : 0;
        if (k !== u.k) {
          u.k = k;
          var d = u.d, pos = l.geometry.attributes.position;
          pos.setXYZ(1, d[0] + (d[2] - d[0]) * k, d[1] + (d[3] - d[1]) * k, 0.12);
          pos.needsUpdate = true;
        }
      });
      if (all && pushT >= 0) push = 0.5 * C.EASE.settle(C.clamp((now - pushT) / C.DUR.slow, 0, 1));
      cell.commit(now);
      ctx.camera.position.set(0, 0.35, 4.2 - push); ctx.camera.lookAt(0, 0, 0); ctx.camera.updateMatrixWorld();
    };
    function apply(list, complete) {
      var now = performance.now() / 1000, n = 0;
      list.forEach(function (on, i) { var u = edges[i].userData; if (on !== u.on) { u.on = on; u.t0 = on ? now : -1; if (!on) u.k = -1; } if (on) n++; });
      sections = list;
      if (complete !== all) {
        all = complete; pushT = complete ? now : -1;
        if (!complete) push = 0;
        cell.setState(0, complete ? 'kept' : 'unrun', now);
        cell.setRimOverride(0, complete ? null : C.P.hair);
      }
      label.textContent = complete ? 'candidate · kept · complete the purchase' : 'candidate · ' + n + ' of 4 sections';
      label.classList.toggle('scene-label--kept', complete);
      ctx.start();
    }
    if (AQ.candidateSections) apply(AQ.candidateSections.list, AQ.candidateSections.complete);
    ctx.start();
    return { ctx: ctx, setProgress: function () {}, setSections: apply, dispose: ctx.dispose };
  };
})();
