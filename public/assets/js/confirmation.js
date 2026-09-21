/* Order confirmation: renders the order the checkout wrote (localStorage with the in memory fallback).
   Nothing is invented: with no stored order the frame reads "order → none recorded on this device". */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  var $ = function (id) { return document.getElementById(id); };

  AQ.pageInit = function () {
    var rows = $('order-rows');
    if (!rows) return;
    var order = AQ.store.get('aq_order');
    var mk = function (label, detail, done) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="glyph" aria-hidden="true">&gt;</span><span class="label">' + label + '</span><span class="arrow" aria-hidden="true">→</span><span class="detail">' + detail + '</span>' +
        (done ? '<span class="status" aria-label="Done">DONE</span>' : '<span class="status"></span>');
      return li;
    };
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    rows.innerHTML = '';
    if (!order) {
      rows.appendChild(mk('order', 'none recorded on this device', false));
      $('order-lead').textContent = 'Nothing recorded.';
      $('order-none').hidden = false;
      $('order-foot').hidden = true;
      return;
    }
    var placed = new Date(order.placedAt);
    var next = new Date(order.nextBilling);
    $('order-lead').textContent = 'Recorded ' + AQ.formatDateTime(placed) + '. Nothing else was charged.';
    rows.appendChild(mk('order id', '<span class="order-id">' + esc(order.id) + '</span> <button type="button" class="linkbtn copy-link" data-copy="' + esc(order.id) + '" data-copy-toast="&gt; order id → copied" aria-label="Copy the order id ' + esc(order.id) + '">copy</button>', true));
    rows.appendChild(mk('plan', esc(order.planName) + ', ' + esc(order.seatWord) + ', billed monthly', true));
    rows.appendChild(mk('charged today', AQ.money(order.amount, true), true));
    rows.appendChild(mk('next billing', AQ.formatDate(next), true));
    rows.appendChild(mk('workspace', 'invite sent to ' + esc(order.email), true));
    $('order-none').hidden = true;

    if (order.smsConsent) {
      var form = document.querySelector('#sms-block form');
      if (form) {
        var p = document.createElement('p');
        p.className = 'form-success';
        p.setAttribute('role', 'status');
        p.innerHTML = '&gt; sms → account notifications on for ' + esc(order.phone) + '. Reply STOP at any time to cancel.   <span class="status" aria-label="Done">DONE</span>';
        form.replaceWith(p);
      }
    }
  };
})();
