/* The Archive Row (Blog index). One cell per post on a single x axis, dated, outlined; the newest post's cell is kept
   green. Scroll tracks the camera along the row from the oldest to the newest. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['archive-row'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var ctx = C.mount(slot, { fov: 30 });
    if (!ctx) return null;
    var posts = Array.prototype.map.call(document.querySelectorAll('.archive-shelf li'), function (li) {
      var t = li.querySelector('time');
      return { date: t ? t.textContent : '', newest: li.classList.contains('is-newest'), href: li.querySelector('a') ? li.querySelector('a').getAttribute('href') : '' };
    });
    if (!posts.length) posts = [{ date: '', newest: true }];
    var n = posts.length, SPAN = 2.4;
    var cells = C.makeCells(n, 0.5, 0.5, 0.12);
    ctx.scene.add(cells.group);
    var axis = C.hairRect((n - 1) * SPAN + 6, 0.0001);
    axis.position.set(0, -0.55, 0);
    ctx.scene.add(axis);
    var labels = posts.map(function (q, i) {
      cells.setPosition(i, (i - (n - 1) / 2) * SPAN, 0, 0);
      cells.setState(i, q.newest ? 'kept' : 'live');
      return C.label(slot, q.date + (q.newest ? ' · newest' : ''), q.newest ? 'scene-label--kept' : '');
    });
    var p = 0, camX = -(n - 1) / 2 * SPAN, first = true;
    var v = new T.Vector3();
    ctx.frame = function (dt, now) {
      var target = C.lerp(-(n - 1) / 2 * SPAN, (n - 1) / 2 * SPAN, p);
      var k = first ? 1 : 1 - Math.pow(0.9, dt * 60);
      camX += (target - camX) * k;
      ctx.camera.position.set(camX, 0.9, 7);
      ctx.camera.lookAt(camX, 0, 0);
      ctx.camera.updateMatrixWorld();
      for (var i = 0; i < n; i++) {
        var near = Math.abs(cells.getPosition(i).x - camX) < SPAN / 2;
        if (cells.cells[i].state === 'live') cells.setRimOverride(i, near ? null : C.P.g2);
        v.set(cells.getPosition(i).x - 0.25, -0.35, 0.06);
        C.place(ctx, labels[i], v, 0, 6);
      }
      cells.commit(now);
      first = false;
    };
    var st = C.progress(slot.closest('section') || slot, function (val) { p = val; ctx.start(); }, { start: 'top 80%', end: 'bottom 40%' });
    ctx.start();
    return { ctx: ctx, setProgress: function (val) { p = C.clamp(val, 0, 1); ctx.start(); }, dispose: function () { if (st && st.kill) st.kill(); ctx.dispose(); } };
  };
})();
