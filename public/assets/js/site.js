/* Astroquanta shared script. Pass 0: rail clock, mobile drawer, plan and order state, purchase links,
   the SMS opt in block, the contact and quote forms, the blog filter, the 404 echo, the legal section index,
   and the lazy loader for Three.js and GSAP (inert until the motion pass wires scenes). */
(function () {
  'use strict';

  var AQ = window.AQ = window.AQ || {};

  /* storage with an in memory fallback */
  var memory = {};
  AQ.store = {
    get: function (key) {
      try { var v = window.localStorage.getItem(key); if (v !== null) return JSON.parse(v); } catch (e) { /* fall through */ }
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    },
    set: function (key, value) {
      memory[key] = value;
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* memory only */ }
    },
    remove: function (key) {
      delete memory[key];
      try { window.localStorage.removeItem(key); } catch (e) { /* memory only */ }
    }
  };

  /* the page count (pass 2): the rail fraction is plain text; the header's display Fraction keeps every digit in
     its own slot so the ones column holds and pass 4 can clip each digit. One call updates either form. */
  AQ.setFraction = function (el, num, den, suffix) {
    if (!el) return;
    num = String(num); den = String(den);
    if (!el.classList.contains('fraction-setpiece')) { el.textContent = num + ' / ' + den + (suffix || ''); return; }
    var numEl = el.querySelector('.num'), denEl = el.querySelector('.den');
    if (!numEl || !denEl) { el.textContent = num + ' / ' + den; return; }
    var slots = Math.max(num.length, den.length);
    function fill(target, text) {
      var digits = target.querySelectorAll('.digit');
      var padded = text;
      while (padded.length < slots) padded = ' ' + padded;
      if (digits.length !== slots) {
        target.innerHTML = '';
        for (var i = 0; i < slots; i++) { var d = document.createElement('span'); d.className = 'digit'; d.setAttribute('data-digit', ''); target.appendChild(d); }
        digits = target.querySelectorAll('.digit');
      }
      for (var j = 0; j < slots; j++) { var ch = padded.charAt(j); digits[j].textContent = ch === ' ' ? '' : ch; }
    }
    fill(numEl, num); fill(denEl, den);
    var label = el.getAttribute('aria-label') || '';
    if (label) el.setAttribute('aria-label', label.replace(/^\d+ of \d+/, num + ' of ' + den));
  };
  AQ.setFractions = function (selector, num, den, suffix) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (el) { AQ.setFraction(el, num, den, suffix); });
  };

  AQ.PLANS = {
    desk: { key: 'desk', name: 'Desk', seats: 1, price: 1800, perSeat: 1800, seatWord: '1 seat' },
    research: { key: 'research', name: 'Research', seats: 5, price: 7500, perSeat: 1500, seatWord: '5 seats' }
  };

  AQ.money = function (n, cents) {
    var s = n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
    return '$' + s;
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  AQ.formatDate = function (d) {
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  };
  AQ.formatDateTime = function (d) {
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return AQ.formatDate(d) + ' ' + hh + ':' + mm;
  };
  AQ.nextBilling = function (from) {
    var d = new Date(from.getTime());
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
  };

  AQ.reducedMotion = function () {
    try {
      if (/[?&]qa=rm(&|$)/.test(window.location.search)) return true;
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  };

  AQ.validEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()); };
  AQ.validPhone = function (v) { var d = String(v).replace(/\D/g, ''); return d.length >= 10 && d.length <= 15; };

  AQ.setError = function (field, message) {
    var wrap = field.closest('.field, .check');
    var err = wrap ? wrap.querySelector('.error') : null;
    if (err) err.textContent = message || '';
    if (wrap) wrap.classList.toggle('is-invalid', !!message);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    var ok = wrap ? wrap.querySelector('.ok') : null;
    if (ok) ok.textContent = message ? '' : (field.value ? 'OK' : '');
  };

  /* the toast (pass 5): one log line in a hairline frame at the column's top right, the status token resolved at the
     right edge, dismissible with the close button or Escape, role status; it leaves on its own after six seconds */
  AQ.toast = function (text) {
    var t = document.getElementById('toast');
    if (!t) return;
    var m = /^(.*?)\s{2,}([A-Z]{2,})$/.exec(text);
    var line = m ? m[1] : text, token = m ? m[2] : '';
    t.innerHTML = '';
    var title = document.createElement('div'); title.className = 'toast__title';
    title.innerHTML = '<span>astroquanta · status</span><span data-clock>' + (document.querySelector('[data-clock]') ? document.querySelector('[data-clock]').textContent : '04:12:00') + '</span>';
    var body = document.createElement('p'); body.className = 'toast__text';
    body.textContent = line;
    if (token) { var st = document.createElement('span'); st.className = 'status'; st.textContent = token; st.setAttribute('aria-label', token.charAt(0) + token.slice(1).toLowerCase()); body.appendChild(st); }
    var close = document.createElement('button'); close.type = 'button'; close.className = 'toast__close'; close.textContent = 'dismiss'; close.setAttribute('aria-label', 'Dismiss this message');
    close.addEventListener('click', function () { AQ.toastHide(); });
    t.appendChild(title); t.appendChild(body); t.appendChild(close);
    t.hidden = false;
    toastLane();
    window.clearTimeout(t._timer);
    t._timer = window.setTimeout(AQ.toastHide, 6000);
  };
  AQ.toastHide = function () { var t = document.getElementById('toast'); if (!t) return; window.clearTimeout(t._timer); t.innerHTML = ''; t.hidden = true; t.style.bottom = ''; };
  /* the toast lane (pass 6): the toast sits at the viewport's bottom right; while the footer frame (the seal and the
     identity block) is in view the toast lifts to sit just above the frame's top edge, so it never covers the seal */
  function toastLane() {
    var t = document.getElementById('toast');
    if (!t || t.hidden) return;
    var f = document.querySelector('.site-footer .frame--footer') || document.querySelector('.site-footer');
    if (!f) return;
    var r = f.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.top < vh && r.bottom > 0) t.style.bottom = Math.max(16, Math.round(vh - r.top + 16)) + 'px';
    else t.style.bottom = '';
  }
  window.addEventListener('scroll', toastLane, { passive: true });
  window.addEventListener('resize', toastLane);

  /* rail clock: 04:12:00 ticking at 1Hz; static under reduced motion */
  function startClock() {
    var clocks = document.querySelectorAll('[data-clock]');
    if (!clocks.length) return;
    var base = 4 * 3600 + 12 * 60;
    var start = Date.now();
    function paint() {
      var elapsed = AQ.reducedMotion() ? 0 : Math.floor((Date.now() - start) / 1000);
      var total = (base + elapsed) % 86400;
      var h = String(Math.floor(total / 3600)).padStart(2, '0');
      var m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
      var s = String(total % 60).padStart(2, '0');
      var text = h + ':' + m + ':' + s;
      for (var i = 0; i < clocks.length; i++) clocks[i].textContent = text;
    }
    paint();
    if (!AQ.reducedMotion()) window.setInterval(paint, 1000);
  }

  /* mobile drawer */
  function drawer() {
    var toggle = document.querySelector('[data-drawer-toggle]');
    var rail = document.querySelector('.rail');
    if (!toggle || !rail) return;
    function setOpen(open) {
      rail.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close routes' : 'Open routes');
      toggle.textContent = open ? 'close' : 'menu';
      if (open) {
        var first = rail.querySelector('a, button');
        if (first) first.focus();
      }
    }
    toggle.addEventListener('click', function () { setOpen(!rail.classList.contains('is-open')); });
    /* choosing a route closes the drawer (pass 5), so a same page anchor or a cancelled navigation never leaves it open */
    rail.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (a && rail.classList.contains('is-open')) { setOpen(false); toggle.focus({ preventScroll: true }); }
    });
    AQ.closeDrawer = function () { if (rail.classList.contains('is-open')) setOpen(false); };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && rail.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
      if (e.key === 'Tab' && rail.classList.contains('is-open')) {
        var focusables = rail.querySelectorAll('a[href], button:not([disabled]), input, select, textarea');
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* purchase links store the plan before navigating */
  function purchaseLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="/checkout?plan="]');
      if (!a) return;
      var m = a.getAttribute('href').match(/plan=(desk|research)/);
      if (m) AQ.store.set('aq_plan', m[1]);
    });
  }

  /* SMS opt in block (Home, confirmation, footer) */
  function smsForms() {
    var forms = document.querySelectorAll('form[data-sms-form]');
    Array.prototype.forEach.call(forms, function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var phone = form.querySelector('input[type="tel"]');
        var c1 = form.querySelector('input[data-consent="terms"]');
        var c2 = form.querySelector('input[data-consent="sms"]');
        var errors = 0;
        if (!AQ.validPhone(phone.value)) { AQ.setError(phone, '> phone → enter a mobile number with area code'); errors++; } else { AQ.setError(phone, ''); }
        if (!c1.checked) { AQ.setError(c1, '> terms → accept the Terms & Privacy Policy to continue'); errors++; } else { AQ.setError(c1, ''); }
        if (!c2.checked) { AQ.setError(c2, '> consent → tick the box to receive account notifications'); errors++; } else { AQ.setError(c2, ''); }
        if (errors) {
          var firstBad = form.querySelector('[aria-invalid="true"]');
          if (firstBad) firstBad.focus();
          return;
        }
        var button = form.querySelector('button[type="submit"]');
        button.setAttribute('aria-busy', 'true');
        Array.prototype.forEach.call(form.elements, function (el) { el.disabled = true; });
        var line = '> sms → account notifications on for ' + phone.value.trim() + '. Reply STOP at any time to cancel.';
        window.setTimeout(function () {
          var success = document.createElement('p');
          success.className = 'form-success';
          success.setAttribute('role', 'status');
          success.innerHTML = line.replace(/</g, '&lt;') + '   <span class="status" aria-label="Done">DONE</span>';
          form.replaceWith(success);
          AQ.toast(line + '   DONE');
        }, AQ.reducedMotion() ? 0 : 360);
      });
    });
  }

  /* generic validated form (contact, quote): data-validated-form, success text in data-success */
  function validatedForms() {
    var forms = document.querySelectorAll('form[data-validated-form]');
    Array.prototype.forEach.call(forms, function (form) {
      var counter = form.querySelector('[data-counter-for]');
      if (counter) {
        var ta = form.querySelector('#' + counter.getAttribute('data-counter-for'));
        var paint = function () { counter.textContent = ta.value.length.toLocaleString('en-US') + ' / 2,000'; };
        ta.addEventListener('input', paint); paint();
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var honeypot = form.querySelector('input[name="website"]');
        if (honeypot && honeypot.value) { return; }
        var bad = 0;
        var fields = form.querySelectorAll('[data-rule]');
        Array.prototype.forEach.call(fields, function (field) {
          var rule = field.getAttribute('data-rule');
          var label = field.getAttribute('data-label');
          var v = field.value.trim();
          var msg = '';
          var required = field.hasAttribute('required');
          if (required && !v) msg = '> ' + label + ' → ' + (field.getAttribute('data-required-message') || 'required');
          else if (v && rule === 'email' && !AQ.validEmail(v)) msg = '> ' + label + ' → enter a work email address';
          else if (v && rule === 'phone' && !AQ.validPhone(v)) msg = '> ' + label + ' → enter a phone number with area code';
          else if (rule === 'maxlen' && v.length > 2000) msg = '> ' + label + ' → 2,000 characters at most';
          else if (rule === 'seats' && v && !(/^\d+$/.test(v) && parseInt(v, 10) >= 6)) msg = '> ' + label + ' → enter a number of six or more';
          AQ.setError(field, msg);
          if (msg) bad++;
        });
        var formError = form.querySelector('.form-error');
        if (bad) {
          if (formError) formError.textContent = '> ' + (form.getAttribute('data-form-label') || 'form') + ' → ' + bad + ' fields need attention';
          var firstBad = form.querySelector('[aria-invalid="true"]');
          if (firstBad) firstBad.focus();
          return;
        }
        if (formError) formError.textContent = '';
        var button = form.querySelector('button[type="submit"]');
        button.setAttribute('aria-busy', 'true');
        Array.prototype.forEach.call(form.elements, function (el) { el.disabled = true; });
        var successText = form.getAttribute('data-success');
        window.setTimeout(function () {
          var success = document.createElement('p');
          success.className = 'form-success';
          success.setAttribute('role', 'status');
          success.innerHTML = successText.replace(/</g, '&lt;') + '   <span class="status" aria-label="Done">DONE</span>';
          form.replaceWith(success);
          AQ.toast(successText + '   DONE');
          try { document.dispatchEvent(new CustomEvent('aq:formsuccess', { detail: form })); } catch (err) { /* ignore */ }
          Array.prototype.forEach.call(document.querySelectorAll('[data-fraction-on-success]'), function (fraction) {
            var parts = fraction.getAttribute('data-fraction-on-success').split('/');
            AQ.setFraction(fraction, parts[0].trim(), (parts[1] || '').trim(), fraction.classList.contains('fraction-setpiece') ? '' : ' sent');
          });
        }, AQ.reducedMotion() ? 0 : 360);
      });
    });
  }

  /* expanders (the Fund quote expander, the sweep gate explainer, the CVV help) */
  function expanders() {
    var toggles = document.querySelectorAll('[data-expander]');
    Array.prototype.forEach.call(toggles, function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.hidden = open;
        if (!open) {
          /* pass 4: an opened panel runs its own entrance (the quote frame's edges and fields, the explainer's rows) */
          if (typeof AQ.enterNow === 'function' && panel.hasAttribute('data-enter-open') && !panel.classList.contains('is-entered')) AQ.enterNow(panel, panel.getAttribute('data-enter-open'));
          var first = panel.querySelector('input, select, textarea');
          if (first) first.focus();
        }
      });
    });
    var openers = document.querySelectorAll('[data-open-expander]');
    Array.prototype.forEach.call(openers, function (a) {
      a.addEventListener('click', function (e) {
        var btn = document.getElementById(a.getAttribute('data-open-expander'));
        if (!btn) return;
        e.preventDefault();
        if (btn.getAttribute('aria-expanded') !== 'true') btn.click();
        btn.scrollIntoView({ block: 'start' });
      });
    });
  }

  /* /plans#research focuses the Research card's purchase button */
  function planFocus() {
    var hash = window.location.hash;
    if (hash !== '#research' && hash !== '#fund') return;
    var card = document.querySelector(hash);
    if (!card) return;
    var target = card.querySelector('a.btn-primary, a, button');
    if (target) { card.scrollIntoView({ block: 'start' }); window.setTimeout(function () { target.focus({ preventScroll: true }); }, 0); }
  }

  /* blog filter chips */
  function blogFilter() {
    var chips = document.querySelectorAll('[data-topic-chip]');
    if (!chips.length) return;
    var rows = document.querySelectorAll('[data-topic-row]');
    var empty = document.querySelector('[data-filter-empty]');
    function apply(topic, push) {
      var shown = 0;
      Array.prototype.forEach.call(chips, function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-topic-chip') === topic ? 'true' : 'false'); });
      Array.prototype.forEach.call(rows, function (r) {
        var show = topic === 'all' || r.getAttribute('data-topic-row') === topic;
        r.hidden = !show;
        if (show) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      AQ.setFractions('[data-blog-fraction]', shown, 4, ' posts');
      if (push) {
        var url = topic === 'all' ? window.location.pathname : window.location.pathname + '?topic=' + encodeURIComponent(topic);
        try { window.history.replaceState(null, '', url); } catch (e) { /* ignore */ }
      }
    }
    Array.prototype.forEach.call(chips, function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-topic-chip'), true); }); });
    var clear = document.querySelector('[data-filter-clear]');
    if (clear) clear.addEventListener('click', function (e) { e.preventDefault(); apply('all', true); });
    var m = window.location.search.match(/[?&]topic=([^&]+)/);
    if (m) apply(decodeURIComponent(m[1].replace(/\+/g, ' ')), false);
  }

  /* 404: echo the requested path, escaped and truncated to 48 characters */
  function notFoundEcho() {
    var slot = document.querySelector('[data-404-path]');
    if (!slot) return;
    var p = window.location.pathname + window.location.search;
    if (p.length > 48) p = p.slice(0, 48);
    slot.textContent = p;
  }

  /* legal pages: sticky section index tracks the current section and the rail fraction follows */
  function legalIndex() {
    var index = document.querySelector('[data-section-index]');
    if (!index || !('IntersectionObserver' in window)) return;
    var links = index.querySelectorAll('a[href^="#"]');
    var total = links.length;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        var n = 0;
        Array.prototype.forEach.call(links, function (a, i) {
          var hit = a.getAttribute('href') === '#' + id;
          a.parentNode.toggleAttribute('aria-current', hit);
          if (hit) n = i + 1;
        });
        if (n) AQ.setFractions('[data-section-fraction]', n, total, ' sections');
        try { index.dispatchEvent(new CustomEvent('aq:section', { detail: id })); } catch (err) { /* ignore */ }
      });
    }, { rootMargin: '0px 0px -70% 0px' });
    Array.prototype.forEach.call(links, function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) io.observe(target);
    });
  }

  /* copy affordance (the order id, a post's link): the toast text comes from data-copy-toast */
  function copyButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy]');
      if (!btn) return;
      var text = btn.getAttribute('data-copy');
      var line = btn.getAttribute('data-copy-toast') || '> order id → copied';
      var done = function () { AQ.toast(line + '   DONE'); btn.classList.add('is-copied'); window.setTimeout(function () { btn.classList.remove('is-copied'); }, 1200); };
      var failed = function () { AQ.toast('> copy → failed. Select the text and copy it by hand.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, failed);
      else failed();
    });
  }

  /* the rail's plan chip (pass 5): when a plan is chosen for checkout it shows as a kept log row above the purchase
     button on every route, Latching in the first time; it clears when the plan is removed or the order is placed */
  function railPlan() {
    var chip = document.querySelector('[data-rail-plan]');
    if (!chip) return;
    var name = chip.querySelector('[data-rail-plan-name]');
    var paint = function (animate) {
      var plan = AQ.store.get('aq_plan');
      if (!plan || !AQ.PLANS[plan]) { chip.hidden = true; return; }
      var p = AQ.PLANS[plan];
      name.textContent = p.name;
      if (chip.hidden) {
        chip.hidden = false;
        if (animate && !AQ.reducedMotion()) { chip.classList.add('is-arriving'); void chip.offsetWidth; window.requestAnimationFrame(function () { chip.classList.remove('is-arriving'); }); }
      }
    };
    paint(false);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="/checkout?plan="]');
      if (a) window.setTimeout(function () { paint(true); }, 0);
    });
    document.addEventListener('aq:plan', function () { paint(true); });
  }

  /* keyboard shortcuts and the shortcuts frame (pass 5, EXP-002 at console scale): g then a route's first letter
     navigates; ? opens the frame; Escape closes it; the frame traps focus and returns it to the opener */
  function shortcuts() {
    var frame = document.getElementById('help-frame');
    var toggles = document.querySelectorAll('[data-help-toggle]');
    var opener = null, pendingG = 0;
    var ROUTES = { h: '/', p: '/plans', s: '/sweep', a: '/about', b: '/blog', c: '/contact' };
    function isOpen() { return frame && !frame.hidden; }
    function setOpen(open, by) {
      if (!frame) return;
      frame.hidden = !open;
      document.body.classList.toggle('help-open', open);
      Array.prototype.forEach.call(toggles, function (t) { t.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      if (open) {
        opener = by || document.activeElement;
        if (typeof AQ.enterNow === 'function' && !frame.classList.contains('is-entered')) AQ.enterNow(frame, 'log');
        var first = frame.querySelector('button, a');
        if (first) first.focus();
      } else if (opener && opener.focus) { opener.focus({ preventScroll: true }); opener = null; }
    }
    AQ.helpOpen = function (by) { setOpen(true, by); };
    Array.prototype.forEach.call(toggles, function (t) { t.addEventListener('click', function () { setOpen(!isOpen(), t); }); });
    if (frame) {
      frame.addEventListener('click', function (e) { if (e.target.closest('[data-help-close]')) setOpen(false); });
      frame.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var f = frame.querySelectorAll('a[href], button:not([disabled])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'select' || tag === 'textarea' || (e.target && e.target.isContentEditable);
      if (e.key === 'Escape') { if (isOpen()) { e.preventDefault(); setOpen(false); } AQ.toastHide(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { e.preventDefault(); setOpen(!isOpen()); return; }
      if (isOpen()) return;
      var now = Date.now();
      if (e.key === 'g') { pendingG = now; return; }
      if (pendingG && now - pendingG < 1200 && ROUTES[e.key]) {
        pendingG = 0;
        var to = ROUTES[e.key];
        if (window.location.pathname === to) { window.scrollTo({ top: 0 }); return; }
        window.location.assign(to);
        return;
      }
      pendingG = 0;
    });
  }

  /* legal pages: the sections select at phone and tablet width jumps to a heading and focuses it */
  function sectionSelect() {
    var sel = document.querySelector('[data-section-select]');
    if (!sel) return;
    sel.addEventListener('change', function () {
      var target = document.getElementById(sel.value);
      if (!target) return;
      target.scrollIntoView({ block: 'start' });
      var h = target.querySelector('h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    });
    var index = document.querySelector('[data-section-index]');
    if (index) index.addEventListener('aq:section', function (e) { if (e.detail && sel.value !== e.detail) sel.value = e.detail; });
  }

  /* roving tabindex (pass 6): a [data-roving] grid is one tab stop. The first cell (or the last cell focused) carries
     tabindex 0, every other cell tabindex -1; the arrow keys move between cells on the 8 column grid, Home and End
     jump to the first and last cell. The skip link before the grid stays for readers who want past it in one key. */
  AQ.rovingGrid = function (grid) {
    if (!grid) return;
    var cells = grid.querySelectorAll('li[tabindex]');
    if (!cells.length) return;
    var active = grid.querySelector('li[tabindex="0"]');
    if (!active || grid._rovingInit !== true) active = cells[0];
    for (var i = 0; i < cells.length; i++) cells[i].setAttribute('tabindex', cells[i] === active ? '0' : '-1');
    if (grid._rovingInit) return;
    grid._rovingInit = true;
    var cols = function () {
      var first = grid.querySelector('li'), n = 0;
      if (!first) return 8;
      var top = first.getBoundingClientRect().top;
      var all = grid.querySelectorAll('li');
      for (var k = 0; k < all.length; k++) { if (Math.abs(all[k].getBoundingClientRect().top - top) < 2) n++; else break; }
      return n || 8;
    };
    grid.addEventListener('focusin', function (e) {
      var li = e.target.closest ? e.target.closest('li[tabindex]') : null;
      if (!li || li.parentNode !== grid) return;
      var all = grid.querySelectorAll('li[tabindex]');
      for (var k = 0; k < all.length; k++) all[k].setAttribute('tabindex', all[k] === li ? '0' : '-1');
    });
    grid.addEventListener('keydown', function (e) {
      var li = e.target.closest ? e.target.closest('li[tabindex]') : null;
      if (!li || li.parentNode !== grid) return;
      var all = Array.prototype.slice.call(grid.querySelectorAll('li[tabindex]'));
      var i = all.indexOf(li), c = cols(), j = -1;
      if (e.key === 'ArrowRight') j = Math.min(all.length - 1, i + 1);
      else if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
      else if (e.key === 'ArrowDown') j = Math.min(all.length - 1, i + c);
      else if (e.key === 'ArrowUp') j = Math.max(0, i - c);
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = all.length - 1;
      if (j < 0 || j === i) return;
      e.preventDefault();
      all[j].focus();
    });
  };
  function rovingGrids() {
    document.querySelectorAll('[data-roving]').forEach(function (g) { AQ.rovingGrid(g); });
  }

  /* post 01 (pass 6): a figure row's leader reaches the sentence that cites it. Hover or focus on the row lights the
     sentence's marker; Enter on the row (or a click on its leader) scrolls the sentence into view and holds the mark
     for a moment; hover or focus on the sentence lights the row's leader. */
  function citeLinks() {
    var rows = document.querySelectorAll('tr[data-cite]');
    if (!rows.length) return;
    var pair = function (row) { return document.getElementById(row.getAttribute('data-cite')); };
    var setLit = function (row, on) {
      row.classList.toggle('is-citing', on);
      var c = pair(row); if (c) c.classList.toggle('is-cited', on);
    };
    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () { setLit(row, true); });
      row.addEventListener('mouseleave', function () { setLit(row, false); });
      row.addEventListener('focus', function () { setLit(row, true); });
      row.addEventListener('blur', function () { setLit(row, false); });
      row.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        var c = pair(row); if (!c) return;
        c.scrollIntoView({ block: 'center', behavior: AQ.reducedMotion() ? 'auto' : 'smooth' });
        c.classList.add('is-cited', 'is-held');
        window.setTimeout(function () { c.classList.remove('is-held'); if (document.activeElement !== row) c.classList.remove('is-cited'); }, 2400);
      });
      var c = pair(row);
      if (c) {
        c.setAttribute('tabindex', '-1');
        c.addEventListener('mouseenter', function () { setLit(row, true); });
        c.addEventListener('mouseleave', function () { setLit(row, false); });
      }
    });
  }

  /* the kit tooltip (pass 5): every element with data-tip shows its text in a hairline frame on hover, focus and tap;
     the leading cell takes the trial's state (killed, kept, unrun) or reads as a source note */
  function kitTooltips() {
    var tip = document.getElementById('kit-tip');
    if (!tip) return;
    var current = null;
    function stateOf(el) {
      if (el.classList.contains('is-killed')) return 'killed';
      if (el.classList.contains('is-kept')) return 'kept';
      var text = el.getAttribute('data-tip') || '';
      if (/^source:/.test(text)) return 'source';
      if (/killed/.test(text)) return 'killed';
      if (/kept/.test(text) && !/killed/.test(text)) return 'kept';
      return 'unrun';
    }
    function show(el) {
      var text = el.getAttribute('data-tip');
      if (!text) return;
      current = el;
      tip.textContent = text;
      tip.setAttribute('data-state', stateOf(el));
      tip.hidden = false;
      var r = el.getBoundingClientRect();
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
      var top = r.bottom + 6;
      if (top + h > window.innerHeight - 8) top = r.top - h - 6;
      tip.style.left = Math.round(left) + 'px';
      tip.style.top = Math.round(top) + 'px';
      var id = el.id || ('tip-' + Math.random().toString(36).slice(2, 8));
      if (!el.id) el.id = id;
      tip.setAttribute('data-for', id);
      el.setAttribute('aria-describedby', 'kit-tip');
    }
    function hide(el) {
      if (el && el !== current) return;
      tip.hidden = true; tip.textContent = '';
      if (current) current.removeAttribute('aria-describedby');
      current = null;
    }
    document.addEventListener('mouseover', function (e) { var el = e.target.closest ? e.target.closest('[data-tip]') : null; if (el) show(el); });
    document.addEventListener('mouseout', function (e) { var el = e.target.closest ? e.target.closest('[data-tip]') : null; if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hide(el); });
    document.addEventListener('focusin', function (e) { var el = e.target.closest ? e.target.closest('[data-tip]') : null; if (el) show(el); });
    document.addEventListener('focusout', function (e) { var el = e.target.closest ? e.target.closest('[data-tip]') : null; if (el) hide(el); });
    document.addEventListener('click', function (e) { var el = e.target.closest ? e.target.closest('[data-tip]') : null; if (el) { if (current === el && !tip.hidden) hide(el); else show(el); } else hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    window.addEventListener('scroll', function () { if (current) hide(current); }, { passive: true });
  }

  /* library loader: cdnjs first, /vendor on error, after first paint; scenes attach in the motion pass */
  function loadScript(src, fallback, done) {
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = function () { if (done) done(true); };
    s.onerror = function () {
      if (!fallback) { if (done) done(false); return; }
      var f = document.createElement('script');
      f.src = fallback;
      f.defer = true;
      f.onload = function () { if (done) done(true); };
      f.onerror = function () { if (done) done(false); };
      document.head.appendChild(f);
    };
    document.head.appendChild(s);
  }
  AQ.loadLibs = function (done) {
    if (AQ._libs) { if (done) done(AQ._libs); return; }
    var pending = 3;
    var ok = true;
    function one(loaded) { ok = ok && loaded; pending--; if (pending === 0) { AQ._libs = { ok: ok }; if (done) done(AQ._libs); } }
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', '/vendor/three.min.js', one);
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', '/vendor/gsap.min.js', function (loaded) {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js', '/vendor/ScrollTrigger.min.js', function (l2) { one(loaded); one(l2); });
    });
  };
  function lazyLibs() {
    /* pass 4: motion.js owns the library boot (Three.js, GSAP with ScrollTrigger, Flip and CustomEase) so the
       libraries load once; AQ.loadLibs stays for any page script that needs them without the motion runtime */
    if (!document.body.hasAttribute('data-scene') || document.querySelector('script[src^="/assets/js/motion"]')) return;
    var go = function () { AQ.loadLibs(); };
    if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 2000 });
    else window.setTimeout(go, 800);
  }

  /* scrollable tables: the right edge fade signals more columns and hides at the end */
  function tableScroll() {
    var wraps = document.querySelectorAll('[data-table-scroll]');
    Array.prototype.forEach.call(wraps, function (w) {
      var paint = function () {
        var more = w.scrollWidth - w.clientWidth - w.scrollLeft > 2;
        w.classList.toggle('can-scroll', w.scrollWidth - w.clientWidth > 2);
        w.classList.toggle('is-scrolled-end', !more);
      };
      w.addEventListener('scroll', paint);
      window.addEventListener('resize', paint);
      paint();
    });
  }

  function init() {
    tableScroll();
    startClock();
    drawer();
    purchaseLinks();
    smsForms();
    validatedForms();
    expanders();
    planFocus();
    blogFilter();
    notFoundEcho();
    legalIndex();
    copyButtons();
    railPlan();
    shortcuts();
    sectionSelect();
    kitTooltips();
    rovingGrids();
    citeLinks();
    if (typeof AQ.pageInit === 'function') AQ.pageInit();
  }

  /* deferred page scripts define AQ.pageInit before DOMContentLoaded, so init waits for it */
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', function () { planFocus(); lazyLibs(); });
  window.addEventListener('hashchange', planFocus);
})();
