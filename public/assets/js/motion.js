/* Astroquanta motion runtime (pass 4). Flags and QA hooks (?qa=rm, ?qa=arc, ?qa=fps, ?qa=noloader), the loader as
   overture (the 48 cell fill gauge bound to real load, skip visible, 4s cap, Flip hand off into the hero lattice),
   the lazy library boot after first paint (Three.js r128, GSAP with ScrollTrigger, Flip and CustomEase, cdnjs first
   and /vendor on error), one scene per route from /assets/scenes/<route>.js, the Home corridor wiring (ScrollTrigger
   scrub across the reserved arc with snap to the gates, the Fraction stepping, the rail gate index, the gate
   captions) and the mobile hero (the DOM lattice filling in gate order over the first 1.25 viewport heights). */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  var html = document.documentElement;

  /* flags */
  var qa = (function () { var m = window.location.search.match(/[?&]qa=([a-z,]+)/); return m ? m[1].split(',') : []; })();
  AQ.qa = function (name) { return qa.indexOf(name) !== -1; };
  var RM = AQ.reducedMotion ? AQ.reducedMotion() : (AQ.qa('rm') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  AQ.rm = RM;
  var MOBILE = window.matchMedia('(max-width: 767.98px)').matches;
  /* the Home hero is the 2D gate ordered fill up to 1023 (phone and tablet); the corridor runs from 1024 (round 2) */
  var HERO_2D = window.matchMedia('(max-width: 1023.98px)').matches;
  var COARSE = window.matchMedia('(pointer: coarse)').matches;
  var LOW = (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.connection && navigator.connection.saveData);
  var NO_WEBGL = MOBILE || COARSE || LOW;
  AQ.mobileScene = NO_WEBGL;
  if (RM) { html.classList.add('rm'); html.classList.remove('motion'); } else { html.classList.add('motion'); }

  var GATE_OF_INDEX = [1, 5, 1, 1, 3, 5, 3, 1, 3, 3, 1, 1, 3, 3, 1, 1, 3, 1, 1, 3, 3, 3, 4, 4, 5, 4, 4, 4, 1, 5, 1, 1, 3, 3, 5, 3, 1, 4, 4, 3, 4, 1, 3, 3, 1, 3, 1, 5];
  var GATE_P = [0.18, 0.38, 0.58, 0.76];
  var COUNTS = [48, 31, 31, 14, 6];
  AQ.GATE_OF_INDEX = GATE_OF_INDEX;
  AQ.GATE_P = GATE_P;

  /* gate order for cell fills: gate 1, 2, 3, 4 then the kept cells last */
  AQ.gateOrder = function (cells) {
    var arr = Array.prototype.slice.call(cells);
    return arr.map(function (el, i) { return { el: el, g: parseInt(el.getAttribute('data-gate') || '5', 10) || 5, i: i }; })
      .sort(function (a, b) { return a.g - b.g || a.i - b.i; }).map(function (x) { return x.el; });
  };

  /* ------------------------------------------------------------------------------------------------
     the Fraction as a one step odometer: each changed digit slot clips vertically by one slot in 120ms Latch
     ------------------------------------------------------------------------------------------------ */
  function stepDigit(slot, next) {
    /* a step still in flight lands first, so a fast scrub never nests one clip inside another */
    if (slot._odoDone) slot._odoDone();
    var cur = slot.textContent;
    if (cur === next) return;
    if (RM || !loaderResolved) { slot.textContent = next; return; }
    var h = slot.getBoundingClientRect().height || slot.offsetHeight;
    var odo = document.createElement('span');
    odo.className = 'odo';
    odo.innerHTML = '<span class="odo__a"></span><span class="odo__b"></span>';
    odo.firstChild.textContent = cur || '​';
    odo.lastChild.textContent = next || '​';
    slot.style.height = h + 'px';                      /* the slot keeps its one line height while two rows stack inside it */
    slot.textContent = '';
    slot.appendChild(odo);
    slot.classList.add('is-stepping');
    window.requestAnimationFrame(function () {
      odo.style.transform = 'translateY(' + (-h) + 'px)';
    });
    var done = function () { slot.textContent = next; slot.style.height = ''; slot.classList.remove('is-stepping'); slot._odoDone = null; };
    slot._odoDone = done;
    odo.addEventListener('transitionend', function () { if (slot._odoDone === done) done(); }, { once: true });
    window.setTimeout(function () { if (slot._odoDone === done) done(); }, 260);
  }
  AQ.stepFraction = function (el, num, den) {
    if (!el) return;
    num = String(num); den = String(den);
    if (!el.classList.contains('fraction-setpiece')) {
      var txt = el.textContent, want = txt.replace(/^\d+ \/ \d+/, num + ' / ' + den);
      if (txt !== want) el.textContent = want;
      return;
    }
    var numEl = el.querySelector('.num'), digits = numEl ? numEl.querySelectorAll('.digit') : [];
    var slots = digits.length;
    var padded = num; while (padded.length < slots) padded = ' ' + padded;
    for (var i = 0; i < slots; i++) stepDigit(digits[i], padded.charAt(i) === ' ' ? '' : padded.charAt(i));
    var label = el.getAttribute('aria-label') || '';
    if (label) el.setAttribute('aria-label', label.replace(/^\d+ of \d+/, num + ' of ' + den));
  };

  /* ------------------------------------------------------------------------------------------------
     the loader: a 48 cell gauge bound to real load
     ------------------------------------------------------------------------------------------------ */
  var loader = document.getElementById('loader');
  var loaderResolved = false, loaderWaiters = [];
  /* under motion the Fraction starts at 48 / 48 in grey and steps down with the corridor; the static frame (no
     JavaScript, reduced motion) shows the final 6 / 48 in the accent. Written before the first paint of the digits. */
  (function () {
    if (RM || document.body.getAttribute('data-route') !== 'home') return;
    var f = document.querySelector('[data-setpiece="fraction"]');
    if (f) { var num = f.querySelector('.num'); if (num) { num.classList.remove('is-kept'); var d = num.querySelectorAll('.digit'); if (d.length === 2) { d[0].textContent = '4'; d[1].textContent = '8'; } } f.setAttribute('aria-label', '48 of 48'); }
    var rf = document.querySelector('.rail .fraction'); if (rf) rf.textContent = '48 / 48';
    document.querySelectorAll('.hero__field .lattice li').forEach(function (li) { li.classList.remove('is-fill'); });
  })();
  var SOURCES = { fonts: 8, dom: 6, load: 10, three: 10, gsap: 6, scene: 8 };
  var progress = {};
  var lastCells = -1;
  function loaderPaint() {
    if (!loader) return;
    var total = 0, got = 0;
    Object.keys(SOURCES).forEach(function (k) { total += SOURCES[k]; got += progress[k] ? SOURCES[k] : 0; });
    var cellsOn = Math.min(48, Math.floor(got / total * 48));
    if (cellsOn === lastCells) return;
    lastCells = cellsOn;
    var cells = loader.querySelectorAll('.loader__grid li');
    for (var i = 0; i < cells.length; i++) cells[i].classList.toggle('is-on', i < cellsOn);
    var line = loader.querySelector('[data-loader-count]');
    if (line) line.textContent = String(cellsOn).padStart(2, ' ') + ' / 48';
    loader.setAttribute('aria-valuenow', String(cellsOn));
  }
  AQ.loaderMark = function (key) { if (!progress[key]) { progress[key] = true; loaderPaint(); } };
  AQ.onLoaderResolved = function (fn) { if (loaderResolved) fn(); else loaderWaiters.push(fn); };

  function resolveLoader(reason) {
    if (loaderResolved) return;
    loaderResolved = true;
    html.classList.remove('is-loading');
    var finish = function () {
      if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      html.classList.add('is-loaded');
      loaderWaiters.forEach(function (fn) { fn(); });
      loaderWaiters = [];
    };
    if (!loader || loader.hidden) { finish(); return; }
    if (RM) { loader.classList.add('is-rm-out'); window.setTimeout(finish, 220); return; }
    /* every cell on, then the Flip of the grid into the instrument's anchor */
    loader.querySelectorAll('.loader__grid li').forEach(function (c) { c.classList.add('is-on'); });
    var line = loader.querySelector('[data-loader-count]'); if (line) line.textContent = '48 / 48';
    var grid = loader.querySelector('.loader__grid');
    var target = AQ.flipTarget ? AQ.flipTarget() : null;
    if (!grid || !target || !(target.width > 8)) { loader.classList.add('is-out'); window.setTimeout(finish, 140); return; }
    var from = grid.getBoundingClientRect();
    var sx = target.width / from.width, sy = target.height / from.height;
    var s = Math.min(sx, sy);
    var dx = target.left + target.width / 2 - (from.left + from.width / 2);
    var dy = target.top + target.height / 2 - (from.top + from.height / 2);
    loader.classList.add('is-flipping');
    if (window.gsap && window.Flip) {
      window.gsap.to(grid, { x: dx, y: dy, scale: s, duration: 0.36, ease: 'latch', onComplete: function () {
        html.classList.add('is-loaded');
        loader.classList.add('is-out');
        window.setTimeout(finish, 140);
      } });
    } else {
      grid.style.transition = 'transform 0.36s cubic-bezier(0.7, 0, 0.1, 1)';
      window.requestAnimationFrame(function () { grid.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')'; });
      window.setTimeout(function () { html.classList.add('is-loaded'); loader.classList.add('is-out'); window.setTimeout(finish, 140); }, 380);
    }
    if (AQ.qa('arc') || AQ.qa('fps')) console.log('[aq loader] resolved by ' + reason + ' at ' + Math.round(performance.now()) + 'ms');
  }
  function checkLoader() {
    var all = Object.keys(SOURCES).every(function (k) { return progress[k]; });
    if (all) resolveLoader('load complete');
  }
  if (loader) {
    if (AQ.qa('noloader') || html.classList.contains('noloader')) { loader.hidden = true; resolveLoader('noloader'); }
    else {
      html.classList.add('is-loading');
      var skip = loader.querySelector('[data-loader-skip]');
      if (skip) skip.addEventListener('click', function () { resolveLoader('skip'); });
      window.setTimeout(function () { resolveLoader('4s cap'); }, 4000);
      loaderPaint();
    }
  } else { loaderResolved = true; }

  var markAndCheck = function (k) { AQ.loaderMark(k); checkLoader(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { markAndCheck('fonts'); }); else markAndCheck('fonts');
  if (document.readyState !== 'loading') markAndCheck('dom'); else document.addEventListener('DOMContentLoaded', function () { markAndCheck('dom'); });
  if (document.readyState === 'complete') markAndCheck('load'); else window.addEventListener('load', function () { markAndCheck('load'); });

  /* ------------------------------------------------------------------------------------------------
     libraries and the scene boot (after first paint and the load event)
     ------------------------------------------------------------------------------------------------ */
  function loadScript(src, fallback, done) {
    var s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = function () { done(true); };
    s.onerror = function () {
      if (!fallback) { done(false); return; }
      var f = document.createElement('script'); f.src = fallback; f.async = true;
      f.onload = function () { done(true); }; f.onerror = function () { done(false); };
      document.head.appendChild(f);
    };
    document.head.appendChild(s);
  }
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  function loadLibs(needThree, done) {
    var pending = 0, okAll = true;
    function one(ok) { okAll = okAll && ok; if (--pending === 0) done(okAll); }
    pending++;
    loadScript(CDN + 'gsap/3.12.5/gsap.min.js', '/vendor/gsap.min.js', function (ok) {
      if (!ok) { one(false); return; }
      var sub = 3;
      var subDone = function () { if (--sub === 0) { registerEases(); markAndCheck('gsap'); one(true); } };
      loadScript(CDN + 'gsap/3.12.5/ScrollTrigger.min.js', '/vendor/ScrollTrigger.min.js', subDone);
      loadScript(CDN + 'gsap/3.12.5/Flip.min.js', '/vendor/Flip.min.js', subDone);
      loadScript(CDN + 'gsap/3.12.5/CustomEase.min.js', '/vendor/CustomEase.min.js', subDone);
    });
    if (needThree) {
      pending++;
      loadScript(CDN + 'three.js/r128/three.min.js', '/vendor/three.min.js', function (ok) { markAndCheck('three'); one(ok); });
    } else markAndCheck('three');
  }
  function registerEases() {
    if (!window.gsap) return;
    if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
    if (window.Flip) window.gsap.registerPlugin(window.Flip);
    if (window.CustomEase) {
      window.gsap.registerPlugin(window.CustomEase);
      window.CustomEase.create('latch', '0.7, 0, 0.1, 1');
      window.CustomEase.create('settle', '0.12, 0.7, 0.16, 1');
    }
  }

  var sceneName = document.body.getAttribute('data-scene') || '';
  var sceneSlot = document.querySelector('.scene-slot[data-scene="' + sceneName + '"]');
  var LEGAL = document.body.getAttribute('data-route') === 'terms-of-service' || document.body.getAttribute('data-route') === 'privacy-policy';
  AQ.scene = null;

  function bootScene(libsOk) {
    if (!sceneName) { markAndCheck('scene'); return; }
    if (RM || NO_WEBGL || !libsOk || !window.THREE) { poster(); markAndCheck('scene'); return; }
    var v = window.AQ_V ? '?v=' + window.AQ_V : '';
    var ext = window.AQ_MIN ? '.min.js' : '.js';
    var srcs = ['/assets/js/scene-core' + ext + v, '/assets/scenes/' + sceneName + ext + v];
    var n = 0;
    var next = function () {
      if (n >= srcs.length) { startScene(); return; }
      loadScript(srcs[n++], null, function (ok) { if (!ok) { poster(); markAndCheck('scene'); return; } next(); });
    };
    next();
  }
  function poster() {
    /* the reduced motion still and the mobile lighter version: the scene's final state as inline SVG, filled on
       scroll under motion at 40ms a cell (entrances.js handles [data-enter~="cells"]) */
    if (!sceneSlot || sceneSlot.querySelector('.scene-poster')) return;
    var svg = AQ.posterFor ? AQ.posterFor(sceneName, sceneSlot) : '';
    if (!svg) return;
    var wrap = document.createElement('div');
    wrap.className = 'scene-poster-wrap';
    wrap.innerHTML = svg;
    sceneSlot.appendChild(wrap);
    sceneSlot.classList.add('has-poster');
    if (!RM && AQ.enterNow) AQ.enterNow(wrap, 'cells');
  }
  function startScene() {
    var factory = AQ.scenes && AQ.scenes[sceneName];
    if (!factory || !sceneSlot) { poster(); markAndCheck('scene'); return; }
    var opts = { gateOfIndex: GATE_OF_INDEX, gateP: GATE_P, rm: RM };
    if (sceneName === 'sweep-corridor') wireCorridor(factory, opts);
    else {
      var s = factory(sceneSlot, opts);
      AQ.scene = s;
      if (s && s.ctx) window.requestAnimationFrame(function () { s.ctx.renderOnce(); markAndCheck('scene'); });
      else markAndCheck('scene');
      if (typeof AQ.onSceneReady === 'function') AQ.onSceneReady(s);
    }
    var label = sceneSlot.querySelector('.scene-slot__label');
    if (label) label.remove();
  }

  /* ------------------------------------------------------------------------------------------------
     Home: the corridor scrubbed across the reserved arc, the Fraction, the rail, the captions
     ------------------------------------------------------------------------------------------------ */
  var fractionEl = document.querySelector('[data-setpiece="fraction"]');
  var railFraction = document.querySelector('.rail .fraction');
  var railGates = document.querySelectorAll('.rail .gates li');
  var heroLattice = document.querySelector('.hero__field .lattice');
  var captionRows = document.querySelectorAll('.hero__gate-log li');
  /* the fill point of every cell: gate g's cells fill one after another across the scroll that leads to gate g's
     threshold (the kept cells across 0.76 to 0.8), so a scrub fills the grid in gate order */
  var FILL_AT = (function () {
    var starts = [0.02, GATE_P[0], GATE_P[1], GATE_P[2], GATE_P[3]], ends = [GATE_P[0], GATE_P[1], GATE_P[2], GATE_P[3], 0.8];
    var counts = [0, 0, 0, 0, 0], seen = [0, 0, 0, 0, 0], out = [];
    GATE_OF_INDEX.forEach(function (g) { counts[g - 1]++; });
    GATE_OF_INDEX.forEach(function (g) { var gi = g - 1; var k = seen[gi]++; out.push(starts[gi] + (ends[gi] - starts[gi]) * (k + 1) / counts[gi]); });
    return out;
  })();
  AQ.FILL_AT = FILL_AT;
  /* the mobile hero steps the Fraction on the frame the first cell of a gate fills (the numeral never trails the grid
     by a snap, pass 5); a gate that kills nothing steps at its own threshold */
  var MOBILE_STEP_AT = (function () {
    var out = [];
    for (var g = 1; g <= 4; g++) {
      var first = Infinity;
      GATE_OF_INDEX.forEach(function (gg, i) { if (gg === g && FILL_AT[i] < first) first = FILL_AT[i]; });
      out.push(first === Infinity ? GATE_P[g - 1] : Math.min(first, GATE_P[g - 1]));
    }
    return out;
  })();
  var lastCountShown = null;

  function showCount(count, p) {
    if (count === lastCountShown) return;
    lastCountShown = count;
    if (!loaderResolved && count === 48) { return; }
    if (fractionEl) {
      AQ.stepFraction(fractionEl, count, 48);
      var num = fractionEl.querySelector('.num');
      if (num) num.classList.toggle('is-kept', count === 6);
    }
    if (railFraction && document.body.getAttribute('data-route') === 'home') AQ.stepFraction(railFraction, count, 48);
  }
  function showGateState(p) {
    var active = -1;
    for (var g = 0; g < 4; g++) if (p >= GATE_P[g]) active = g;
    if (p >= 0.8) active = 4;
    for (var i = 0; i < railGates.length; i++) railGates[i].classList.toggle('is-active', i === active || (active === 4 && i === 3));
    for (var c = 0; c < captionRows.length; c++) {
      var th = c < 4 ? GATE_P[c] : 0.8;
      captionRows[c].classList.toggle('is-in', p >= th);
      /* finisher: once the camera turns (p at or past 0.8) the four gate rows fold and the summary line stays alone,
         so the elevation frame carries one object beside the Fraction; they return when the visitor scrolls back */
      if (c < 4 && !HERO_2D) captionRows[c].classList.toggle('is-folded', p >= 0.8);
    }
    if (heroLattice) {
      heroLattice.classList.toggle('is-at-rest', p < 0.004);
      var cells = heroLattice.children;
      for (var k = 0; k < cells.length; k++) cells[k].classList.toggle('is-fill', p >= FILL_AT[k]);
    }
  }

  function wireCorridor(factory, opts) {
    var stage = document.querySelector('.hero-stage');
    var arc = document.querySelector('[data-arc-start]');
    var arcEnd = document.querySelector('[data-arc-end]');
    var tooltip = document.getElementById('scene-tooltip');
    var titles = heroLattice ? Array.prototype.map.call(heroLattice.children, function (li) { return li.getAttribute('title') || ''; }) : [];
    opts.pointerTarget = stage;
    opts.onCount = function (count, p) { showCount(count, p); };
    opts.onProgress = showGateState;
    opts.onHover = function (id, x, y) {
      if (!tooltip) return;
      if (id < 0) { tooltip.textContent = ''; tooltip.hidden = true; return; }
      tooltip.textContent = titles[id] || ('trial ' + (id + 1));
      tooltip.hidden = false;
      var r = sceneSlot.getBoundingClientRect();
      tooltip.style.left = Math.min(r.width - tooltip.offsetWidth - 8, x + 12) + 'px';
      tooltip.style.top = (y + 16) + 'px';
    };
    var scene = factory(sceneSlot, opts);
    AQ.scene = scene;
    if (!scene) { poster(); markAndCheck('scene'); return; }
    showCount(48, 0);
    AQ.flipTarget = function () { return scene.latticeRect(); };
    window.requestAnimationFrame(function () { scene.ctx.renderOnce(); markAndCheck('scene'); });

    var st = null;
    function arcSpan() { return Math.max(1, arcEnd.getBoundingClientRect().top - arc.getBoundingClientRect().top); }
    if (window.gsap && window.ScrollTrigger) {
      st = window.ScrollTrigger.create({
        trigger: arc, start: 'top top', end: function () { return '+=' + arcSpan(); },
        scrub: 0.6,
        snap: { snapTo: [0, 0.18, 0.38, 0.58, 0.76, 1], duration: { min: 0.12, max: 0.36 }, delay: 0.12, ease: 'latch', directional: false },
        onUpdate: function (self) { scene.setProgress(self.progress); }
      });
      scene.setProgress(st.progress);
    } else {
      var onScroll = function () {
        var top = arc.getBoundingClientRect().top;
        scene.setProgress(Math.min(1, Math.max(0, -top / arcSpan())));
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    AQ.arc = { start: function () { return st ? st.start : arc.getBoundingClientRect().top + window.scrollY; }, end: function () { return st ? st.end : arc.getBoundingClientRect().top + window.scrollY + arcSpan(); } };
    qaHooks();
  }

  /* the mobile hero: the DOM lattice fills in gate order over the first 1.25 viewport heights, the Fraction steps
     48, 31, 14, 6 and the captions arrive as log lines; a tap on a cell shows its reason */
  function wireMobileHero() {
    if (!heroLattice || RM) return;
    var stage = document.querySelector('.hero-stage');
    var tooltip = document.getElementById('scene-tooltip');
    var mainEl = document.getElementById('main');
    var onScroll = function () {
      /* the hero block is not pinned at phone width (design doc 5.11); the grid sits at about 370 to 570px and leaves the
         viewport after 0.39 viewport heights, so the whole scrub completes inside 0.36 viewport heights: at the capacity
         beat (p 0.76, about 230px of scroll) the Fraction reads 6 under the strip and the six green cells are on screen */
      var p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.36)));
      showGateState(p >= 1 ? 1 : p);
      var count = 48; for (var g = 0; g < 4; g++) if (p >= MOBILE_STEP_AT[g]) count = COUNTS[g + 1];
      showCount(count, p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    showCount(48, 0);
    onScroll();
    heroLattice.addEventListener('click', function (e) {
      var li = e.target.closest('li'); if (!li || !tooltip) return;
      tooltip.textContent = li.getAttribute('title') || '';
      tooltip.hidden = false;
      var r = li.getBoundingClientRect(), s = (stage || mainEl).getBoundingClientRect();
      tooltip.style.left = Math.max(0, Math.min(s.width - 240, r.left - s.left)) + 'px';
      tooltip.style.top = (r.bottom - s.top + 6) + 'px';
    });
    document.addEventListener('click', function (e) { if (tooltip && !e.target.closest('.lattice')) { tooltip.hidden = true; } });
    qaHooks();
  }

  /* ------------------------------------------------------------------------------------------------
     QA hooks
     ------------------------------------------------------------------------------------------------ */
  var hooksDone = false;
  function qaHooks() {
    if (hooksDone) return; hooksDone = true;
    var arcEl = document.querySelector('[data-arc-start]'), arcEndEl = document.querySelector('[data-arc-end]');
    if (!arcEl) return;
    var start = AQ.arc ? AQ.arc.start() : arcEl.getBoundingClientRect().top + window.scrollY;
    var end = AQ.arc ? AQ.arc.end() : (arcEndEl ? arcEndEl.getBoundingClientRect().top + window.scrollY : start + window.innerHeight * 1.5);
    var vh = window.innerHeight;
    var wow = start + 0.8 * (end - start);
    AQ.arcNumbers = { start: start, end: end, wow: wow, viewportHeights: (end - start) / vh, wowViewportHeights: (wow - start) / vh };
    if (AQ.qa('arc')) {
      console.log('[aq arc] ' + JSON.stringify({ start: Math.round(start), end: Math.round(end), spanVH: +((end - start) / vh).toFixed(3), wow: Math.round(wow), wowVH: +((wow - start) / vh).toFixed(3), snap: [0, 0.18, 0.38, 0.58, 0.76, 1] }));
      var line = document.createElement('div');
      line.className = 'qa-arc-line';
      line.style.top = wow + 'px';
      line.innerHTML = '<span>wow · 80% · scrollY ' + Math.round(wow) + ' · ' + ((wow - start) / vh).toFixed(2) + 'vh</span>';
      document.body.appendChild(line);
      var l2 = document.createElement('div');
      l2.className = 'qa-arc-line qa-arc-line--end';
      l2.style.top = end + 'px';
      l2.innerHTML = '<span>arc end · scrollY ' + Math.round(end) + ' · ' + ((end - start) / vh).toFixed(2) + 'vh</span>';
      document.body.appendChild(l2);
    }
    if (AQ.qa('fps')) {
      AQ.onLoaderResolved(function () {
        window.setTimeout(function () {
          var frames = 0, t0 = performance.now(), running = true;
          (function loop() { frames++; if (running) window.requestAnimationFrame(loop); })();
          var dur = 5000, s0 = performance.now();
          (function scrollStep() {
            var t = (performance.now() - s0) / dur;
            window.scrollTo(0, start + Math.min(1, t) * (end - start));
            if (t < 1) window.requestAnimationFrame(scrollStep);
          })();
          window.setTimeout(function () {
            running = false;
            var fps = Math.round(frames / ((performance.now() - t0) / 1000));
            AQ.fpsResult = fps;
            console.log('[aq fps] avg fps ' + fps + ' over the signature scroll (' + Math.round(end - start) + 'px in 5s, dpr ' + Math.min(window.devicePixelRatio || 1, 1.5) + ')');
          }, dur + 200);
        }, 300);
      });
    }
  }

  /* ------------------------------------------------------------------------------------------------
     boot
     ------------------------------------------------------------------------------------------------ */
  /* the 404's Fraction steps 48, 31, 14, 6, 0 as the page arrives (design doc 7.12) */
  function notFoundFraction() {
    if (document.body.getAttribute('data-route') !== '404' || RM || !fractionEl) return;
    var seq = [48, 31, 14, 6, 0], i = 0;
    AQ.onLoaderResolved(function () {
      (function next() { AQ.stepFraction(fractionEl, seq[i], 48); if (++i < seq.length) window.setTimeout(next, 360); })();
    });
  }

  /* ------------------------------------------------------------------------------------------------
     the hero plate (video add): the monitor wall loop behind the Home type column. Nothing is fetched before the
     loader resolves (the sources are attached here, so the loop never competes with the fonts, the styles or the
     libraries); the still that painted with the page stays beneath it and the loop fades in once it is playing.
     Poster only under reduced motion, under 768, on save data and low memory devices. Paused offscreen and on hidden tabs.
     ------------------------------------------------------------------------------------------------ */
  function wirePlate() {
    var plate = document.querySelector('[data-hero-plate]');
    if (!plate) return;
    var video = plate.querySelector('video');
    var still = plate.querySelector('img');
    var PHONE = window.matchMedia('(max-width: 767.98px)').matches;
    if (RM || PHONE || LOW || !video) {
      /* the poster alone: the blurred still that painted with the page is swapped for the graded poster (the phone crop
         under 768) once the loader has resolved, so the poster's bytes never sit in the first paint */
      if (video && video.parentNode) video.parentNode.removeChild(video);
      var posterSrc = still && (PHONE ? still.getAttribute('data-poster-m') : still.getAttribute('data-poster'));
      if (posterSrc) AQ.onLoaderResolved(function () {
        /* a second image over the still (never a src swap on the still itself, which would re enter it as a new, later
           largest paint candidate); it sits 1px inside the still's box like the loop does */
        var poster = document.createElement('img');
        poster.className = 'hero__plate-poster'; poster.alt = ''; poster.decoding = 'async';
        poster.width = PHONE ? 720 : 1440; poster.height = PHONE ? 900 : 810;
        poster.addEventListener('load', function () { plate.classList.add('is-poster'); });
        poster.src = posterSrc;
        still.parentNode.appendChild(poster);
      });
      return;
    }
    var canPlay = typeof video.canPlayType === 'function' && (video.canPlayType('video/webm; codecs="vp9"') || video.canPlayType('video/mp4; codecs="avc1.640028"'));
    if (!canPlay) { video.parentNode.removeChild(video); return; }
    AQ.onLoaderResolved(function () {
      var webm = video.getAttribute('data-webm'), mp4 = video.getAttribute('data-mp4');
      [[webm, 'video/webm'], [mp4, 'video/mp4']].forEach(function (s) {
        if (!s[0]) return;
        var el = document.createElement('source'); el.src = s[0]; el.type = s[1]; video.appendChild(el);
      });
      video.addEventListener('playing', function () { plate.classList.add('is-playing'); AQ._plateStartedAt = Math.round(performance.now()); });
      video.addEventListener('error', function () { plate.classList.remove('is-playing'); }, true);
      var wanted = true, scrolling = null;
      var tryPlay = function () {
        if (!wanted || scrolling || document.hidden) return;
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay refused: the still stays */ });
      };
      video.load();
      tryPlay();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          wanted = entries[0].isIntersecting;
          if (wanted) tryPlay(); else if (!video.paused) video.pause();
        }, { rootMargin: '80px' }).observe(plate);
      }
      /* the plate yields to the corridor: it holds its frame while the page is being scrolled (the signature scrub
         keeps its whole frame budget) and runs on from the same frame 400ms after the scroll settles */
      window.addEventListener('scroll', function () {
        if (!video.paused) video.pause();
        if (scrolling) window.clearTimeout(scrolling);
        scrolling = window.setTimeout(function () { scrolling = null; tryPlay(); }, 400);
      }, { passive: true });
      document.addEventListener('visibilitychange', function () { if (document.hidden) { if (!video.paused) video.pause(); } else tryPlay(); });
      window.addEventListener('pagehide', function () { try { video.pause(); } catch (e) { /* torn down */ } });
    });
  }
  AQ.wirePlate = wirePlate;

  function boot() {
    var isHome = document.body.getAttribute('data-route') === 'home';
    notFoundFraction();
    wirePlate();
    if (RM) {
      html.classList.add('rm');
      if (sceneName) { poster(); }
      markAndCheck('scene'); markAndCheck('three'); markAndCheck('gsap');
      if (isHome) qaHooks();
      return;
    }
    var hero2d = isHome && (NO_WEBGL || HERO_2D);
    if (hero2d) wireMobileHero();
    var needThree = !!sceneName && !NO_WEBGL && !LEGAL && !hero2d;
    loadLibs(needThree, function (ok) {
      if (!needThree) { markAndCheck('three'); }
      if (LEGAL) { markAndCheck('scene'); if (AQ.legalPlanes) AQ.legalPlanes(); return; }
      if (hero2d) { markAndCheck('scene'); return; }
      if (NO_WEBGL) { poster(); markAndCheck('scene'); return; }
      bootScene(ok);
    });
  }
  var go = function () { if ('requestIdleCallback' in window) window.requestIdleCallback(boot, { timeout: 600 }); else window.setTimeout(boot, 1); };
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
