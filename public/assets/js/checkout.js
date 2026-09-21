/* Checkout: plan state, the order summary, inline validation as log lines, Luhn and expiry checks,
   and the hand off to /checkout/confirmed. No real charge is made from this page. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  var $ = function (id) { return document.getElementById(id); };

  function luhn(digits) {
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var d = parseInt(digits.charAt(i), 10);
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    return digits.length > 0 && sum % 10 === 0;
  }
  function isAmex(digits) { return /^3[47]/.test(digits); }
  function groupCard(digits) {
    if (isAmex(digits)) return digits.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*$/, function (m, a, b, c) { return [a, b, c].filter(Boolean).join(' '); });
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  function planFromUrl() {
    var m = window.location.search.match(/[?&]plan=(desk|research)/);
    return m ? m[1] : null;
  }

  function renderSummary(plan) {
    var rows = $('order-rows');
    var foot = $('order-foot');
    var btn = $('purchase-btn');
    var beneath = $('purchase-beneath');
    var actions = $('order-actions');
    var empty = $('order-empty');
    var collapsed = $('order-collapsed-detail');
    rows.innerHTML = '';
    var mk = function (label, detail) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="glyph" aria-hidden="true">&gt;</span><span class="label">' + label + '</span><span class="arrow" aria-hidden="true">→</span><span class="detail">' + detail + '</span><span class="status"></span>';
      return li;
    };
    if (!plan) {
      rows.appendChild(mk('plan', 'no plan selected'));
      foot.textContent = 'Choose Desk or Research on the Plans page. Nothing here is saved until you do.';
      empty.hidden = false;
      actions.hidden = true;
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.textContent = 'Complete Purchase';
      beneath.textContent = 'Select a plan to continue.';
      if (collapsed) collapsed.textContent = 'no plan selected';
      try { document.dispatchEvent(new CustomEvent('aq:plan')); } catch (err) { /* ignore */ }
      return;
    }
    var p = AQ.PLANS[plan];
    var next = AQ.nextBilling(new Date());
    rows.appendChild(mk('plan', p.name + ', ' + p.seatWord + ', billed monthly'));
    rows.appendChild(mk('price', AQ.money(p.price) + ' a month'));
    rows.appendChild(mk('per seat', AQ.money(p.perSeat) + ' per seat'));
    rows.appendChild(mk('subtotal', AQ.money(p.price, true)));
    rows.appendChild(mk('tax', 'calculated on invoice'));
    rows.appendChild(mk('total due today', AQ.money(p.price, true)));
    rows.appendChild(mk('next billing', AQ.formatDate(next)));
    foot.textContent = 'Billed monthly on this date. Cancel before the next billing date and you keep access to the end of the period.';
    empty.hidden = true;
    actions.hidden = false;
    btn.disabled = false;
    btn.removeAttribute('aria-disabled');
    btn.textContent = 'Complete Purchase: ' + AQ.money(p.price) + ' today';
    beneath.textContent = 'You will land on a confirmation page with your order id. A workspace invite follows by email.';
    /* the collapsed row at phone and tablet width keeps the plan, the price and the next billing date in view */
    if (collapsed) collapsed.textContent = p.name + ', ' + p.seatWord + ' · ' + AQ.money(p.price) + ' a month · next billing ' + AQ.formatDate(next);
  }

  /* the summary's collapsed row (under 1024px): expands the order frame; the purchase button docks to the viewport's
     bottom once section 03 has been in view (the class gates the sticky rule in site.css) */
  function mobileSummary(form) {
    var toggle = $('order-collapsed'), aside = form.querySelector('.checkout-summary');
    if (toggle && aside) {
      aside.classList.add('is-collapsed');
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        toggle.querySelector('.order-collapsed__toggle').textContent = open ? 'expand' : 'collapse';
        aside.classList.toggle('is-collapsed', open);
      });
    }
    var s3 = form.querySelector('[aria-labelledby="s3-heading"]');
    if (s3 && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { form.classList.add('is-s3-seen'); io.disconnect(); } });
      }, { threshold: 0.2 });
      io.observe(s3);
    }
  }

  AQ.pageInit = function () {
    var form = $('checkout-form');
    if (!form) return;
    var plan = planFromUrl();
    if (plan) AQ.store.set('aq_plan', plan);
    else plan = AQ.store.get('aq_plan');
    if (!plan) {
      window.location.replace('/plans');
      renderSummary(null);
      return;
    }
    renderSummary(plan);
    mobileSummary(form);

    $('remove-plan').addEventListener('click', function (e) {
      e.preventDefault();
      AQ.store.remove('aq_plan');
      plan = null;
      renderSummary(null);
      try { window.history.replaceState(null, '', '/checkout'); } catch (err) { /* ignore */ }
    });

    /* expiry selects */
    var mSel = $('exp-month'), ySel = $('exp-year');
    var now = new Date();
    for (var m = 1; m <= 12; m++) { var o = document.createElement('option'); o.value = String(m).padStart(2, '0'); o.textContent = o.value; mSel.appendChild(o); }
    for (var y = now.getFullYear(); y <= now.getFullYear() + 15; y++) { var oy = document.createElement('option'); oy.value = String(y); oy.textContent = String(y); ySel.appendChild(oy); }

    /* card number grouping */
    var card = $('card-number');
    card.addEventListener('input', function () {
      var digits = card.value.replace(/\D/g, '').slice(0, 16);
      card.value = groupCard(digits);
      var brand = $('card-brand');
      var b = '';
      if (/^4/.test(digits)) b = 'Visa';
      else if (/^(5[1-5]|2[2-7])/.test(digits)) b = 'Mastercard';
      else if (isAmex(digits)) b = 'Amex';
      else if (/^6(011|5)/.test(digits)) b = 'Discover';
      if (brand) brand.textContent = b;
      Array.prototype.forEach.call(document.querySelectorAll('.badge[data-brand]'), function (badge) { badge.classList.toggle('is-detected', !!b && badge.getAttribute('data-brand') === b); });
    });

    /* validation */
    var fields = [
      { id: 'first-name', label: 'first name', check: function (v) { return v ? '' : 'required'; } },
      { id: 'last-name', label: 'last name', check: function (v) { return v ? '' : 'required'; } },
      { id: 'email', label: 'work email', check: function (v) { return AQ.validEmail(v) ? '' : 'enter a work email address'; } },
      { id: 'phone', label: 'phone number', check: function (v) { return AQ.validPhone(v) ? '' : 'enter a phone number with area code'; } },
      { id: 'address1', label: 'address line 1', check: function (v) { return v ? '' : 'required'; } },
      { id: 'city', label: 'city', check: function (v) { return v ? '' : 'required'; } },
      { id: 'state', label: 'state or province', check: function (v) { return v ? '' : 'required'; } },
      { id: 'postal', label: 'ZIP or postal code', check: function (v) { return (v.length >= 3 && v.length <= 10) ? '' : 'required'; } },
      { id: 'country', label: 'country', check: function (v) { return v ? '' : 'select a country'; } },
      { id: 'card-name', label: 'name on card', check: function (v) { return v ? '' : 'required'; } },
      { id: 'card-number', label: 'card number', check: function (v) {
        var d = v.replace(/\D/g, '');
        if (!(d.length === 15 || d.length === 16)) return '15 or 16 digits required';
        if (!luhn(d)) return 'this number does not check out. Enter it again.';
        return '';
      } },
      { id: 'exp-month', label: 'expiry', check: function (v) {
        var yv = ySel.value;
        if (!v || !yv) return 'this card has expired';
        var exp = new Date(parseInt(yv, 10), parseInt(v, 10), 0, 23, 59, 59);
        return exp >= new Date() ? '' : 'this card has expired';
      } },
      { id: 'exp-year', label: 'expiry', check: function (v) { return v ? '' : 'this card has expired'; } },
      { id: 'cvv', label: 'CVV', check: function (v) {
        var d = card.value.replace(/\D/g, '');
        var want = isAmex(d) ? 4 : null;
        if (!/^\d{3,4}$/.test(v)) return '3 or 4 digits required';
        if (want && v.length !== want) return '3 or 4 digits required';
        return '';
      } }
    ];
    function validateField(f, showOk) {
      var el = $(f.id);
      var msg = f.check(el.value.trim());
      AQ.setError(el, msg ? '> ' + f.label + ' → ' + msg : '');
      if (!msg && !showOk) { var ok = el.closest('.field') && el.closest('.field').querySelector('.ok'); if (ok) ok.textContent = 'OK'; }
      return !msg;
    }
    fields.forEach(function (f) {
      var el = $(f.id);
      el.addEventListener('blur', function () { if (el.value.trim()) validateField(f); });
    });

    var progress = $('section-progress');
    function sectionsComplete() {
      var groups = [['first-name', 'last-name', 'email', 'phone'], ['address1', 'city', 'state', 'postal', 'country'], ['card-name', 'card-number', 'exp-month', 'exp-year', 'cvv']];
      var n = 0, list = [];
      groups.forEach(function (g) {
        var ok = g.every(function (id) { var f = fields.filter(function (x) { return x.id === id; })[0]; return !f.check($(id).value.trim()); });
        list.push(ok);
        if (ok) n++;
      });
      var boxes = $('accept-terms').checked && $('accept-auth').checked;
      list.push(boxes);
      if (boxes) n++;
      if (progress) progress.textContent = 'Section ' + n + ' of 4 complete.';
      /* the Candidate Cell scene draws one edge per completed section and fills when all four are done */
      AQ.candidateSections = { list: list, complete: n === 4 };
      if (AQ.scene && AQ.scene.setSections) AQ.scene.setSections(list, n === 4);
    }
    form.addEventListener('change', sectionsComplete);
    form.addEventListener('input', sectionsComplete);
    sectionsComplete();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!plan) { renderSummary(null); return; }
      var bad = 0;
      fields.forEach(function (f) { if (!validateField(f)) bad++; });
      var terms = $('accept-terms'), auth = $('accept-auth');
      if (!terms.checked) { AQ.setError(terms, '> terms → accept the Terms & Privacy Policy to continue'); bad++; } else { AQ.setError(terms, ''); }
      if (!auth.checked) { AQ.setError(auth, '> authorisation → confirm you are purchasing on behalf of a business'); bad++; } else { AQ.setError(auth, ''); }
      var formError = $('order-error');
      if (bad) {
        formError.textContent = '> order → ' + bad + ' fields need attention. They are marked above.';
        var first = form.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }
      formError.textContent = '';
      var p = AQ.PLANS[plan];
      var placed = new Date();
      var id = 'AQ' + String(Math.floor(10000000 + Math.random() * 90000000));
      var order = {
        id: id,
        plan: p.key,
        planName: p.name,
        seats: p.seats,
        seatWord: p.seatWord,
        amount: p.price,
        nextBilling: AQ.nextBilling(placed).toISOString(),
        placedAt: placed.toISOString(),
        email: $('email').value.trim(),
        phone: $('phone').value.trim(),
        smsConsent: $('accept-sms').checked
      };
      AQ.store.set('aq_order', order);
      AQ.store.remove('aq_plan');
      try { document.dispatchEvent(new CustomEvent('aq:plan')); } catch (err) { /* ignore */ }
      var btn = $('purchase-btn');
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
      window.location.assign('/checkout/confirmed');
    });
  };
})();
