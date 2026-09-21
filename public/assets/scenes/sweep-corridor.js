/* The Sweep Corridor (Home). 48 instanced trial cells laid as a tilted lattice, 8 wide by 6 deep, travelling ahead of
   the camera down a corridor of four hairline gate planes. At each plane the cells that die turn grey 2 and drop out
   of the lattice to the corridor floor (Latch), hold their depth and fall behind the camera: 17 at point in time, 0 at walk
   forward, 17 at costs, 8 at capacity; the 6 survivors Settle to the accent. At 80 percent of the pinned arc the
   camera makes its one turn: it rises behind the survivors and looks back down the corridor at 42 grey cells in three
   clusters and 6 green at the front, the wow moment "Forty Eight to Six". Idle: the rims breathe one grey step at 1Hz. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};

  AQ.scenes['sweep-corridor'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var GATE_OF_INDEX = opts.gateOfIndex;
    var GATE_P = [0.18, 0.38, 0.58, 0.76];
    var GATE_NAMES = ['01 · point in time', '02 · walk forward', '03 · costs and slippage', '04 · capacity'];
    /* between the 1024 and 1249 viewports (a stage under 1010px) the lattice is six wide and eight deep, the same 48
       cells, so it fits whole beside the 480px type column and never crosses it (round 2) */
    var stageW0 = slot.clientWidth || 1200;
    var CELL = 0.6, GAP = 0.08, S = CELL + GAP, COLS = stageW0 < 1010 ? 6 : 8, ROWS = 48 / COLS;
    var RAMP = 0.5;                                /* each row further back sits half a unit higher: the lattice tilts toward the camera */
    var FLOOR = -1.6;                              /* a killed cell drops out of the lattice to the corridor floor, below the camera's view once passed */
    /* responsive tuning (pass 6): the design values hold at the 1200px stage (the 1440 viewport) and above; on a narrower
       stage the lattice travels further ahead (smaller on screen) and the corridor axis sits further right, so the
       near row clears the type column down to a 784px stage (the 1024 viewport). AQ.corridorTuning overrides (QA). */
    var stageW = slot.clientWidth || 1200;
    var narrow = Math.max(0, 1200 - stageW);
    var RIGHT = 0.64;                              /* the canvas is the stage's right 64 percent: the type column keeps its own ground and the framebuffer is smaller */
    /* on the narrow stage (round 2) the canvas starts 12px right of the longest type line, so no plane, cell or label
       can cross the headline, the subhead, the Fraction or the gate log; the corridor continues off the canvas edges */
    var typeRight = 0;
    if (COLS === 6) {
      document.querySelectorAll('.hero__lockup h1, .hero__lockup .subhead, .hero__lockup a, .hero__fraction').forEach(function (el) {
        var rg = document.createRange(); rg.selectNodeContents(el);
        var rects = rg.getClientRects(); for (var q = 0; q < rects.length; q++) typeRight = Math.max(typeRight, rects[q].right);
      });
      var sr0 = slot.getBoundingClientRect();
      if (typeRight > 0 && sr0.width > 0) RIGHT = C.clamp((sr0.right - typeRight - 12) / sr0.width, 0.26, 0.64);
    }
    /* the wide stage (round 2, 1920): the canvas runs from the design's start (36 percent of a 1200 stage) to the
       viewport edge; the camera keeps the 1440 framing (its frustum is the design canvas) and the extra width on the
       right simply shows more corridor, so the lattice sits where it does at 1440 */
    var WIDE = stageW0 > 1200;
    if (WIDE) RIGHT = 1 - (0.36 * 1200) / stageW0;
    var designCanvasW = WIDE ? 0.64 * 1200 : RIGHT * stageW0;
    var canvasW0 = RIGHT * stageW0;
    /* finisher (1920): the frustum is the whole canvas and the lattice travels closer in proportion, so the near row keeps
       about 64 percent of the canvas width as it does at 1440 and the corridor uses the band instead of leaving it dead */
    /* the near row's width in pixels goes with the canvas height over the lead (493px at 1440 is 6.57 times 900 over 12),
       so the lead that keeps 64 percent of a canvas w by h is 10.27 h / w: 12.0 at 1440, 8.9 at 1920 by 1080 */
    var WIDE_K = WIDE ? C.clamp((10.27 * (slot.clientHeight || 900) / canvasW0) / 12, 0.6, 1) : 1;
    /* six wide: the lattice's near row takes about 72 percent of the canvas width (8 cells at lead 12 measure 493px on the
       1440 stage, so 6 cells measure 4437 / lead) */
    var LEAD = (window.AQ.corridorTuning && window.AQ.corridorTuning.lead) || (COLS === 6 ? C.clamp(4437 / (0.72 * canvasW0), 14, 26) : (12 + narrow / 40) * WIDE_K);  /* the lattice's front row travels 12 units ahead of the camera (pass 5 round 2: 9 before; at 12 no gate plane exceeds x 1416 at any snap, the near row rims stay right of the type column) */
    var CAM_Y = 2.0;
    var TRAVEL = 28, SPEED = TRAVEL / 0.8;
    var GATE_Z = GATE_P.map(function (p) { return -SPEED * p; });
    var SHIFT = (window.AQ.corridorTuning && window.AQ.corridorTuning.shift !== undefined) ? window.AQ.corridorTuning.shift : (opts.shift === undefined ? (COLS === 6 ? 0 : 0.12 + narrow / 2600) : opts.shift);   /* the corridor axis sits right of the type column's longest line (0.12 with the lattice 12 units ahead) */
    var FOV = (window.AQ.corridorTuning && window.AQ.corridorTuning.fov) || 45;

    var ctx = C.mount(slot, { fov: FOV, right: RIGHT });
    if (!ctx) return null;
    var lockup = document.querySelector('.hero__lockup');
    ctx.onResize = function (w, h) {
      var sh = slot.clientWidth < 700 ? 0 : SHIFT;
      var fw = w;                                             /* the frustum is the canvas at every width (finisher: the wide stage too) */
      ctx.camera.aspect = fw / h;
      ctx.camera.setViewOffset(fw, h, -sh * fw, 0, w, h);
    };
    ctx.onResize(ctx.w, ctx.h);

    var cells = C.makeCells(48, CELL, 0.14, CELL);
    ctx.scene.add(cells.group);
    var PLANE_W = COLS * S + 0.16, PLANE_H = ROWS * RAMP + 1.2 - FLOOR, PLANE_Y = (ROWS * RAMP + 0.2 + FLOOR) / 2;
    var planes = GATE_Z.map(function (z) {
      var r = C.hairRect(PLANE_W, PLANE_H, C.HEX.g3);
      r.position.set(0, PLANE_Y, z);
      ctx.scene.add(r);
      return r;
    });
    var labels = GATE_NAMES.map(function (n) { return C.label(slot, n, 'scene-label--g3'); });
    var cornerV = new T.Vector3(), edgeA = new T.Vector3(), edgeB = new T.Vector3();
    var planeColor = new T.Color(C.HEX.g3), groundColor = new T.Color(C.HEX.ground);

    /* home positions: row 0 of the DOM grid is the far row, row 5 the near row */
    var home = [];
    for (var i = 0; i < 48; i++) {
      var col = i % COLS, row = Math.floor(i / COLS), back = ROWS - 1 - row;
      home.push({ x: (col - (COLS - 1) / 2) * S, y: back * RAMP, z: -back * S });
    }
    var dropT0 = []; for (var d = 0; d < 48; d++) dropT0.push(-1);

    var target = 0, p = 0, first = true;
    var camPos = new T.Vector3(), lookAt = new T.Vector3();
    var END_Z = -TRAVEL;                                     /* the front row's z at p 0.8 */
    /* six wide (the narrow canvas): the elevation camera sits higher and further back so the three clusters and the six
       survivors fit the narrower frame */
    var elevPos = COLS === 6 ? new T.Vector3(0, 19, END_Z - ROWS * S - 16) : new T.Vector3(0, 11, END_Z - ROWS * S - 7);
    var elevLook = new T.Vector3(0, 0.4, END_Z + 4);
    var stateCount = 48, lastCount = -1;

    function countAt(pp) { var c = 48; if (pp >= GATE_P[0]) c -= 17; if (pp >= GATE_P[2]) c -= 17; if (pp >= GATE_P[3]) c -= 8; return c; }

    ctx.frame = function (dt, now) {
      var k = first ? 1 : 1 - Math.pow(0.92, dt * 60);
      p = p + (target - p) * k;
      if (Math.abs(target - p) < 0.0005) p = target;
      var dolly = Math.min(p, 0.8);
      var latZ = -SPEED * dolly;
      var camZ = p <= 0.8 ? latZ + LEAD : C.lerp(END_Z + LEAD, elevPos.z, C.EASE.latch((p - 0.8) / 0.2));
      var idle = target < 0.004 && p < 0.004;
      for (var i = 0; i < 48; i++) {
        var gi = GATE_OF_INDEX[i] - 1;
        var h = home[i];
        var z = latZ + h.z, y = h.y, state = 'live';
        if (gi < 4 && p >= GATE_P[gi]) {
          state = 'dead';
          z = GATE_Z[gi] + h.z;
          if (dropT0[i] < 0) dropT0[i] = first ? now - 1 : now;
          y = h.y + (FLOOR - h.y) * C.EASE.latch(C.clamp((now - dropT0[i]) / C.DUR.base, 0, 1));
          /* finisher send back: a fallen cell the camera is about to pass steps to the ground colour 8.2 units ahead of the
             camera (the floor at minus 1.6 leaves the frame's bottom edge at 7.5 units with the camera looking 3.7 degrees down) and shrinks away by 7.6, so no
             cell is ever cut flat by the frame edge or the near plane; it returns when the visitor scrolls back */
          var ahead = camZ - z;
          if (ahead < 8.2) { state = "ground"; cells.setScale(i, C.clamp((ahead - 7.6) / 0.5, 0, 1)); } else cells.setScale(i, 1);
        } else {
          cells.setScale(i, 1);
          dropT0[i] = -1;
          if (gi === 4 && p >= GATE_P[3]) state = 'kept';
        }
        cells.setPosition(i, h.x, y, z);
        cells.setState(i, state, first ? undefined : now);
        if (idle && state === 'live') {
          var v = Math.sin((Math.floor(now) / 6 + i / 48) * Math.PI * 2);
          cells.setRimOverride(i, v > 0 ? C.P.g3 : C.P.g2);
        } else cells.setRimOverride(i, null);
        if (state === 'dead') cells.cells[i].dirty = true;
      }
      cells.commit(now);

      if (p <= 0.8) {
        camPos.set(0, CAM_Y, latZ + LEAD);
        lookAt.set(0, 1.0, latZ - 3.5);
      } else {
        var t = C.EASE.latch((p - 0.8) / 0.2);
        camPos.set(0, C.lerp(CAM_Y, elevPos.y, t), C.lerp(END_Z + LEAD, elevPos.z, t));
        lookAt.set(0, C.lerp(1.0, elevLook.y, t), C.lerp(END_Z - 3.5, elevLook.z, t));
      }
      ctx.camera.position.copy(camPos);
      ctx.camera.lookAt(lookAt);
      ctx.camera.updateMatrixWorld();

      /* plane labels hang off each plane's top left corner, clamped inside the canvas (20px from its right edge, so
         inside x 1420 at 1440) and, in the caption band at the top, right of the type column */
      /* during the dolly only the next gate ahead is labelled (the far planes' corners stack inside the nearer planes,
         so their labels would sit on a nearer plane's hairline); at the elevation all four read */
      var nextGate = -1;
      if (p <= 0.8) { for (var q = 0; q < 4; q++) { if (GATE_Z[q] <= camPos.z - 0.5) { nextGate = q; break; } } }
      for (var j = 0; j < 4; j++) {
        /* finisher: a plane wider than the canvas (passing the camera) fades to the ground over the next 40 percent of
           growth, so only planes that fit the frame draw; behind the camera it is off */
        var pa = ctx.project(edgeA.set(-PLANE_W / 2, PLANE_Y, GATE_Z[j])), pb = ctx.project(edgeB.set(PLANE_W / 2, PLANE_Y, GATE_Z[j]));
        var pw = Math.abs(pb.x - pa.x), fade = (pa.behind || pb.behind) ? 1 : C.clamp((pw / ctx.w - 1) / 0.4, 0, 1);
        planes[j].visible = fade < 1;
        if (fade < 1) planes[j].material.color.copy(planeColor).lerp(groundColor, fade);
        cornerV.set(-PLANE_W / 2, PLANE_Y + PLANE_H / 2, GATE_Z[j]);
        var behind = p <= 0.8 && (GATE_Z[j] > camPos.z - 0.5 || j !== nextGate);
        if (behind) { labels[j].style.visibility = 'hidden'; continue; }
        var pr = ctx.project(cornerV);
        if (pr.behind) { labels[j].style.visibility = 'hidden'; continue; }
        var lw = labels[j].offsetWidth || 140, lx = pr.x, ly = pr.y - 16;
        /* at the elevation the costs label sits 10px higher so it clears the top slabs of its cluster (pass 5) */
        if (p > 0.8 && j === 2) ly -= 10 * C.EASE.latch((p - 0.8) / 0.2);
        /* in the caption band at the top the label stays right of the type column (its measured edge, 889 at 1440);
           the canvas's right edge wins when the two conflict on a narrow stage (pass 6) */
        var sr = slot.getBoundingClientRect();
        var typeRight = lockup ? lockup.getBoundingClientRect().right + 12 : 900;
        var minX = ly < 330 ? Math.max(0, typeRight - ctx.ox - sr.left) : 0;
        lx = Math.min(Math.max(minX, lx), ctx.w - 24 - lw);
        labels[j].style.visibility = 'visible';
        labels[j].style.transform = 'translate(' + Math.round(lx + ctx.ox) + 'px,' + Math.round(ly) + 'px)';
      }

      stateCount = countAt(p);
      if (stateCount !== lastCount) { lastCount = stateCount; if (opts.onCount) opts.onCount(stateCount, p); }
      if (opts.onProgress) opts.onProgress(p);
      first = false;
    };

    /* pointer proximity: the nearest cell's rim brightens one step and a mono tooltip reports its trial */
    var ray = new T.Raycaster(), mouse = new T.Vector2(), hovered = -1;
    function pick(clientX, clientY) {
      var r = ctx.canvas.getBoundingClientRect();
      mouse.x = ((clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, ctx.camera);
      var hits = ray.intersectObject(cells.mesh);
      var id = hits.length ? hits[0].instanceId : -1;
      if (id !== hovered) { hovered = id; if (opts.onHover) opts.onHover(id, clientX - r.left, clientY - r.top); }
      else if (id >= 0 && opts.onHover) opts.onHover(id, clientX - r.left, clientY - r.top);
    }
    var stage = opts.pointerTarget || slot;
    stage.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; pick(e.clientX, e.clientY); }, { passive: true });
    stage.addEventListener('pointerdown', function (e) { pick(e.clientX, e.clientY); });
    stage.addEventListener('pointerleave', function () { if (hovered !== -1) { hovered = -1; if (opts.onHover) opts.onHover(-1); } });

    ctx.start();
    return {
      ctx: ctx,
      setProgress: function (v) { target = C.clamp(v, 0, 1); ctx.start(); },
      getProgress: function () { return p; },
      count: function () { return stateCount; },
      /* the screen rectangle of the lattice at rest (its far and near rows' extents), for the loader's Flip hand off */
      latticeRect: function () {
        var far = ctx.project(new T.Vector3(home[0].x - CELL / 2, home[0].y, home[0].z));
        var farR = ctx.project(new T.Vector3(home[7].x + CELL / 2, home[7].y, home[7].z));
        var near = ctx.project(new T.Vector3(home[40].x - CELL / 2, home[40].y, home[40].z + CELL / 2));
        var nearR = ctx.project(new T.Vector3(home[47].x + CELL / 2, home[47].y, home[47].z + CELL / 2));
        var r = ctx.canvas.getBoundingClientRect();
        var left = Math.min(far.x, near.x), right = Math.max(farR.x, nearR.x), top = Math.min(far.y, farR.y), bottom = Math.max(near.y, nearR.y);
        return { left: r.left + left, top: r.top + top, width: right - left, height: bottom - top };
      },
      /* QA probe: the projected page x extents of every gate plane and of the lattice's near row at the current p */
      probe: function () {
        var r = ctx.canvas.getBoundingClientRect(), out = { planes: [], near: null, p: p };
        planes.forEach(function (pl, j) {
          var a = ctx.project(new T.Vector3(-PLANE_W / 2, PLANE_Y - PLANE_H / 2, GATE_Z[j])), b2 = ctx.project(new T.Vector3(PLANE_W / 2, PLANE_Y - PLANE_H / 2, GATE_Z[j]));
          var c2 = ctx.project(new T.Vector3(-PLANE_W / 2, PLANE_Y + PLANE_H / 2, GATE_Z[j])), d2 = ctx.project(new T.Vector3(PLANE_W / 2, PLANE_Y + PLANE_H / 2, GATE_Z[j]));
          out.planes.push({ behind: a.behind || b2.behind, left: Math.round(r.left + Math.min(a.x, c2.x)), right: Math.round(r.left + Math.max(b2.x, d2.x)) });
        });
        var nl = ctx.project(new T.Vector3(home[40].x - CELL / 2, home[40].y, home[40].z + CELL / 2 + (p <= 0.8 ? -SPEED * Math.min(p, 0.8) : END_Z))), nr = ctx.project(new T.Vector3(home[47].x + CELL / 2, home[47].y, home[47].z + CELL / 2 + (p <= 0.8 ? -SPEED * Math.min(p, 0.8) : END_Z)));
        out.near = { left: Math.round(r.left + nl.x), right: Math.round(r.left + nr.x) };
        return out;
      },
      dispose: ctx.dispose
    };
  };
})();
