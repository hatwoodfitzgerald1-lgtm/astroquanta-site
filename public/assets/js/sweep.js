/* The Trial Sweep Simulator. Deterministic, browser only, no market data.
   Logic per the offering spec section 6.2: FNV 1a 32 seed, mulberry32 PRNG, six uniforms per trial in fixed order,
   five gates (point in time, walk forward, costs, capacity, count). Same inputs always give the same output. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};

  var UNIVERSES = [
    { label: 'US large cap (500 names)', pLookahead: 0.30, costRt: 5, capBase: 400 },
    { label: 'US all cap (3,000 names)', pLookahead: 0.40, costRt: 12, capBase: 150 },
    { label: 'Global developed (2,000 names)', pLookahead: 0.35, costRt: 9, capBase: 300 },
    { label: 'Futures (60 contracts)', pLookahead: 0.05, costRt: 2, capBase: 600 }
  ];
  var HORIZONS = [
    { label: '1 day', edgeScale: 4, capMult: 0.25 },
    { label: '5 days', edgeScale: 9, capMult: 0.50 },
    { label: '21 days', edgeScale: 20, capMult: 1.00 },
    { label: '63 days', edgeScale: 45, capMult: 1.60 }
  ];
  var GATES = ['look ahead', 'walk forward', 'costs', 'capacity', 'count'];

  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function haircut(n) { return 0.065 * Math.sqrt(2 * Math.log(n)); }

  AQ.runSweep = function (hypothesis, universeIndex, horizonIndex, n) {
    var hyp = (hypothesis || '').trim() || 'untitled hypothesis';
    var seed = fnv1a(hyp + '|' + universeIndex + '|' + horizonIndex + '|' + n);
    var rand = mulberry32(seed);
    var u = UNIVERSES[universeIndex], hz = HORIZONS[horizonIndex];
    var h = haircut(n);
    var trials = [];
    for (var i = 1; i <= n; i++) {
      var u1 = rand(), u2 = rand(), u3 = rand(), u4 = rand(), u5 = rand(), u6 = rand();
      var z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12))) * Math.cos(2 * Math.PI * u2);
      var t = { id: i, sIs: clamp(0.95 + 0.45 * z, 0.10, 2.40), killedAt: null, reason: '' };
      if (u3 < u.pLookahead) {
        t.killedAt = 0; t.reason = 'look ahead: restated fundamentals inside the fit window';
      } else {
        t.sWf = t.sIs * (0.30 + 0.50 * u4);
        if (t.sWf < 0.45) {
          t.killedAt = 1; t.reason = 'walk forward: out of sample Sharpe under 0.45';
        } else {
          t.gross = hz.edgeScale * t.sWf;
          t.net = t.gross - u.costRt;
          if (t.net <= 0) {
            t.killedAt = 2; t.reason = 'costs: edge under ' + Math.round(t.gross) + ' bps against a ' + u.costRt + ' bp round trip';
          } else {
            t.sNet = t.sWf * t.net / t.gross;
            t.cap = Math.round((u.capBase * hz.capMult * (0.4 + 1.2 * u5)) / 10) * 10;
            if (t.cap < 40) {
              t.killedAt = 3; t.reason = 'capacity: under 40 million dollars before impact';
            } else {
              t.sHc = t.sNet - h;
              if (t.sHc <= 0) {
                t.killedAt = 4; t.reason = 'count: haircut of ' + h.toFixed(2) + ' for ' + n + ' trials exceeds the edge';
              } else {
                t.halfLife = 8 + Math.round(24 * u6);
              }
            }
          }
        }
      }
      trials.push(t);
    }
    var kills = [0, 0, 0, 0, 0];
    var maxGrossKilled = 0;
    var kept = [];
    trials.forEach(function (t) {
      if (t.killedAt === null) kept.push(t);
      else { kills[t.killedAt]++; if (t.killedAt === 2) maxGrossKilled = Math.max(maxGrossKilled, t.gross); }
    });
    var candidate = null;
    kept.forEach(function (t) { if (!candidate || t.sHc > candidate.sHc) candidate = t; });
    return {
      seed: seed, hypothesis: hyp, n: n, universe: u, horizon: hz, haircut: h,
      trials: trials, kills: kills, kept: kept, candidate: candidate, maxGrossKilled: maxGrossKilled
    };
  };

  /* page wiring */
  var $ = function (id) { return document.getElementById(id); };
  var timers = [];
  function clearTimers() { timers.forEach(window.clearTimeout); timers = []; }
  function later(fn, ms) { if (AQ.reducedMotion() || ms === 0) { fn(); } else { timers.push(window.setTimeout(fn, ms)); } }

  function row(label, detail, status, statusClass, cursor) {
    var li = document.createElement('li');
    var sc = status ? '<span class="status ' + statusClass + '" aria-label="' + status.charAt(0) + status.slice(1).toLowerCase() + '">' + status + '</span>' : '<span class="status"></span>';
    li.innerHTML = '<span class="glyph" aria-hidden="true">&gt;</span><span class="label">' + label + '</span><span class="arrow" aria-hidden="true">→</span><span class="detail' + (cursor ? ' cursor' : '') + '">' + detail + '</span>' + sc;
    return li;
  }

  AQ.sweepState = { n: 48, cells: [] };
  function sceneRebuild(n) { AQ.sweepState = { n: n, cells: [] }; if (AQ.scene && AQ.scene.rebuild) AQ.scene.rebuild(n); }
  function sceneCell(idx, state) { AQ.sweepState.cells[idx - 1] = state; if (AQ.scene && AQ.scene.setCell) AQ.scene.setCell(idx, state); }

  function buildGrid(n, result) {
    var grid = $('trial-grid');
    grid.innerHTML = '';
    sceneRebuild(n);
    for (var i = 1; i <= n; i++) {
      var li = document.createElement('li');
      li.setAttribute('data-trial', i);
      li.setAttribute('tabindex', '0');
      var tip = 'trial ' + i + ' · not yet run';
      if (result) {
        var t = result.trials[i - 1];
        tip = t.killedAt === null
          ? 'trial ' + i + ' · kept · ' + t.sHc.toFixed(2) + ' haircut for ' + n + ' trials'
          : 'trial ' + i + ' · killed at ' + GATES[t.killedAt] + ' · ' + t.reason;
      }
      li.setAttribute('data-tip', tip);
      li.setAttribute('aria-label', tip);
      grid.appendChild(li);
    }
    grid.setAttribute('aria-label', result ? '' : 'Grid of ' + n + ' outlined cells with nothing filled in.');
    if (AQ.rovingGrid) AQ.rovingGrid(grid);
  }

  function setLive(id, v) { var el = $(id); el.textContent = v; el.setAttribute('data-value', String(v)); }
  function setStats(n, k, hc, cap) {
    setLive('stat-n', n);
    setLive('stat-k', k);
    setLive('stat-hc', hc);
    setLive('stat-cap', cap);
    $('stat-n-label').textContent = k === '·' ? 'specifications' : 'specifications run';
    $('stat-hc-label').textContent = (hc === '·' || hc === 'none') ? 'haircut Sharpe' : 'haircut Sharpe for ' + n + ' trials';
    $('stat-cap-label').textContent = (cap === '·' || cap === 'none') ? 'capacity' : 'capacity before impact';
  }

  function emptyState(n) {
    clearTimers();
    $('frameB-title').textContent = 'astroquanta · trial log 0 rows';
    $('frameB-lead').textContent = 'Waiting.';
    var rows = $('frameB-rows');
    rows.innerHTML = '';
    rows.appendChild(row('waiting for a hypothesis', '', '', '', true));
    $('frameB-foot').textContent = '';
    buildGrid(n, null);
    $('frameC').hidden = true;
    $('result-note').hidden = true;
    setStats(n, '·', '·', '·');
    AQ.setFractions('[data-sweep-fraction]', n, n);
  }

  function fillCells(indices, cls, startMs, onEach) {
    indices.forEach(function (idx, j) {
      later(function () {
        var cell = $('trial-grid').querySelector('[data-trial="' + idx + '"]');
        if (cell) { cell.classList.remove('is-killed', 'is-kept'); cell.classList.add(cls); }
        sceneCell(idx, cls === 'is-kept' ? 'kept' : 'killed');
        if (onEach) onEach();
      }, startMs + j * 40);
    });
  }

  /* the result's equity curve strip: a seeded random walk (the same generator), in sample grey 2 to the split, walk
     forward in the accent after it; 1px strokes that never scale; drawn left to right once by the curve entrance */
  function curveStrip(r) {
    var rnd = mulberry32(r.seed ^ 0x5bd1e995), pts = 240, y = 0, walk = [];
    var drift = (r.candidate ? r.candidate.sWf : 0.3) / Math.sqrt(252) * 4;
    for (var i = 0; i < pts; i++) { var u1 = Math.max(rnd(), 1e-9), u2 = rnd(); var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); y += drift + z * 0.9; walk.push(y); }
    var lo = Math.min.apply(null, walk), hi = Math.max.apply(null, walk), span = (hi - lo) || 1, split = Math.round(pts * 0.64);
    var seg = function (a, b) { var out = []; for (var j = a; j < b; j++) out.push((j * 720 / (pts - 1)).toFixed(2) + ',' + (100.5 - (walk[j] - lo) / span * 92).toFixed(2)); return out.join(' '); };
    var sIs = r.candidate ? r.candidate.sIs.toFixed(2) : 'none', sWf = r.candidate ? r.candidate.sWf.toFixed(2) : 'none';
    var fig = document.createElement('figure');
    fig.className = 'curve-fig'; fig.setAttribute('role', 'img'); fig.setAttribute('data-kit', 'equity-curve-live'); fig.style.setProperty('--curve-h', '64px');
    fig.setAttribute('aria-label', 'Two thin equity curves, grey for in sample and green for walk forward, seeded from this run and labelled illustrative. ' + (r.candidate ? 'Candidate id ' + r.candidate.id + ': ' + sIs + ' in sample, ' + sWf + ' walk forward.' : 'No candidate.'));
    fig.innerHTML = '<svg viewBox="0 0 720 101" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<line x1="0" y1="100.5" x2="720" y2="100.5" stroke="#1F2422" stroke-width="1" class="axis"/><line x1="0.5" y1="8" x2="0.5" y2="100.5" stroke="#1F2422" stroke-width="1" class="axis"/>' +
      '<line x1="' + (split * 720 / (pts - 1)).toFixed(1) + '" y1="8" x2="' + (split * 720 / (pts - 1)).toFixed(1) + '" y2="100.5" stroke="#1F2422" stroke-width="1" class="axis"/>' +
      '<polyline points="' + seg(0, split + 1) + '" fill="none" stroke="#7E8682" stroke-width="1" class="curve curve--in-sample"/>' +
      '<polyline points="' + seg(split, pts) + '" fill="none" stroke="' + (r.candidate ? '#9BE15D' : '#3B423F') + '" stroke-width="1" class="curve curve--walk-forward"/></svg>' +
      '<div class="curve__ticks" aria-hidden="true"><span>start</span><span class="curve__split">split</span><span>end</span></div>' +
      '<div class="curve__legend" aria-hidden="true"><span class="curve__key curve__key--in">in sample ' + sIs + '</span><span class="curve__key curve__key--wf">walk forward ' + sWf + '</span><span class="curve__note">illustrative output</span></div>';
    return fig;
  }

  function renderResult(r) {
    var n = r.n, k = r.kept.length;
    var oldCurve = $('frameC').querySelector('.curve-fig'); if (oldCurve) oldCurve.remove();
    $('frameB-title').textContent = 'astroquanta · trial log ' + n + ' rows';
    $('frameB-lead').textContent = 'Running. Rows arrive in gate order.';
    var rows = $('frameB-rows');
    rows.innerHTML = '';
    buildGrid(n, r);
    setStats(n, n, '·', '·');
    var standing = n;
    var tick = function () { standing--; setLive('stat-k', standing); AQ.setFractions('[data-sweep-fraction]', standing, n); };

    var reasons = [
      'restated fundamentals inside the fit window',
      'out of sample Sharpe under 0.45',
      'edge under ' + Math.max(1, Math.round(r.maxGrossKilled)) + ' bps against a ' + r.universe.costRt + ' bp round trip',
      'under 40 million dollars before impact',
      'haircut of ' + r.haircut.toFixed(2) + ' for ' + n + ' trials exceeds the edge'
    ];
    var t = 0;
    for (var g = 0; g < 5; g++) {
      if (!r.kills[g]) continue;
      (function (gate, at) {
        var ids = r.trials.filter(function (x) { return x.killedAt === gate; }).map(function (x) { return x.id; });
        later(function () { rows.appendChild(row('killed ' + ids.length + ', ' + GATES[gate], reasons[gate], 'KILLED', 'is-killed', false)); }, at);
        fillCells(ids, 'is-killed', at, tick);
        t += 120;
      })(g, t);
    }
    var keptIds = r.kept.map(function (x) { return x.id; });
    var lastCellDone = t + Math.max(0, keptIds.length - 1) * 40;
    later(function () {
      if (k > 0) rows.appendChild(row('kept ' + k, 'each with its own out of sample window; haircut Sharpe beside the raw one', 'KEPT', 'is-kept', false));
      else rows.appendChild(row('kept 0', 'nothing to allocate. That is the result.', '', '', false));
    }, t);
    fillCells(keptIds, 'is-kept', t, null);

    later(function () {
      $('frameB-lead').textContent = 'The denominator, which is the entire point.';
      $('frameB-foot').textContent = n + ' specifications. ' + k + ' kept. The trial count travelled with the result.';
      setLive('stat-k', k);
      AQ.setFractions('[data-sweep-fraction]', k, n);
      var c = $('frameC');
      var crow = $('frameC-rows');
      crow.innerHTML = '';
      if (r.candidate) {
        var cd = r.candidate;
        $('frameC-title').textContent = 'astroquanta · candidate id ' + cd.id;
        $('frameC-lead').textContent = 'The survivor with the highest Sharpe after the haircut. Costed, capped and counted.';
        crow.appendChild(row('sharpe', cd.sIs.toFixed(2) + ' in sample; ' + cd.sWf.toFixed(2) + ' walk forward; ' + cd.sHc.toFixed(2) + ' haircut for ' + n + ' trials', '', '', false));
        crow.appendChild(row('capacity', cd.cap + ' million dollars before impact exceeds a third of the edge', '', '', false));
        crow.appendChild(row('decay watch', 'half life estimate ' + cd.halfLife + ' months; monitor rebuilt weekly.', 'LIVE', 'is-live', false));
        $('frameC-foot').textContent = 'Trial count ' + n + '. Haircut ' + r.haircut.toFixed(2) + '. The denominator travelled with the result.';
        setStats(n, k, cd.sHc.toFixed(2), '$' + cd.cap + 'M');
        $('trial-grid').setAttribute('aria-label', 'Grid of ' + n + ' trial cells. ' + (n - k) + ' filled grey for killed trials, ' + k + ' filled green for kept trials.');
      } else {
        $('frameC-title').textContent = 'astroquanta · candidate none';
        $('frameC-lead').textContent = 'Nothing cleared all five gates.';
        crow.appendChild(row('kept 0', 'nothing to allocate. That is the result.', '', '', false));
        $('frameC-foot').textContent = 'A sweep that kills everything has done its job. Raise the horizon, lower the count, or change the hypothesis.';
        setStats(n, 0, 'none', 'none');
        $('trial-grid').setAttribute('aria-label', 'A grid of ' + n + ' cells, every one filled grey. No cell is green.');
      }
      var strip = curveStrip(r);
      crow.parentNode.insertBefore(strip, crow);
      c.hidden = false;
      c.classList.remove('is-entered');
      if (typeof AQ.enterNow === 'function') AQ.enterNow(c, 'retype curve log');
      $('result-note').hidden = false;
    }, lastCellDone + 120);
  }

  AQ.pageInit = function () {
    var form = $('sweep-form');
    if (!form) return;
    var hyp = $('hypothesis'), uni = $('universe'), hor = $('horizon'), range = $('ncount'), readout = $('n-readout'), run = $('run-btn');
    var hasRun = false;
    var ticks = document.querySelectorAll('[data-range-ticks="ncount"] span');
    function paintTicks() { var v = parseInt(range.value, 10); Array.prototype.forEach.call(ticks, function (t) { var n = parseInt(t.getAttribute('data-n'), 10); t.classList.toggle('is-past', n < v); t.classList.toggle('is-current', n === v); }); }
    function showValue() { readout.textContent = range.value; readout.setAttribute('data-value', range.value); paintTicks(); }
    showValue();
    emptyState(parseInt(range.value, 10));
    function changed() {
      showValue();
      if (hasRun) { run.textContent = 'Inputs changed. Run again'; hasRun = false; }
      emptyState(parseInt(range.value, 10));
    }
    /* the readout, the ticks and the counts follow the input's value events (input and change), never pointer events, so
       the keyboard (ArrowRight, End, Home) and touch agree with the run */
    range.addEventListener('input', changed);
    range.addEventListener('change', changed);
    range.addEventListener('keyup', showValue);
    uni.addEventListener('change', changed);
    hor.addEventListener('change', changed);
    hyp.addEventListener('input', function () {
      if (hyp.value.length > 48) AQ.setError(hyp, '> hypothesis → 48 characters at most'); else AQ.setError(hyp, '');
      if (hasRun) { run.textContent = 'Inputs changed. Run again'; hasRun = false; emptyState(parseInt(range.value, 10)); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (hyp.value.length > 48) { AQ.setError(hyp, '> hypothesis → 48 characters at most'); hyp.focus(); return; }
      var r = AQ.runSweep(hyp.value, parseInt(uni.value, 10), parseInt(hor.value, 10), parseInt(range.value, 10));
      clearTimers();
      renderResult(r);
      hasRun = true;
      run.textContent = 'Run the sweep';
    });

    /* the grid's tooltips (hover, focus and tap) are the kit tooltip in site.js: every cell carries data-tip */
    var legacy = $('tooltip'); if (legacy) legacy.remove();
  };
})();
