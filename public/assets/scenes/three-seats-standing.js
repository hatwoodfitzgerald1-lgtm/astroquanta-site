/* Three Seats Standing (Plans). Three columns of trial cells stand up in sequence as the cards enter: Desk one cell,
   Research five kept cells (the tallest, it is the kept plan), Fund forty eight cells as a low wide block, 8 by 2 by 3.
   Each cell rises from the ground with Latch, 40ms apart, Desk first. Scroll tracks the camera along x from Desk to
   Fund and back to Research; no pitch, no orbit. Hover or focus on a card brightens its column one grey step. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['three-seats-standing'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var ctx = C.mount(slot, { fov: 32 });
    if (!ctx) return null;
    var CELL = 0.5, GAP = 0.1, S = CELL + GAP;
    var cells = C.makeCells(1 + 5 + 48, CELL, CELL, CELL);
    ctx.scene.add(cells.group);
    var floor = C.hairRect(30, 0.0001); floor.position.set(0, -CELL / 2 - 0.02, 0); ctx.scene.add(floor);
    var X = { desk: -5, research: -1.2, fund: 3.6 };
    var groups = { desk: [], research: [], fund: [] };
    var home = [], order = [];
    function put(key, id, x, y, z) { home[id] = { x: x, y: y, z: z, key: key }; groups[key].push(id); order.push(id); }
    put('desk', 0, X.desk, 0, 0);
    for (var r = 0; r < 5; r++) put('research', 1 + r, X.research, r * S, 0);
    for (var i = 0; i < 48; i++) {
      var col = i % 8, layer = Math.floor(i / 8) % 2, depth = Math.floor(i / 16);
      put('fund', 6 + i, X.fund - 3.5 * S + col * S, layer * S, -depth * S + S);
    }
    order.forEach(function (id) {
      cells.setState(id, home[id].key === 'research' ? 'kept' : home[id].key === 'desk' ? 'live' : 'unrun');
      if (home[id].key === 'fund') cells.setRimOverride(id, C.P.g2);
      cells.setScale(id, 0.0001);
    });
    var labels = { desk: C.label(slot, 'desk · 1 seat · 1 cell'), research: C.label(slot, 'research · 5 seats · kept', 'scene-label--kept'), fund: C.label(slot, 'fund · firm wide · 48 cells') };
    var focused = null, risen = false, riseT0 = -1;
    var camX = X.desk, p = 0, first = true;
    var v = new T.Vector3();
    ctx.frame = function (dt, now) {
      if (riseT0 < 0) riseT0 = now;
      var target = p < 0.5 ? C.lerp(X.desk, X.fund, p / 0.5) : C.lerp(X.fund, X.research, (p - 0.5) / 0.5);
      var k = first ? 1 : 1 - Math.pow(0.9, dt * 60);
      camX += (target - camX) * k;
      ctx.camera.position.set(camX, 2.4, 9.5);
      ctx.camera.lookAt(camX, 1.1, 0);
      ctx.camera.updateMatrixWorld();
      /* the columns stand up: every cell rises from the floor 40ms after the one before it, Desk, Research, then Fund */
      order.forEach(function (id, n) {
        var t = C.clamp((now - riseT0 - n * 0.04) / C.DUR.base, 0, 1);
        var e = C.EASE.latch(t);
        var h = home[id];
        cells.setScale(id, Math.max(0.0001, e));
        cells.setPosition(id, h.x, -CELL / 2 + (h.y + CELL / 2) * e, h.z);
        var hot = focused === h.key;
        if (h.key === 'fund') cells.setRimOverride(id, hot ? C.P.g3 : C.P.g2);
        else if (h.key === 'desk') cells.setRimOverride(id, hot ? null : (Math.sin(Math.floor(now) / 6 * Math.PI * 2) > 0 ? C.P.g3 : C.P.g2));
      });
      cells.commit(now);
      var tops = { desk: 0, research: 4 * S, fund: S };
      Object.keys(groups).forEach(function (key) {
        v.set(X[key] - (key === 'fund' ? 3.5 * S + CELL / 2 : CELL / 2), tops[key] + CELL / 2 + 0.15, key === 'fund' ? S : 0);
        /* the fund label sits 12px higher so it clears the top row of the field's cubes (pass 5) */
        C.place(ctx, labels[key], v, 0, key === 'fund' ? -26 : -14);
      });
      first = false;
    };
    var st = C.progress(slot.closest('section') || slot, function (val) { p = val; ctx.start(); }, { start: 'top 90%', end: 'bottom 60%' });
    ctx.start();
    return {
      ctx: ctx,
      setProgress: function (val) { p = C.clamp(val, 0, 1); ctx.start(); },
      focus: function (key) { focused = key; ctx.start(); },
      dispose: function () { if (st && st.kill) st.kill(); ctx.dispose(); }
    };
  };
})();
