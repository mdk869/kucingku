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
    if (id !== 'perubahan') leaveCl();
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
    if (id === 'perubahan') { e.preventDefault(); if (!onCl()) location.hash = 'perubahan'; else window.scrollTo(0, 0); return; }
    if (id && id !== 'top' && !document.getElementById(id)) return;
    e.preventDefault();
    goTo(id);
  });
  if (location.hash === '#top') goTo('top');

  // ---- Apa yang baharu (v1.9) ----
  // Sumber tunggal: changelog.json (sama seperti popup kemas kini dalam app). Halaman changelog ialah
  // paparan #perubahan dalam /tentang, supaya sw.js tidak perlu diubah (ubah sw.js = popup di telefon).
  var TG = { 'new': ['Baharu', 'tn'], imp: ['Lebih baik', 'ti'], fix: ['Dibaiki', 'tf'] };
  var MS = 'Jan Feb Mac Apr Mei Jun Jul Ogo Sep Okt Nov Dis'.split(' ');
  var NEWDAYS = 30, RECENT = 7, CL = null, clErr = false, clF = 'all', clOld = false;
  var laman = document.getElementById('laman'), clv = document.getElementById('perubahan-v'), T0 = document.title;
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function tag(t) { var x = TG[t] || TG['new']; return el('span', 'tg ' + x[1], x[0]); }
  function fd(d) { var p = String(d).split('-'); return (+p[2]) + ' ' + MS[(+p[1]) - 1] + ' ' + p[0]; }
  function age(d) { var t = Date.parse(d + 'T00:00:00+08:00'); return isNaN(t) ? 1e9 : (Date.now() - t) / 864e5; }
  function okEntry(e) { return e && typeof e.v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.d) && Array.isArray(e.i); }

  function fill() {
    var top = CL[0];
    $$('[data-ver]').forEach(function (x) { x.textContent = 'v' + top.v; x.hidden = false; });
    $$('[data-ver-f]').forEach(function (x) { x.textContent = ' · v' + top.v; });
    var fresh = age(top.d) <= NEWDAYS;
    $$('[data-newpill]').forEach(function (x) { x.hidden = !fresh; });
    $$('[data-newtext]').forEach(function (x) { x.textContent = 'Apa yang baharu dalam v' + top.v; });
    var wn = document.querySelector('[data-wn]'), wl = document.querySelector('[data-wnl]'), wh = document.querySelector('[data-wnh]');
    if (wn && wl) {
      wl.textContent = '';
      top.i.slice(0, 3).forEach(function (it) { var li = el('li'); li.appendChild(tag(it.t)); li.appendChild(el('span', '', it.ms)); wl.appendChild(li); });
      if (wh) wh.textContent = 'v' + top.v + ' · ' + fd(top.d);
      wn.hidden = !top.i.length;
    }
    // Lencana pada kad ciri: hanya jika versi kad itu dikeluarkan dalam 30 hari.
    $$('.f[data-v]').forEach(function (card) {
      var e = CL.filter(function (x) { return x.v === card.getAttribute('data-v'); })[0];
      var old = card.querySelector('.nb'); if (old) old.remove();
      card.classList.remove('hasnb');
      if (!e || age(e.d) > NEWDAYS) return;
      var imp = card.getAttribute('data-t') === 'imp';
      var b = el('span', 'tg nb ' + (imp ? 'ti' : 'tn'), imp ? 'Reka baharu' : 'Baharu');
      card.appendChild(b); card.classList.add('hasnb');
    });
    if (onCl()) renderCl();
  }

  function renderCl() {
    var list = document.querySelector('[data-cll]'), more = document.querySelector('[data-clmore]'), empty = document.querySelector('[data-cle]'), err = document.querySelector('[data-clerr]');
    if (!list) return;
    if (err) err.hidden = !clErr || !!CL;
    if (!CL) return;
    $$('[data-clf] button').forEach(function (b) {
      var f = b.getAttribute('data-f');
      b.setAttribute('aria-pressed', f === clF ? 'true' : 'false');
      var n = CL.reduce(function (a, e) { return a + e.i.filter(function (i) { return f === 'all' || i.t === f; }).length; }, 0);
      var sp = b.querySelector('span'); if (sp) sp.textContent = n;
    });
    list.textContent = '';
    var shown = 0;
    (clOld ? CL : CL.slice(0, RECENT)).forEach(function (e, n) {
      var items = e.i.filter(function (i) { return clF === 'all' || i.t === clF; });
      if (!items.length) return;
      shown++;
      var li = el('li'), h = el('div', 'clvh');
      h.appendChild(el('b', '', 'v' + e.v)); h.appendChild(el('span', '', fd(e.d)));
      if (n === 0) h.appendChild(el('span', 'cur', 'Terkini'));
      var ul = el('ul', 'cli');
      items.forEach(function (it) { var r = el('li'); r.appendChild(tag(it.t)); r.appendChild(el('span', '', it.ms)); ul.appendChild(r); });
      li.appendChild(h); li.appendChild(ul); list.appendChild(li);
    });
    if (empty) empty.hidden = shown > 0;
    if (more) {
      more.hidden = CL.length <= RECENT;
      more.textContent = clOld ? 'Sembunyikan versi lama' : 'Lihat versi lebih lama (v' + CL[CL.length - 1].v + ' – v' + CL[RECENT].v + ')';
    }
  }

  function onCl() { return location.hash === '#perubahan'; }
  function route() {
    if (!laman || !clv) return;
    var on = onCl();
    if (on === !clv.hidden) return;
    laman.hidden = on; clv.hidden = !on;
    document.title = on ? 'Apa yang baharu · Kucingku' : T0;
    if (on) renderCl();
    window.scrollTo(0, 0);
  }
  // Keluar dari paparan changelog bila menu lain ditekan (Ciri, Cara mula, logo...).
  function leaveCl() {
    if (!onCl() || !laman || !clv) return;
    try { history.pushState(null, '', location.pathname + location.search); } catch (e) {}
    laman.hidden = false; clv.hidden = true; document.title = T0;
  }
  addEventListener('hashchange', route);
  addEventListener('popstate', route);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-clf] button');
    if (b) { clF = b.getAttribute('data-f'); renderCl(); return; }
    if (e.target.closest && e.target.closest('[data-clmore]')) { clOld = !clOld; renderCl(); }
  });
  route();
  try {
    fetch('changelog.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (d) { if (!Array.isArray(d) || !d.length || !d.every(okEntry)) throw new Error('data'); CL = d; fill(); })
      .catch(function () { clErr = true; renderCl(); });
  } catch (e) { clErr = true; }

  var top = header;
  if (top) {
    var onScroll = function () { top.classList.toggle('sc', window.scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();
