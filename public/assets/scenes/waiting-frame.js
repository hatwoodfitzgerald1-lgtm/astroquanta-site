/* The Waiting Frame (Contact). A single console frame drawn to a canvas texture on a plane in slight perspective,
   titled astroquanta · contact, its cursor blinking at 1Hz, a parallax of at most two degrees to the pointer; when
   the message is sent the frame's status token resolves DONE. Fixed camera, no travel. */
(function () {
  'use strict';
  var AQ = window.AQ = window.AQ || {};
  AQ.scenes = AQ.scenes || {};
  AQ.scenes['waiting-frame'] = function (slot, opts) {
    var C = AQ.core, T = C.T;
    var ctx = C.mount(slot, { fov: 36 });
    if (!ctx) return null;
    var W = 1024, H = 576;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter;
    var done = false, blink = true, clock = '04:12:00';
    function draw() {
      g.fillStyle = '#0A0C0B'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#1F2422'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3);
      g.fillStyle = '#1F2422'; g.fillRect(0, 80, W, 3);
      g.font = '34px "IBM Plex Mono", ui-monospace, monospace';
      g.fillStyle = '#7E8682'; g.fillText('astroquanta · contact', 36, 54);
      var c = document.querySelector('[data-clock]'); if (c) clock = c.textContent;
      g.textAlign = 'right'; g.fillText(clock, W - 36, 54); g.textAlign = 'left';
      g.fillStyle = '#D8DBD8'; g.font = '40px "IBM Plex Mono", ui-monospace, monospace';
      g.fillText(done ? '> message → received.' : '> waiting for a message', 36, 180);
      g.fillStyle = '#7E8682'; g.font = '34px "IBM Plex Mono", ui-monospace, monospace';
      g.fillText(done ? '  reply within one business day' : '  four fields and a message', 36, 250);
      g.fillText(done ? '  status → DONE' : '  status → waiting', 36, 320);
      if (done) { g.fillStyle = '#D8DBD8'; g.textAlign = 'right'; g.fillText('DONE', W - 36, 180); g.textAlign = 'left'; }
      else if (blink) { g.fillStyle = '#D8DBD8'; g.fillRect(36 + 23 * 24, 148, 22, 42); }
      tex.needsUpdate = true;
    }
    draw();
    var plane = new T.Mesh(new T.PlaneGeometry(4.4, 2.475), new T.MeshBasicMaterial({ map: tex }));
    ctx.scene.add(plane);
    var rim = C.hairRect(4.4, 2.475, C.HEX.g1); rim.position.z = 0.01; plane.add(rim);
        var tx = 0, ty = 0, rx = 0, ry = 0, lastSec = -1;
    var area = slot.closest('section') || slot;
    area.addEventListener('pointermove', function (e) {
      var r = slot.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2; ctx.start();
    }, { passive: true });
    area.addEventListener('pointerleave', function () { tx = 0; ty = 0; ctx.start(); });
    ctx.frame = function (dt, now) {
      var k = 1 - Math.pow(0.9, dt * 60);
      ry += (tx * 2 * Math.PI / 180 - ry) * k; rx += (-ty * 2 * Math.PI / 180 - rx) * k;
      plane.rotation.set(rx, ry, 0);
      var sec = Math.floor(now);
      if (sec !== lastSec) { lastSec = sec; blink = !blink; draw(); }
      ctx.camera.position.set(1.0, 0.4, 4.3); ctx.camera.lookAt(0, 0, 0); ctx.camera.updateMatrixWorld();
    };
    document.addEventListener('aq:formsuccess', function (e) { if (e.detail && e.detail.hasAttribute('data-validated-form')) { done = true; draw(); ctx.start(); } });
    ctx.start();
    return { ctx: ctx, setProgress: function () {}, done: function () { done = true; draw(); ctx.start(); }, dispose: ctx.dispose };
  };
})();
