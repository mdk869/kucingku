// Skrip website rasmi Kucingku (tentang.html). Tiada data dihantar ke mana-mana.
(function () {
  'use strict';
  var LINK = 'https://kucingku-bay.vercel.app/?utm_source=web';
  // Sama seperti pengesanan telefon dalam app.js. Mesti sepadan: kalau tidak, butang "Buka app"
  // akan membawa tablet/desktop ke app, yang menghantarnya semula ke sini.
  var MOB = /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(navigator.userAgent) ||
    (window.matchMedia && matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 600);
  if (MOB) document.documentElement.classList.add('mob');

  var toastEl = document.querySelector('.toast'), timer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }

  function copyFallback() {
    var t = document.createElement('textarea');
    t.value = LINK; t.setAttribute('readonly', ''); t.className = 'sr';
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    return ok;
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]');
    if (!b) return;
    var done = function () { toast('Link disalin. Tampal di telefon anda.'); };
    var fail = function () { toast(copyFallback() ? 'Link disalin. Tampal di telefon anda.' : LINK); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(LINK).then(done, fail);
    else fail();
  });

  var top = document.querySelector('.top');
  if (top) {
    var onScroll = function () { top.classList.toggle('sc', window.scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();
