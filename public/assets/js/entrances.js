/* Astroquanta entrances (pass 4). Every section carries data-enter with one or more names from the vocabulary in
   design doc 5.10; this engine runs them once at "top 80%" with the console's cadences (rows 120ms, cells 40ms,
   characters 40ms), never a fade, never a float. Under reduced motion (html.rm) nothing here runs and every section
   is already in its final state. Also here: the per page text hover helpers that need script (the blog date tick),
   the drawer's log line arrival, the reduced motion and mobile posters, and the legal pages' CSS 3D gate planes. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  var html = document.documentElement;
  var ROW = 120, CELL = 40, CHAR = 40, FAST = 120, BASE = 360, SLOW = 900;

  function rm() { return html.classList.contains('rm') || !html.classList.contains('motion'); }
  function own(root, selector) {
    /* elements matching selector whose nearest data-enter ancestor is root, plus root itself when it matches */
    var list = Array.prototype.filter.call(root.querySelectorAll(selector), function (el) {
      var p = el.parentElement ? el.parentElement.closest('[data-enter]') : null;
      return p === root;
    });
    var scoped = selector.indexOf(':scope') !== -1;
    if (!scoped && root.matches(selector)) list.unshift(root);
    return list;
  }
  function at(ms, fn) { return window.setTimeout(fn, ms); }
  function markIn(el) { el.classList.add('is-in'); }

  var E = {};

  /* 1 log line arrival: rows Stepped at 120ms, the status token 120ms later, the cursor on the last row */
  E.log = function (root) {
    var rows = own(root, '.frame__rows > li, .log:not(.ticks) > li, .plan__rows > li, .footer-routes > li, .rail-block .routes > li, .faq-item, .nf-routes .log > li, .legal-index ol > li, .step .tally > li');
    var cursorHome = root.querySelector('.detail.cursor');
    /* rows in different lists arrive in parallel (each plan card's rows together); rows in one list 120ms apart */
    var lists = [], index = [];
    rows.forEach(function (li) { var k = lists.indexOf(li.parentNode); if (k < 0) { k = lists.push(li.parentNode) - 1; index.push(0); } li._slot = index[k]++; });
    var longest = Math.max.apply(null, index.concat([0]));
    rows.forEach(function (li) {
      at(li._slot * ROW, function () {
        markIn(li);
        var detail = li.querySelector('.detail');
        if (cursorHome && detail) { rows.forEach(function (r) { var d = r.querySelector('.detail'); if (d && d !== cursorHome) d.classList.remove('cursor'); }); if (detail !== cursorHome) detail.classList.add('cursor'); }
        var status = li.querySelector('.status');
        if (status) at(ROW, function () { status.classList.add('is-in'); });
      });
    });
    var total = longest * ROW + ROW;
    at(total, function () { rows.forEach(function (r) { var d = r.querySelector('.detail'); if (d && d !== cursorHome) d.classList.remove('cursor'); }); });
    return total;
  };

  /* 2 cell fill: cells fill 40ms apart in gate order, the kept cells last */
  E.cells = function (root) {
    var cells = own(root, '.trial-grid > li, .lattice > li, .cell-rule rect.cell, .seal-svg rect.cell, .archive-shelf li, .scene-poster rect.poster-cell, .loader__grid li');
    var ordered = AQ.gateOrder ? AQ.gateOrder(cells) : cells;
    ordered.forEach(function (c, i) { at(i * CELL, function () { c.classList.add('is-fill'); markIn(c); }); });
    return ordered.length * CELL + BASE;
  };

  /* 3 hairline draw: rules draw with Settle, then the text appears Stepped */
  E.hairline = function (root) {
    var rules = own(root, '.gate-rule, .prompt-rule, .timeline, .rule-draw, .section-header, .post-figure, .archive-shelf, .about-grid .who, .contact-grid .section-identity');
    rules.forEach(function (r) { markIn(r); });
    var text = own(root, ':scope > h2, :scope > h1, :scope > p, :scope > .measure, :scope > .offset-head > *, :scope > .closing-line, :scope > .gates-index, :scope > address, :scope > .actions, :scope > .console-block > *, :scope > .compliance');
    text.forEach(function (t, i) { at(BASE + i * ROW, function () { markIn(t); }); });
    return BASE + text.length * ROW;
  };

  /* 3 variant, tables: the top hairline draws, then the rows appear Stepped */
  E.table = function (root) {
    var tables = own(root, '.table-scroll, .table-wrap, .figure-grid');
    var total = 0;
    tables.forEach(function (t) {
      markIn(t);
      var rows = t.querySelectorAll('tr');
      rows.forEach(function (tr, i) { at(BASE + i * ROW, function () { markIn(tr); }); });
      total = Math.max(total, BASE + rows.length * ROW);
    });
    return total;
  };

  /* 4 digit step: every numeral steps to its value through one step clips, never interpolated */
  function stepNumeral(el, delay) {
    var text = el.textContent;
    if (!/\d/.test(text) || el.querySelector('.digit-step')) { return; }
    var chars = text.split('');
    el.setAttribute('aria-label', el.getAttribute('aria-label') || text);
    el.innerHTML = chars.map(function (ch) { return /\d/.test(ch) ? '<span class="digit-step" data-target="' + ch + '">0</span>' : '<span class="digit-fix">' + (ch === ' ' ? '&nbsp;' : ch.replace('<', '&lt;')) + '</span>'; }).join('');
    var digits = el.querySelectorAll('.digit-step');
    /* a live numeral (the sweep's N readout) records its current value in data-value; if the value moves while the
       step plays (a keyboard ArrowRight during the entrance), the step yields and the final write takes the live value
       instead of the one captured at the start (finisher send back: the readout read 48 while the input held 80) */
    function live() { var v = el.getAttribute('data-value'); return v !== null && v !== text ? v : null; }
    for (var s = 1; s <= 9; s++) {
      (function (step) {
        at(delay + step * CELL, function () {
          if (live() !== null) { el.textContent = live(); return; }
          digits.forEach(function (d) { var t = parseInt(d.getAttribute('data-target'), 10); d.textContent = String(Math.min(step, t)); });
        });
      })(s);
    }
    at(delay + 10 * CELL, function () { el.textContent = live() !== null ? live() : text; });
  }
  E.digits = function (root) {
    var nums = own(root, '.numeral, .plan__price-figure, .readout, .step__index, .fraction-setpiece:not([data-setpiece="fraction"]) .digit, .kill-line, .stat-label');
    var figures = nums.filter(function (n) { return !n.classList.contains('stat-label') && !n.classList.contains('kill-line'); });
    var labels = nums.filter(function (n) { return n.classList.contains('stat-label') || n.classList.contains('kill-line'); });
    /* figures start 40ms apart so a row of prices or stats lands together inside the base duration */
    figures.forEach(function (n, i) { markIn(n); stepNumeral(n, i * CELL); });
    var end = figures.length * CELL + 10 * CELL;
    labels.forEach(function (l, i) { at(end + i * ROW, function () { markIn(l); }); });
    var icons = own(root, '.gate__head, .gate h3, .gate p:not(.numeral)');
    icons.forEach(function (ic, i) { at(BASE + i * ROW, function () { markIn(ic); }); });
    return end + labels.length * ROW;
  };

  /* the stroke's length on screen (the curves stretch with preserveAspectRatio none and keep 1px strokes) */
  function screenLength(pl) {
    try {
      var svg = pl.ownerSVGElement, vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
      var sx = vb.width ? r.width / vb.width : 1, sy = vb.height ? r.height / vb.height : 1;
      var total = pl.getTotalLength(), n = 120, last = pl.getPointAtLength(0), sum = 0;
      for (var i = 1; i <= n; i++) { var pt = pl.getPointAtLength(total * i / n); sum += Math.sqrt(Math.pow((pt.x - last.x) * sx, 2) + Math.pow((pt.y - last.y) * sy, 2)); last = pt; }
      return Math.max(sum, 1) * 1.02;
    } catch (e) { return 4000; }
  }

  /* 5 curve draw: the stroke draws left to right with Settle over 0.9s, ticks and legend Stepped after */
  E.curve = function (root) {
    var figs = own(root, '.curve-fig');
    figs.forEach(function (f) {
      f.querySelectorAll('polyline, path').forEach(function (pl) {
        var len = screenLength(pl);
        pl.style.strokeDasharray = len + ' ' + len;
        pl.style.strokeDashoffset = String(len);
        pl.getBoundingClientRect();
        pl.classList.add('is-drawing');
        window.requestAnimationFrame(function () { pl.style.strokeDashoffset = '0'; });
        at(SLOW + 40, function () { pl.style.strokeDasharray = ''; pl.style.strokeDashoffset = ''; pl.classList.remove('is-drawing'); });
      });
      at(SLOW, function () { markIn(f); });
    });
    return SLOW + ROW;
  };

  /* 6 seal settle: cells at 40ms in gate order, then the frame settles from 1.02 to 1, then the fraction */
  E.seal = function (root) {
    var seals = own(root, '.seal');
    var total = 0;
    seals.forEach(function (s) {
      var cells = AQ.gateOrder(s.querySelectorAll('rect.cell'));
      cells.forEach(function (c, i) { at(i * CELL, function () { c.classList.add('is-fill'); }); });
      var t = cells.length * CELL;
      at(t, function () { markIn(s); });
      s.querySelectorAll('.seal-fraction, .seal-word').forEach(function (p, i) { at(t + BASE + i * ROW, function () { markIn(p); }); });
      total = Math.max(total, t + BASE + 2 * ROW);
    });
    return total;
  };

  /* 7 column rule draw: the vertical hairlines draw top to bottom with Settle, then the rows arrive as log lines */
  E.colrule = function (root) {
    var cols = own(root, '.split-sheet, .plans-grid, .about-grid .research, .spread, .step, .checkout-sections > section, .table-wrap, .table-scroll');
    cols.forEach(function (c) { markIn(c); });
    var rows = own(root, '.plan-rows > li, .plans-grid .plan, .research > p, .step .tally > li, tbody tr, .checkout-sections .field');
    rows.forEach(function (r, i) { at(SLOW + i * ROW, function () { markIn(r); }); });
    var stragglers = own(root, ':scope > h2, :scope > p, .sticky-panel, .teaser-foot, .spread__text > *, .spread__aside > *, .step > h2, .step > p, .step__index, .step__icon, .plans-footnote > p');
    stragglers.forEach(function (s, i) { at(SLOW + i * ROW, function () { markIn(s); }); });
    return SLOW + Math.max(rows.length, stragglers.length) * ROW;
  };

  /* 8 glyph lead: the prompt glyph Latches in, then the heading appears Stepped word by word at 120ms */
  E.glyph = function (root) {
    var heads = own(root, ':scope > h1, :scope > h2, :scope > .ph-main > h1, .manifesto h2, .pullquote > p, :scope > .spread__text > h2');
    var total = 0;
    heads.forEach(function (h) {
      if (!h.querySelector('.word')) {
        var frag = document.createDocumentFragment();
        Array.prototype.slice.call(h.childNodes).forEach(function (node) {
          if (node.nodeType === 3) {
            node.nodeValue.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement('span'); w.className = 'word'; w.textContent = part; frag.appendChild(w);
            });
          } else if (node.nodeType === 1) { node.classList.add('word'); frag.appendChild(node); }
        });
        h.innerHTML = '';
        var g = document.createElement('span'); g.className = 'lead-glyph'; g.setAttribute('aria-hidden', 'true'); g.textContent = '> ';
        h.appendChild(g);
        h.appendChild(frag);
      }
      markIn(h);
      var words = h.querySelectorAll('.word');
      words.forEach(function (w, i) { at(FAST + i * ROW, function () { markIn(w); }); });
      total = Math.max(total, FAST + words.length * ROW);
    });
    var rest = own(root, ':scope > .eyebrow, :scope > .subhead, :scope > .standfirst, :scope > .dim, :scope > .page-fraction, :scope > p:not(.eyebrow):not(.subhead), :scope > .ph-main > :is(.eyebrow, .subhead, .standfirst, .dim), :scope > .ph-aside > :is(.page-fraction, .prompt-rule, .scene-slot, .chips, .numeral-index), .manifesto p, .pullquote > footer, :scope > .spread__text > p, :scope > .scene-slot, :scope > .prompt-rule');
    rest.forEach(function (r, i) { at(total + i * ROW, function () { markIn(r); }); });
    return total + rest.length * ROW;
  };

  /* 9 tick draw: the timeline hairline draws with Settle, ticks Stepped, each label 120ms after */
  E.ticks = function (root) {
    var tl = own(root, '.timeline');
    tl.forEach(function (t) {
      markIn(t);
      var ticks = t.querySelectorAll('.ticks > li');
      ticks.forEach(function (li, i) { at(BASE + i * ROW, function () { markIn(li); at(ROW, function () { var b = li.querySelector('button'); if (b) b.classList.add('is-in'); }); }); });
    });
    var text = own(root, ':scope > h2, :scope > p');
    text.forEach(function (x, i) { at(i * ROW, function () { markIn(x); }); });
    return BASE + 6 * ROW;
  };

  /* 10 frame retype: the title types at 40ms a character, then the rows arrive as log lines */
  E.retype = function (root) {
    var titles = own(root, '.frame__title > span:first-child');
    var total = 0;
    titles.forEach(function (t) {
      var text = t.textContent;
      t.setAttribute('aria-label', text);
      t.innerHTML = '';
      var typed = document.createElement('span'); typed.className = 'typed'; t.appendChild(typed);
      var caret = document.createElement('span'); caret.className = 'typed-caret'; caret.setAttribute('aria-hidden', 'true'); t.appendChild(caret);
      for (var i = 1; i <= text.length; i++) {
        (function (n) { at(n * CHAR, function () { typed.textContent = text.slice(0, n); if (n === text.length) { caret.remove(); t.textContent = text; t.removeAttribute('aria-label'); } }); })(i);
      }
      markIn(t);
      total = Math.max(total, text.length * CHAR);
    });
    var frames = own(root, '.frame');
    frames.forEach(function (f) { at(total, function () { markIn(f); }); });
    var lead = own(root, '.frame__lead, .frame__foot, .frame + .compliance, .frame__body, .frame .stats, .frame .field, .footer-grid, .frame .curve-fig, .frame .trial-grid');
    lead.forEach(function (l, i) { at(total + i * ROW, function () { markIn(l); }); });
    return total + lead.length * ROW;
  };

  /* 11 chip re arrival: rows disappear Stepped and re arrive in filtered order at 120ms */
  E.chips = function (root) {
    var chips = own(root, '.chips > button');
    chips.forEach(function (c, i) { at(i * ROW, function () { markIn(c); }); });
    return chips.length * ROW;
  };

  /* 12 edge draw: a block's four edges draw one at a time with Settle */
  E.edges = function (root) {
    var blocks = own(root, '.console-block, .next-step, .landing-cta, .icon-slot, .actions--boxed, .frame.edge-frame, .expander__panel.frame, .badges');
    blocks.forEach(function (b) {
      if (!b.querySelector('.edge')) {
        ['t', 'r', 'b', 'l'].forEach(function (side) { var e = document.createElement('i'); e.className = 'edge edge--' + side; e.setAttribute('aria-hidden', 'true'); b.appendChild(e); });
      }
      b.classList.add('has-edges');
      var edges = b.querySelectorAll('.edge');
      edges.forEach(function (e, i) { at(i * BASE, function () { markIn(e); }); });
      at(4 * BASE, function () { markIn(b); });
      var inner = Array.prototype.filter.call(b.children, function (ch) { return !ch.classList.contains('edge'); });
      inner.forEach(function (ch, i) { at(2 * BASE + i * ROW, function () { markIn(ch); }); });
      /* the enlarged kit icon inside a slot draws its strokes with Settle once the slot's edges are in (pass 5) */
      var icon = b.querySelector('.icon--xl');
      if (icon) at(2 * BASE, function () { drawStrokes(icon); });
    });
    return 4 * BASE + ROW;
  };

  /* stroke draw: every solid shape in an inline kit icon draws from nothing to its length (the dotted hand keeps its dash) */
  function drawStrokes(svg) {
    var shapes = svg.querySelectorAll('rect, line, path, polyline, circle');
    var vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal.width : 24;
    var scale = (svg.getBoundingClientRect().width || vb) / vb;
    shapes.forEach(function (sh, i) {
      if (sh.getAttribute('stroke-dasharray')) return;
      var len = 0;
      try { len = sh.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      /* under vector-effect non-scaling-stroke the dash is measured in screen pixels, so the length scales with the icon */
      if (getComputedStyle(sh).vectorEffect === 'non-scaling-stroke') len = len * scale;
      sh.style.strokeDasharray = len + ' ' + len;
      sh.style.strokeDashoffset = String(len);
      sh.getBoundingClientRect();
      sh.classList.add('is-drawing');
      at(i * CELL, function () { sh.style.strokeDashoffset = '0'; });
      at(SLOW + i * CELL + 40, function () { sh.style.strokeDasharray = ''; sh.style.strokeDashoffset = ''; sh.classList.remove('is-drawing'); });
    });
  }
  AQ.drawStrokes = drawStrokes;

  /* fields: rows Stepped at 120ms with their bottom hairlines drawing in sequence */
  E.fields = function (root) {
    var fields = own(root, '.field, .check, .frame form > button, .frame form > .dim, .frame form > .form-error, .sms-heading, form > .compliance, .frame__body > .sms-heading, #purchase-btn, #purchase-beneath, #order-error');
    fields.forEach(function (f, i) { at(i * ROW, function () { markIn(f); }); });
    return fields.length * ROW;
  };

  /* fold: a generic section of prose, paragraph by paragraph at 120ms (a log line variant) */
  E.fold = function (root) {
    var items = own(root, ':scope > h2, :scope > h3, :scope > p, :scope > .process-row, :scope > .log, :scope > .actions, :scope > .compliance, :scope > .spread__text > *, :scope > .spread__aside > *, :scope > .measure, :scope > .muted');
    items.forEach(function (it, i) { at(i * ROW, function () { markIn(it); }); });
    return items.length * ROW;
  };

  /* icons: strokes appear Stepped with their row */
  E.icons = function (root) {
    var rows = own(root, '.process-row, .section-icon, .icon-slot');
    rows.forEach(function (r, i) { at(i * ROW, function () { markIn(r); var ic = r.querySelector('.icon'); if (ic) drawStrokes(ic); at(ROW, function () { var p = r.querySelector('p'); if (p) markIn(p); }); }); });
    var text = own(root, ':scope > h2, :scope > p');
    text.forEach(function (x, i) { at(i * ROW, function () { markIn(x); }); });
    return rows.length * ROW * 2;
  };

  /* run every name on a root in sequence, then mark the root entered */
  function run(root) {
    if (root.classList.contains('is-entered') || root.classList.contains('is-running')) return;
    root.classList.add('is-running');
    var names = (root.getAttribute('data-enter') || '').split(/\s+/).filter(Boolean);
    /* finisher send back: a [data-enter-cap] root (the SMS block) lands in its final state by that many milliseconds
       whatever its names are still doing, so an instant jump to it never reads blank while the log line wipe plays */
    var cap = parseInt(root.getAttribute('data-enter-cap') || '0', 10);
    if (cap > 0) at(cap, function () { if (!root.classList.contains('is-entered')) { root.classList.add('is-entered'); root.classList.remove('is-running'); } });
    var PARALLEL = { cells: true, digits: true, curve: true, seal: true, fields: true };
    (function step(i, delay) {
      if (i >= names.length) { at(delay + 400, function () { root.classList.add('is-entered'); root.classList.remove('is-running'); }); return; }
      var fn = E[names[i]];
      if (!fn) { step(i + 1, delay); return; }
      at(delay, function () {
        var d = fn(root) || 0;
        /* fills, digits and curves run beside the next name; rows, rules and retypes hand over when they finish */
        /* finisher: a [data-enter-parallel] root (the footer frame) runs every name beside the next, so the routes
           arrive while the title types and the footer reads complete within about a second */
        step(i + 1, (PARALLEL[names[i]] || root.hasAttribute('data-enter-parallel')) ? Math.min(d, ROW) : d);
      });
    })(0, 0);
  }
  AQ.enterNow = function (root, names) { if (rm()) return; if (names) root.setAttribute('data-enter', names); run(root); };

  function observe() {
    if (rm()) return;
    var roots = document.querySelectorAll('[data-enter]');
    if (!('IntersectionObserver' in window)) { roots.forEach(function (r) { r.classList.add('is-entered'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); snapLater(e.target); } });
    }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });
    /* safety (pass 5 round 2): a root still in a hidden entrance state 1.5s after it entered the viewport snaps to its
       final state, whatever its timers are doing; a root with no box of its own (display contents) can never
       intersect, so it is final from the start; a scroll sweep catches any root whose first child is on screen */
    function snapLater(root) { at(1500, function () { if (!root.classList.contains('is-entered')) { root.classList.add('is-entered'); root.classList.remove('is-running'); } }); }
    function inView(el) { var b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < window.innerHeight; }
    roots.forEach(function (r) {
      var b = r.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) { r.classList.add('is-entered'); return; }
      io.observe(r);
    });
    var sweepTimer = null;
    function sweep() {
      roots.forEach(function (r) {
        if (r.classList.contains('is-entered') || r._snapArmed) return;
        var probe = r.getBoundingClientRect().height ? r : (r.firstElementChild || r);
        if (inView(probe)) { r._snapArmed = true; if (!r.classList.contains('is-running')) { io.unobserve(r); run(r); } snapLater(r); }
      });
    }
    window.addEventListener('scroll', function () { if (sweepTimer) return; sweepTimer = at(400, function () { sweepTimer = null; sweep(); }); }, { passive: true });
    at(600, sweep);
    /* keyboard focus inside a section that has not entered snaps it to its final state at once, so a focused control
       is never invisible (a tabbed link scrolled to the viewport's bottom edge would otherwise wait for the 80% line) */
    document.addEventListener('focusin', function (e) {
      var root = e.target && e.target.closest ? e.target.closest('[data-enter]') : null;
      while (root) { if (!root.classList.contains('is-entered')) { io.unobserve(root); root.classList.add('is-entered'); } root = root.parentElement ? root.parentElement.closest('[data-enter]') : null; }
    });
    /* anything already scrolled past (deep links) enters at once */
    roots.forEach(function (r) { var b = r.getBoundingClientRect(); if (b.bottom < 0) { io.unobserve(r); r.classList.add('is-entered'); } });
  }

  /* ------------------------------------------------------------------------------------------------
     hover helpers that need script
     ------------------------------------------------------------------------------------------------ */
  function blogDateTick() {
    if (document.body.getAttribute('data-route') !== 'blog') return;
    var today = new Date();
    var todayText = today.getFullYear() + ' ' + String(today.getMonth() + 1).padStart(2, '0') + ' ' + String(today.getDate()).padStart(2, '0');
    document.querySelectorAll('.post-list tbody tr').forEach(function (tr) {
      var time = tr.querySelector('time'); if (!time) return;
      var from = time.textContent, timer = null, frames = [];
      var target = todayText;
      function steps(a, b) {
        var out = [];
        for (var s = 1; s <= 6; s++) {
          out.push(a.split('').map(function (ch, i) {
            if (!/\d/.test(ch)) return ch;
            var da = parseInt(ch, 10), db = parseInt(b.charAt(i), 10);
            return String(Math.round(da + (db - da) * s / 6));
          }).join(''));
        }
        return out;
      }
      function play(seq, done) {
        var i = 0;
        (function next() { if (i >= seq.length) { done && done(); return; } time.textContent = seq[i++]; timer = window.setTimeout(next, CELL); })();
      }
      function enter() { if (rm()) return; window.clearTimeout(timer); frames = steps(from, target); play(frames, function () { frames = steps(target, from); play(frames, function () { time.textContent = from; }); }); }
      function leave() { window.clearTimeout(timer); time.textContent = from; }
      tr.addEventListener('mouseenter', enter); tr.addEventListener('mouseleave', leave);
      tr.addEventListener('focusin', enter); tr.addEventListener('focusout', leave);
    });
  }

  /* the drawer's routes arrive as log lines when it opens; the strip button presses like a console button */
  function drawerLogLines() {
    var toggle = document.querySelector('[data-drawer-toggle]'), rail = document.querySelector('.rail');
    if (!toggle || !rail) return;
    toggle.addEventListener('click', function () {
      if (rm() || !rail.classList.contains('is-open')) return;
      var rows = rail.querySelectorAll('.routes > li, .rail-block > .label, .rail-purchase, .rail-foot, .rail-block .fraction');
      rows.forEach(function (r) { r.classList.remove('is-in'); });
      rows.forEach(function (r, i) { at(i * ROW, function () { r.classList.add('is-in'); }); });
      rail.classList.add('is-arriving');
      at(rows.length * ROW + ROW, function () { rail.classList.remove('is-arriving'); });
    });
  }

  /* plan cards: hover or focus brightens the card's cells in the scene and re arrives its inclusion rows */
  function planCardHover() {
    document.querySelectorAll('.plans-grid .plan').forEach(function (card) {
      var key = card.id;
      var rearrive = function () {
        if (rm()) return;
        var rows = card.querySelectorAll('.plan__rows > li');
        rows.forEach(function (r) { r.classList.remove('is-in'); r.classList.add('is-rearrive'); });
        rows.forEach(function (r, i) { at(i * ROW, function () { r.classList.add('is-in'); }); });
        at(rows.length * ROW + ROW, function () { rows.forEach(function (r) { r.classList.remove('is-rearrive'); }); });
        if (AQ.scene && AQ.scene.focus) AQ.scene.focus(key);
      };
      var release = function () { if (AQ.scene && AQ.scene.focus) AQ.scene.focus(null); };
      card.addEventListener('mouseenter', rearrive); card.addEventListener('focusin', rearrive);
      card.addEventListener('mouseleave', release); card.addEventListener('focusout', release);
    });
    var fundToggle = document.getElementById('quote-toggle');
    if (fundToggle) fundToggle.addEventListener('click', function () { if (AQ.scene && AQ.scene.focus) AQ.scene.focus(fundToggle.getAttribute('aria-expanded') === 'true' ? 'fund' : null); });
  }

  /* buttons: the press inverts for one frame on touch and keyboard as well as the pointer */
  function pressFeedback() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var b = e.target.closest('.btn, .link-console, .link-tertiary, .chips button, .expander__toggle');
      if (!b) return;
      b.classList.add('is-pressed'); at(FAST, function () { b.classList.remove('is-pressed'); });
    });
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.btn, .link-console, .link-tertiary, .chips button, .expander__toggle, .plan, .rail .routes a');
      if (!b) return;
      b.classList.add('is-pressed'); at(FAST, function () { b.classList.remove('is-pressed'); });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------------------------------
     posters: each scene's final state as inline SVG for reduced motion and for mobile
     ------------------------------------------------------------------------------------------------ */
  var G = [1, 5, 1, 1, 3, 5, 3, 1, 3, 3, 1, 1, 3, 3, 1, 1, 3, 1, 1, 3, 3, 3, 4, 4, 5, 4, 4, 4, 1, 5, 1, 1, 3, 3, 5, 3, 1, 4, 4, 3, 4, 1, 3, 3, 1, 3, 1, 5];
  function svgCells(cols, rows, stateOf, cell, gap, extra, w0) {
    cell = cell || 12; gap = gap || 2;
    var w = w0 || cols * cell + (cols - 1) * gap, h = rows * cell + (rows - 1) * gap;
    var out = '<svg class="scene-poster" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">';
    for (var i = 0; i < cols * rows; i++) {
      var st = stateOf(i);
      var x = (i % cols) * (cell + gap) + 0.5, y = Math.floor(i / cols) * (cell + gap) + 0.5;
      var fill = st === 'killed' ? '#3B423F' : st === 'kept' ? '#9BE15D' : 'none';
      var stroke = st === 'killed' ? '#3B423F' : st === 'kept' ? '#9BE15D' : st === 'live' ? '#D8DBD8' : '#1F2422';
      out += '<rect class="poster-cell cell is-' + st + '" data-gate="' + (st === 'kept' ? 5 : st === 'killed' ? G[i % 48] : 6) + '" x="' + x + '" y="' + y + '" width="' + (cell - 1) + '" height="' + (cell - 1) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1"/>';
    }
    return out + (extra || '') + '</svg>';
  }
  /* poster labels at the 12px label token (round 2: nothing under 12px anywhere) */
  var FONT = 'font-family="IBM Plex Mono, ui-monospace, monospace" font-size="12" fill="#7E8682"';
  AQ.posterFor = function (name, slot) {
    switch (name) {
      case 'sweep-corridor': {
        /* the elevation state: four gate planes receding as hairline rectangles, 42 grey cells in three clusters at
           three depths, the six kept at the front (design doc 5.12 section 8.3) */
        var w = 560, h = 246, out = '<svg class="scene-poster scene-poster--corridor" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true" focusable="false">';
        var depths = [0.0, 0.32, 0.6, 0.8], gl = ['point in time', 'walk forward', 'costs and slippage', 'capacity'];
        depths.forEach(function (d, gi) {
          var sc = 1 - d * 0.62, pw = 260 * sc, ph = 150 * sc, cx = 390 + d * 50, cy = 128 - d * 30;
          out += '<rect x="' + (cx - pw / 2) + '" y="' + (cy - ph / 2) + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="#1F2422" stroke-width="1"/>';
          out += '<text x="20" y="' + (44 + gi * 16) + '" ' + FONT + '>0' + (gi + 1) + ' · ' + gl[gi] + '</text>';
        });
        var groups = { 1: [], 3: [], 4: [], 5: [] };
        G.forEach(function (g, i) { if (groups[g]) groups[g].push(i); });
        var grid = function (indices, cx, cy, cell, fill, gate) {
          indices.forEach(function (i) {
            var col = i % 8, row = Math.floor(i / 8);
            out += '<rect class="poster-cell cell" data-gate="' + gate + '" x="' + (cx - (8 * (cell + 2)) / 2 + col * (cell + 2)) + '" y="' + (cy - (6 * (cell + 2)) / 2 + row * (cell + 2)) + '" width="' + cell + '" height="' + cell + '" fill="' + fill + '" stroke="' + fill + '" stroke-width="1"/>';
          });
        };
        grid(groups[1], 390, 128, 12, '#7E8682', 1); grid(groups[3], 405, 119, 8, '#7E8682', 3); grid(groups[4], 420, 110, 6, '#7E8682', 4); grid(groups[5], 200, 128, 14, '#9BE15D', 5);
        out += '<text x="20" y="236" ' + FONT + '>elevation · 42 killed in three clusters · 6 kept · 6 / 48</text></svg>';
        return out;
      }
      case 'three-seats-standing': {
        var out = '<svg class="scene-poster" viewBox="0 0 320 90" width="320" height="90" aria-hidden="true" focusable="false">';
        out += '<rect class="poster-cell cell" data-gate="1" x="12.5" y="38.5" width="11" height="11" fill="none" stroke="#D8DBD8"/><text x="12" y="70" ' + FONT + '>desk · 1</text>';
        for (var k = 0; k < 5; k++) out += '<rect class="poster-cell cell" data-gate="5" x="' + (90.5 + k * 14) + '" y="38.5" width="11" height="11" fill="#9BE15D" stroke="#9BE15D"/>';
        out += '<text x="90" y="70" ' + FONT + '>research · 5 · kept</text>';
        for (var r = 0; r < 6; r++) for (var c = 0; c < 8; c++) out += '<rect class="poster-cell cell" data-gate="2" x="' + (240.5 + c * 14) + '" y="' + (4.5 + r * 10) + '" width="11" height="7" fill="none" stroke="#1F2422"/>';
        out += '<text x="240" y="70" ' + FONT + '>fund · firm wide</text></svg>';
        return out;
      }
      case 'live-lattice': {
        var n = 48; var range = document.getElementById('ncount'); if (range) n = parseInt(range.value, 10) || 48;
        return svgCells(8, Math.ceil(n / 8), function () { return 'unrun'; }, 12, 2, '');
      }
      case 'ledger-stack': {
        var o = '<svg class="scene-poster" viewBox="0 0 150 200" width="150" height="200" aria-hidden="true" focusable="false">';
        for (var s = 0; s < 48; s++) { var st = G[s] === 5 ? 'kept' : 'killed'; o += '<rect class="poster-cell cell is-' + st + '" data-gate="' + G[s] + '" x="20" y="' + (196 - s * 4) + '" width="80" height="2" fill="' + (st === 'kept' ? '#9BE15D' : '#3B423F') + '"/>'; }
        return o + '<text x="20" y="12" ' + FONT + '>48 rows · 6 kept</text></svg>';
      }
      case 'archive-row': return '';
      case 'archive-row-unused': {
        var a = '<svg class="scene-poster" viewBox="0 0 400 40" width="400" height="40" aria-hidden="true" focusable="false"><line x1="0" y1="20.5" x2="400" y2="20.5" stroke="#1F2422"/>';
        ['2026 06 11', '2026 07 09', '2026 08 06', '2026 09 03'].forEach(function (d, i) { var kept = i === 3; a += '<rect class="poster-cell cell" data-gate="' + (kept ? 5 : 1) + '" x="' + (30.5 + i * 110) + '" y="14.5" width="11" height="11" fill="' + (kept ? '#9BE15D' : 'none') + '" stroke="' + (kept ? '#9BE15D' : '#D8DBD8') + '"/><text x="' + (30 + i * 110) + '" y="38" ' + FONT + '>' + d + '</text>'; });
        return a + '</svg>';
      }
      case 'extruded-curve': {
        var slug = window.location.pathname.split('/').pop() || 'post';
        var pts = walkPoints(slug, 120);
        var d1 = '', d2 = '';
        pts.forEach(function (p, i) { var x = i * 4, y = 60 - p * 40; if (i < 76) d1 += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; if (i >= 75) d2 += (i === 75 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; });
        return '<svg class="scene-poster scene-poster--curve" viewBox="0 0 480 70" width="480" height="70" preserveAspectRatio="none" aria-hidden="true" focusable="false"><line x1="0" y1="66.5" x2="480" y2="66.5" stroke="#1F2422"/><path d="' + d1 + '" fill="none" stroke="#7E8682" stroke-width="1"/><path d="' + d2 + '" fill="none" stroke="#9BE15D" stroke-width="1"/><text x="4" y="12" ' + FONT + '>illustrative · seeded from this note</text></svg>';
      }
      case 'waiting-frame':
        return '<svg class="scene-poster" viewBox="0 0 280 90" width="280" height="90" aria-hidden="true" focusable="false"><rect x="0.5" y="0.5" width="279" height="89" fill="none" stroke="#1F2422"/><line x1="0" y1="24.5" x2="280" y2="24.5" stroke="#1F2422"/><text x="8" y="16" ' + FONT + '>astroquanta · contact</text><text x="8" y="50" ' + FONT + ' fill="#D8DBD8">&gt; waiting for a message</text><rect x="182" y="42" width="6" height="10" fill="#D8DBD8"/></svg>';
      case 'candidate-cell':
        return '<svg class="scene-poster" viewBox="0 0 268 40" width="268" height="40" aria-hidden="true" focusable="false"><rect class="poster-cell cell" data-gate="1" x="8.5" y="8.5" width="23" height="23" fill="none" stroke="#1F2422"/><text x="44" y="24" ' + FONT + '>candidate · 0 of 4 sections</text></svg>';
      case 'kept-cell-held':
        return svgCells(8, 6, function (i) { return i === 34 ? 'kept' : 'unrun'; }, 12, 2, '');
      case 'candidate-none':
        return svgCells(8, 6, function () { return 'killed'; }, 12, 2, '');
    }
    return '';
  };
  function walkPoints(seedText, n) {
    var h = 0x811c9dc5; for (var i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    var a = h >>> 0; var rnd = function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    var y = 0, out = [], lo = 0, hi = 0;
    for (var k = 0; k < n; k++) { var u1 = Math.max(rnd(), 1e-9), u2 = rnd(); var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); y += 0.02 + z * 0.08; out.push(y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    return out.map(function (v) { return (v - lo) / ((hi - lo) || 1); });
  }

  /* ------------------------------------------------------------------------------------------------
     legal pages: Gate Planes Passing, hairline rectangles in CSS 3D that recede with reading progress
     ------------------------------------------------------------------------------------------------ */
  AQ.legalPlanes = function () {
    var index = document.querySelector('.legal-index');
    var doc = document.querySelector('.legal-doc');
    if (!index || !doc) return;
    var route = document.body.getAttribute('data-route');
    var count = route === 'privacy-policy' ? 3 : 4;
    var sections = doc.querySelectorAll('section');
    var per = Math.ceil(sections.length / count);
    var wrap = document.createElement('div');
    wrap.className = 'gate-planes';
    wrap.setAttribute('aria-hidden', 'true');
    var planes = [];
    for (var i = 0; i < count; i++) {
      var pl = document.createElement('div');
      pl.className = 'gate-plane';
      var a = i * per + 1, b = Math.min(sections.length, (i + 1) * per);
      pl.innerHTML = '<span style="top:' + (6 + i * 16) + 'px">sections ' + String(a).padStart(2, '0') + ' to ' + String(b).padStart(2, '0') + '</span>';
      wrap.appendChild(pl); planes.push(pl);
    }
    index.appendChild(wrap);
    var paint = function () {
      var r = doc.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      planes.forEach(function (pl, i) {
        var z = (i - p * count) * 120;
        pl.style.transform = 'translateZ(' + (-Math.max(-60, z)) + 'px)';
        pl.classList.toggle('is-passed', z < -20);
      });
    };
    if (rm()) { planes.forEach(function (pl, i) { pl.style.transform = 'translateZ(' + (-i * 120) + 'px)'; }); return; }
    window.addEventListener('scroll', paint, { passive: true });
    paint();
  };

  /* the Blog index draws the archive row once: the DOM shelf under reduced motion and on mobile, the 3D row otherwise */
  AQ.onSceneReady = function (scene) {
    if (scene && document.body.getAttribute('data-scene') === 'archive-row') document.body.classList.add('has-live-archive');
  };

  function init() {
    blogDateTick();
    drawerLogLines();
    planCardHover();
    pressFeedback();
    if (rm()) { document.querySelectorAll('[data-enter]').forEach(function (r) { r.classList.add('is-entered'); }); return; }
    if (AQ.onLoaderResolved) AQ.onLoaderResolved(observe); else observe();
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
