/* The Extruded Curve (blog posts). One thin equity curve per post, seeded from the post's slug through the /sweep
   generator (FNV 1a and mulberry32), extruded 0.05 units and drawn in 3D as the reader scrolls the header away;
   in sample in grey 2, walk forward in the accent, a hairline axis, labelled illustrative. Camera fixed with a
   slight dolly on z at the end. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['extruded-curve'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var ctx = C.mount(slot, { fov: 30 });
    if (!ctx) return null;
    var slug = window.location.pathname.split('/').filter(Boolean).pop() || 'post';
    var N = 180, SPLIT = Math.round(N * 0.64), WIDTH = 22, HEIGHT = 3.4, EXT = 0.05;
    var walk = C.walk(slug, N, 0.05, 0.22);
    var lo = Math.min.apply(null, walk), hi = Math.max.apply(null, walk), span = (hi - lo) || 1;
    var pts = walk.map(function (y, i) { return new T.Vector3(-WIDTH / 2 + i / (N - 1) * WIDTH, -HEIGHT / 2 + (y - lo) / span * HEIGHT, 0); });
    function ribbon(from, to, color) {
      var count = to - from;
      var pos = new Float32Array(count * 2 * 3);
      var idx = [];
      for (var i = 0; i < count; i++) {
        var q = pts[from + i];
        pos.set([q.x, q.y, EXT / 2, q.x, q.y, -EXT / 2], i * 6);
        if (i < count - 1) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      g.setIndex(idx);
      var m = new T.Mesh(g, new T.MeshBasicMaterial({ color: color, side: T.DoubleSide }));
      /* the top edge as a 1px line so the curve reads at any angle */
      var lg = new T.BufferGeometry();
      var lp = new Float32Array(count * 3);
      for (var j = 0; j < count; j++) lp.set([pts[from + j].x, pts[from + j].y, EXT / 2], j * 3);
      lg.setAttribute('position', new T.BufferAttribute(lp, 3));
      var line = new T.Line(lg, new T.LineBasicMaterial({ color: color }));
      return { mesh: m, line: line, count: count };
    }
    var inS = ribbon(0, SPLIT + 1, C.HEX.g2), wf = ribbon(SPLIT, N, C.HEX.kept);
    ctx.scene.add(inS.mesh, inS.line, wf.mesh, wf.line);
    var axis = C.hairRect(WIDTH + 0.4, 0.0001); axis.position.set(0, -HEIGHT / 2 - 0.12, 0); ctx.scene.add(axis);
    var splitLine = C.hairRect(0.0001, HEIGHT + 0.3); splitLine.position.set(pts[SPLIT].x, 0, 0); ctx.scene.add(splitLine);
    var cursor = C.makeCells(1, 0.09, 0.16, 0.05); ctx.scene.add(cursor.group); cursor.setState(0, 'live');
    var labels = [C.label(slot, 'in sample'), C.label(slot, 'walk forward', 'scene-label--kept'), C.label(slot, 'illustrative · seeded from this note'), C.label(slot, 'split')];
    var p = 0, drawn = 0, first = true, v = new T.Vector3();
    ctx.frame = function (dt, now) {
      var k = first ? 1 : 1 - Math.pow(0.88, dt * 60);
      drawn += (p - drawn) * k;
      var upto = Math.round(drawn * (N - 1));
      var a = Math.min(upto + 1, SPLIT + 1), b = Math.max(0, upto + 1 - SPLIT);
      inS.mesh.geometry.setDrawRange(0, Math.max(0, (a - 1) * 6)); inS.line.geometry.setDrawRange(0, a);
      wf.mesh.geometry.setDrawRange(0, Math.max(0, (b - 1) * 6)); wf.line.geometry.setDrawRange(0, b);
      var head = pts[upto];
      cursor.setPosition(0, head.x + 0.08, head.y, 0);
      cursor.setRimOverride(0, Math.floor(now) % 2 ? C.P.g3 : C.P.ground);
      cursor.commit(now);
      var z = 11.5 - (p > 0.9 ? (p - 0.9) / 0.1 * 0.8 : 0);
      ctx.camera.position.set(0, 2.6, z);
      ctx.camera.lookAt(0, 0, 0);
      ctx.camera.updateMatrixWorld();
      v.set(-WIDTH / 2, -HEIGHT / 2 - 0.2, 0); C.place(ctx, labels[0], v, 0, 4);
      v.set(pts[SPLIT].x + 0.1, -HEIGHT / 2 - 0.2, 0); C.place(ctx, labels[1], v, 0, 4);
      v.set(-WIDTH / 2, HEIGHT / 2 + 0.25, 0); C.place(ctx, labels[2], v, 0, -12);
      v.set(pts[SPLIT].x + 0.08, HEIGHT / 2 + 0.1, 0); C.place(ctx, labels[3], v, 0, -12);
      if (upto >= SPLIT) labels[1].style.visibility = 'visible'; else labels[1].style.visibility = 'hidden';
      first = false;
    };
    var st = C.progress(slot, function (val) { p = val; ctx.start(); }, { start: 'top 90%', end: 'bottom 5%' });
    ctx.start();
    return { ctx: ctx, setProgress: function (val) { p = C.clamp(val, 0, 1); ctx.start(); }, dispose: function () { if (st && st.kill) st.kill(); ctx.dispose(); } };
  };
})();
