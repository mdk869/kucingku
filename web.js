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

  // Link dalam halaman (#...) dikawal sendiri supaya sama di semua pelayar: header sticky tidak
  // menutup tajuk, logo sentiasa kembali ke paling atas, dan "Dapatkan app" tunjuk kad QR tanpa memotong hero.
  var header = document.querySelector('.top');
  var smooth = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function goTo(id) {
    var y = 0, el = id && id !== 'top' ? document.getElementById(id) : null;
    if (el && id === 'dapatkan') {
      var r = el.getBoundingClientRect(), bottom = r.bottom + window.scrollY + 24;
      y = Math.max(0, bottom - window.innerHeight);
      el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    } else if (el) {
      y = el.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 12;
    }
    window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: smooth ? 'smooth' : 'auto' });
    try { history.replaceState(null, '', location.pathname + location.search + (el && id !== 'dapatkan' ? '#' + id : '')); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = a.getAttribute('href').slice(1);
    if (id && id !== 'top' && !document.getElementById(id)) return;
    e.preventDefault();
    goTo(id);
  });
  if (location.hash === '#top') goTo('top');

  var top = header;
  if (top) {
    var onScroll = function () { top.classList.toggle('sc', window.scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();
