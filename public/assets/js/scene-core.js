/* Astroquanta scene core (pass 4). The one instrument every page scene is a variation of: the trial cell as a box
   with a hairline rim, the six palette tokens and nothing else, Latch and Settle as JS easings, one WebGL canvas per
   page created after first paint, pixel ratio capped at 1.5, the loop paused offscreen and on hidden tabs, everything
   disposed on pagehide. Scenes register on AQ.scenes[name] and return { setProgress, tick, dispose, latticeRect }. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  var T = window.THREE;
  if (!T) return;

  var HEX = { ground: 0x0A0C0B, hair: 0x1F2422, g1: 0x3B423F, g2: 0x7E8682, g3: 0xD8DBD8, kept: 0x9BE15D };
  var P = {};
  Object.keys(HEX).forEach(function (k) { P[k] = new T.Color(HEX[k]); });

  /* cubic bezier solver so GSAP tweens, CSS transitions and the scenes share one signature */
  function bezier(x1, y1, x2, y2) {
    function a(a1, a2) { return 1 - 3 * a2 + 3 * a1; }
    function b(a1, a2) { return 3 * a2 - 6 * a1; }
    function c(a1) { return 3 * a1; }
    function calc(t, a1, a2) { return ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t; }
    function slope(t, a1, a2) { return 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 6; i++) { var s = slope(t, x1, x2); if (s === 0) break; t -= (calc(t, x1, x2) - x) / s; }
      return calc(t, y1, y2);
    };
  }
  var EASE = { latch: bezier(0.7, 0, 0.1, 1), settle: bezier(0.12, 0.7, 0.16, 1), step: function (x) { return x >= 1 ? 1 : 0; } };
  var DUR = { fast: 0.12, base: 0.36, slow: 0.9 };

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ------------------------------------------------------------------------------------------------
     mount: renderer, scene, camera, the visibility discipline
     ------------------------------------------------------------------------------------------------ */
  /* the low power path (pass 6): on a software rasteriser (SwiftShader, llvmpipe, Mesa offscreen) the multisample
     resolve of a 1.5x framebuffer is what breaks the 55fps budget, so the pixel ratio is capped at 1.25 there
     (the remedy order in pass 6 is pixel ratio first); MSAA stays on everywhere so the hairline rims keep their
     quality, and a GPU keeps the 1.5 cap. AQ.forcePixelRatio (QA only) overrides the cap for measurement runs. */
  var SOFTWARE_GL = (function () {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return false;
      var d = gl.getExtension('WEBGL_debug_renderer_info');
      var r = String((d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '');
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|mesa offscreen|basic render/i.test(r);
    } catch (e) { return false; }
  })();
  AQ.softwareGL = SOFTWARE_GL;

  function mount(slot, opts) {
    opts = opts || {};
    var canvas = document.createElement('canvas');
    canvas.className = 'scene-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    } catch (e) { return null; }
    var cap = SOFTWARE_GL ? 1.25 : 1.5;
    renderer.setPixelRatio(AQ.forcePixelRatio || Math.min(window.devicePixelRatio || 1, cap));
    renderer.setClearColor(HEX.ground, 1);
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(opts.fov || 45, 1, 0.1, 400);
    slot.appendChild(canvas);
    slot.classList.add('has-scene');

    var ctx = { renderer: renderer, scene: scene, camera: camera, slot: slot, canvas: canvas, ox: 0, visible: true, hidden: document.hidden, running: false, w: 1, h: 1, frame: null, disposed: false, onResize: null };
    /* opts.right: the canvas covers only the right fraction of the slot (the corridor draws in the stage's right
       half, so the framebuffer is half the pixels) */
    if (opts.right) { canvas.style.left = ((1 - opts.right) * 100) + '%'; canvas.style.width = (opts.right * 100) + '%'; canvas.style.setProperty('width', (opts.right * 100) + '%', 'important'); }
    function size() {
      var r = slot.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width * (opts.right || 1))), h = Math.max(1, Math.round(r.height));
      ctx.ox = opts.right ? Math.round(r.width * (1 - opts.right)) : 0;
      if (w === ctx.w && h === ctx.h) return;
      ctx.w = w; ctx.h = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (ctx.onResize) ctx.onResize(w, h);
    }
    size();
    var ro = ('ResizeObserver' in window) ? new ResizeObserver(size) : null;
    if (ro) ro.observe(slot); else window.addEventListener('resize', size);

    var last = 0;
    function loop(now) {
      if (ctx.disposed) return;
      ctx.running = ctx.visible && !ctx.hidden;
      if (!ctx.running) { ctx.raf = null; return; }
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      if (ctx.frame) ctx.frame(dt, now / 1000);
      renderer.render(scene, camera);
      ctx.raf = window.requestAnimationFrame(loop);
    }
    function kick() { if (!ctx.raf && !ctx.disposed && ctx.visible && !ctx.hidden) { last = 0; ctx.raf = window.requestAnimationFrame(loop); } }
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { ctx.visible = e.isIntersecting; if (ctx.visible) kick(); });
    }, { rootMargin: '80px 0px' }) : null;
    if (io) io.observe(slot);
    function vis() { ctx.hidden = document.hidden; if (!ctx.hidden) kick(); }
    document.addEventListener('visibilitychange', vis);

    ctx.start = kick;
    ctx.renderOnce = function () { size(); if (ctx.frame) ctx.frame(0, performance.now() / 1000); renderer.render(scene, camera); };
    ctx.project = function (v, out) {
      var p = v.clone().project(camera);
      out = out || {};
      out.x = (p.x + 1) / 2 * ctx.w; out.y = (1 - p.y) / 2 * ctx.h; out.behind = p.z > 1 || p.z < -1;
      return out;
    };
    ctx.dispose = function () {
      if (ctx.disposed) return;
      ctx.disposed = true;
      if (ctx.raf) window.cancelAnimationFrame(ctx.raf);
      if (io) io.disconnect();
      if (ro) ro.disconnect(); else window.removeEventListener('resize', size);
      document.removeEventListener('visibilitychange', vis);
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); }); else o.material.dispose(); }
      });
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      slot.classList.remove('has-scene');
    };
    window.addEventListener('pagehide', ctx.dispose, { once: true });
    return ctx;
  }

  /* ------------------------------------------------------------------------------------------------
     cells: N trial cells as one InstancedMesh (fill) plus one LineSegments (the 1px rim, 12 edges a cell).
     States: 'unrun' (ground fill, hairline rim), 'live' (ground fill, grey 3 rim), 'killed' (grey 1 fill and rim),
     'kept' (accent fill and rim). Fills Latch in 120ms, the kept state Settles in 360ms.
     ------------------------------------------------------------------------------------------------ */
  /* 'dead' is the killed state at grey 2 for the 3D scenes, where a cell may be 20px at the far end of a corridor and
     grey 1 would not read; the DOM grids keep the kit's grey 1 */
  var STATE_FILL = { unrun: P.ground, live: P.ground, killed: P.g1, dead: P.g2, kept: P.kept, ground: P.ground };
  var STATE_RIM = { unrun: P.hair, live: P.g3, killed: P.g1, dead: P.g2, kept: P.kept, ground: P.ground };
  var EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

  function makeCells(n, size, height, depth) {
    size = size || 1; height = height || size; depth = depth || 0.22 * size;
    var geo = new T.BoxGeometry(size, height, depth);
    var mat = new T.MeshBasicMaterial({ color: 0xffffff });
    var mesh = new T.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    var m4 = new T.Matrix4();
    var pos = new Float32Array(n * 3);
    var scl = new Float32Array(n); for (var s = 0; s < n; s++) scl[s] = 1;
    var lineGeo = new T.BufferGeometry();
    var lpos = new Float32Array(n * 24 * 3);
    var lcol = new Float32Array(n * 24 * 3);
    lineGeo.setAttribute('position', new T.BufferAttribute(lpos, 3).setUsage(T.DynamicDrawUsage));
    lineGeo.setAttribute('color', new T.BufferAttribute(lcol, 3).setUsage(T.DynamicDrawUsage));
    var lines = new T.LineSegments(lineGeo, new T.LineBasicMaterial({ vertexColors: true }));
    var hx = size / 2, hy = height / 2, hz = depth / 2;
    var corners = [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz]];
    var cells = [];
    var fillNow = new T.Color(), rimNow = new T.Color();
    for (var i = 0; i < n; i++) {
      cells.push({ state: 'unrun', fillFrom: P.ground.clone(), fillTo: P.ground.clone(), rimFrom: P.hair.clone(), rimTo: P.hair.clone(), t0: -1, dur: DUR.fast, ease: EASE.latch, rimOverride: null, dirty: true });
      mesh.setColorAt(i, P.ground);
    }
    var group = new T.Group();
    group.add(mesh); group.add(lines);

    var api = {
      group: group, mesh: mesh, lines: lines, n: n, cells: cells, size: size, height: height, depth: depth,
      setPosition: function (i, x, y, z) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; cells[i].dirty = true; },
      getZ: function (i) { return pos[i * 3 + 2]; },
      getPosition: function (i, out) { out = out || new T.Vector3(); out.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); return out; },
      setScale: function (i, k) { scl[i] = k; cells[i].dirty = true; },
      /* set the state with a timed transition (now in seconds); immediate when now is undefined */
      setState: function (i, state, now) {
        var c = cells[i];
        if (c.state === state) return;
        var fill = STATE_FILL[state], rim = STATE_RIM[state];
        if (now === undefined) { c.fillFrom.copy(fill); c.fillTo.copy(fill); c.rimFrom.copy(rim); c.rimTo.copy(rim); c.t0 = -1; }
        else {
          var cf = c.t0 < 0 ? c.fillTo : api.currentFill(i, now, fillNow);
          var cr = c.t0 < 0 ? c.rimTo : api.currentRim(i, now, rimNow);
          c.fillFrom.copy(cf); c.rimFrom.copy(cr);
          c.fillTo.copy(fill); c.rimTo.copy(rim);
          c.t0 = now;
          c.dur = state === 'kept' ? DUR.base : DUR.fast;
          c.ease = state === 'kept' ? EASE.settle : EASE.latch;
        }
        c.state = state; c.dirty = true;
      },
      /* an override colour for the rim only (the standby breathing); null clears it */
      setRimOverride: function (i, color) { var c = cells[i]; if (c.rimOverride !== color) { c.rimOverride = color; c.dirty = true; } },
      currentFill: function (i, now, out) {
        var c = cells[i]; out = out || new T.Color();
        if (c.t0 < 0) return out.copy(c.fillTo);
        var k = c.ease(clamp((now - c.t0) / c.dur, 0, 1));
        return out.copy(c.fillFrom).lerp(c.fillTo, k);
      },
      currentRim: function (i, now, out) {
        var c = cells[i]; out = out || new T.Color();
        if (c.rimOverride && c.t0 < 0) return out.copy(c.rimOverride);
        if (c.t0 < 0) return out.copy(c.rimTo);
        var k = c.ease(clamp((now - c.t0) / c.dur, 0, 1));
        return out.copy(c.rimFrom).lerp(c.rimTo, k);
      },
      /* write every dirty or transitioning cell; call once per frame */
      commit: function (now) {
        var anyColor = false, anyMatrix = false, anyLine = false;
        for (var i = 0; i < n; i++) {
          var c = cells[i];
          var transitioning = c.t0 >= 0 && now - c.t0 <= c.dur + 0.05;
          if (!c.dirty && !transitioning) continue;
          if (c.t0 >= 0 && now - c.t0 > c.dur + 0.05) { c.t0 = -1; }
          var x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], k = scl[i];
          m4.makeScale(k, k, k); m4.setPosition(x, y, z);
          mesh.setMatrixAt(i, m4);
          anyMatrix = true;
          api.currentFill(i, now, fillNow);
          mesh.setColorAt(i, fillNow);
          anyColor = true;
          api.currentRim(i, now, rimNow);
          for (var e = 0; e < 12; e++) {
            var a = corners[EDGES[e][0]], b = corners[EDGES[e][1]];
            var o = (i * 24 + e * 2) * 3;
            lpos[o] = x + a[0] * k; lpos[o + 1] = y + a[1] * k; lpos[o + 2] = z + a[2] * k;
            lpos[o + 3] = x + b[0] * k; lpos[o + 4] = y + b[1] * k; lpos[o + 5] = z + b[2] * k;
            lcol[o] = rimNow.r; lcol[o + 1] = rimNow.g; lcol[o + 2] = rimNow.b;
            lcol[o + 3] = rimNow.r; lcol[o + 4] = rimNow.g; lcol[o + 5] = rimNow.b;
          }
          anyLine = true;
          c.dirty = false;
        }
        if (anyMatrix) mesh.instanceMatrix.needsUpdate = true;
        if (anyColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        if (anyLine) { lineGeo.attributes.position.needsUpdate = true; lineGeo.attributes.color.needsUpdate = true; lineGeo.computeBoundingSphere(); }
      }
    };
    return api;
  }

  /* a hairline rectangle (a gate plane, a frame border) as LineSegments */
  function hairRect(w, h, color) {
    var g = new T.BufferGeometry();
    var hw = w / 2, hh = h / 2;
    g.setAttribute('position', new T.Float32BufferAttribute([-hw, -hh, 0, hw, -hh, 0, hw, -hh, 0, hw, hh, 0, hw, hh, 0, -hw, hh, 0, -hw, hh, 0, -hw, -hh, 0], 3));
    return new T.LineSegments(g, new T.LineBasicMaterial({ color: color || HEX.hair }));
  }

  /* a DOM label the scene positions by projecting a world point */
  function label(slot, text, cls) {
    var el = document.createElement('span');
    el.className = 'scene-label' + (cls ? ' ' + cls : '');
    el.textContent = text;
    el.setAttribute('aria-hidden', 'true');
    slot.appendChild(el);
    return el;
  }
  function place(ctx, el, v, dx, dy) {
    var p = ctx.project(v);
    if (p.behind || p.x < -40 || p.x > ctx.w + 40 || p.y < -40 || p.y > ctx.h + 40) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible';
    /* a label never runs past the canvas's right edge (pass 6): clamp by its own width */
    var x = p.x + (ctx.ox || 0) + (dx || 0), maxX = (ctx.w + (ctx.ox || 0)) - (el.offsetWidth || 0) - 8;
    if (x > maxX) x = Math.max(0, maxX);
    if (x < 4) x = 4;
    el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(p.y + (dy || 0)) + 'px)';
  }

  /* the reduced motion and mobile poster: an inline SVG of cells in their final state, on the kit grid */
  function posterSVG(cols, rows, states, cell, gap, extra) {
    cell = cell || 12; gap = gap || 2;
    var w = cols * cell + (cols - 1) * gap, h = rows * cell + (rows - 1) * gap;
    var out = '<svg class="scene-poster" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">';
    for (var i = 0; i < cols * rows; i++) {
      var st = states[i] || 'unrun';
      var x = (i % cols) * (cell + gap) + 0.5, y = Math.floor(i / cols) * (cell + gap) + 0.5;
      var fill = st === 'killed' ? '#3B423F' : st === 'kept' ? '#9BE15D' : 'none';
      var stroke = st === 'killed' ? '#3B423F' : st === 'kept' ? '#9BE15D' : st === 'live' ? '#D8DBD8' : '#1F2422';
      out += '<rect class="poster-cell is-' + st + '" data-i="' + i + '" x="' + x + '" y="' + y + '" width="' + (cell - 1) + '" height="' + (cell - 1) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1"/>';
    }
    out += (extra || '') + '</svg>';
    return out;
  }

  /* scroll progress of an element through the viewport, 0 when its top meets the viewport bottom and 1 when its
     bottom meets the viewport top (ScrollTrigger when loaded, a scroll listener otherwise) */
  function progress(el, onUpdate, opts) {
    opts = opts || {};
    var start = opts.start || 'top bottom', end = opts.end || 'bottom top';
    if (window.ScrollTrigger && window.gsap) {
      return window.ScrollTrigger.create({ trigger: el, start: start, end: end, onUpdate: function (self) { onUpdate(self.progress); } });
    }
    var fn = function () {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      onUpdate(p);
    };
    window.addEventListener('scroll', fn, { passive: true });
    window.addEventListener('resize', fn);
    fn();
    return { kill: function () { window.removeEventListener('scroll', fn); window.removeEventListener('resize', fn); } };
  }

  /* FNV 1a and mulberry32 (the /sweep generator) so the post curves seed from their slugs */
  function fnv1a(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
  function mulberry32(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function walk(seedText, points, drift, vol) {
    var rnd = mulberry32(fnv1a(seedText)), y = 0, out = [];
    for (var i = 0; i < points; i++) {
      var u1 = Math.max(rnd(), 1e-9), u2 = rnd();
      var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      y += drift + z * vol; out.push(y);
    }
    return out;
  }

  AQ.core = { T: T, HEX: HEX, P: P, EASE: EASE, DUR: DUR, bezier: bezier, clamp: clamp, lerp: lerp, mount: mount, makeCells: makeCells, hairRect: hairRect, label: label, place: place, posterSVG: posterSVG, progress: progress, fnv1a: fnv1a, mulberry32: mulberry32, walk: walk };
  AQ.scenes = AQ.scenes || {};
  if (typeof AQ.onCoreReady === 'function') AQ.onCoreReady();
})();
