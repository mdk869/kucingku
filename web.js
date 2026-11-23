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
  var ser = function (v) { return String(v).split('.').slice(0, 2).join('.'); };
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
    // Lencana pada kad ciri (Baharu / Lebih baik).
    $$('.f[data-v]').forEach(function (card) {
      var e = CL.filter(function (x) { return x.v === card.getAttribute('data-v'); })[0];
      var old = card.querySelector('.nb'); if (old) old.remove();
      card.classList.remove('hasnb');
      // Lencana hanya untuk kad siri versi terkini (cth. 1.10.x), hilang 30 hari selepas versi kad itu.
      if (!e || ser(e.v) !== ser(CL[0].v) || age(e.d) > NEWDAYS) return;
      var imp = card.getAttribute('data-t') === 'imp';
      var b = el('span', 'tg nb ' + (imp ? 'ti' : 'tn'), imp ? 'Lebih baik' : 'Baharu');
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
  if (laman) try {
    fetch('changelog.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (d) { if (!Array.isArray(d) || !d.length || !d.every(okEntry)) throw new Error('data'); CL = d; fill(); })
      .catch(function () { clErr = true; renderCl(); });
  } catch (e) { clErr = true; }

  // ---- Maklum balas (sama seperti dalam app: rasa, jenis, mesej, info) ----
  // Dihantar terus ke Google Form yang sama dengan app (fetch no-cors), jadi jawapan masuk ke Sheet yang sama.
  // Nilai Jenis dan Rasa mesti sama tepat dengan pilihan dalam Google Form (dan app.js FBT/FBR).
  var FB = { post: 'https://docs.google.com/forms/d/e/1FAIpQLSfK5e5iSrBBUDWH5bMCLIxYPe6dWAKIaNkdOt_UXYqnKObJyw/formResponse', jen: 'entry.987852967', rasa: 'entry.1382123140', msg: 'entry.1914040619', ver: 'entry.1022943400' };
  var FBT = [['Cadangan', 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z'], ['Masalah', 'M8 8V6a4 4 0 0 1 8 0v2M6 8h12v6a6 6 0 0 1-12 0zM3 12h3M18 12h3M4 18l3-2M20 18l-3-2M12 14v6'], ['Lain-lain', 'M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 10h8M8 13h5']];
  var FBR = [['😕', 'Kurang'], ['😐', 'Biasa'], ['🙂', 'Bagus'], ['😍', 'Suka!']];
  var FBGAP = 30000, FBK = 'kucingku-web-fb-v1', fbBox = null, fbLast = null;
  function fbInfo() {
    var ua = navigator.userAgent || '', br = /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Pelayar lain';
    var dev = /iPhone|iPod/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux|CrOS/.test(ua) ? 'Linux' : 'Peranti lain';
    return ['Website Kucingku', location.pathname.replace(/\.html$/, '') || '/', dev, br].join(' · ');
  }
  function fbGet() { try { return JSON.parse(localStorage.getItem(FBK) || '{}') || {}; } catch (e) { return {}; } }
  function fbSet(o) { try { localStorage.setItem(FBK, JSON.stringify(o)); } catch (e) {} }
  function svg(d) { var n = 'http://www.w3.org/2000/svg', s = document.createElementNS(n, 'svg'), p = document.createElementNS(n, 'path'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); p.setAttribute('d', d); s.appendChild(p); return s; }
  function radio(name, value, checked, kids, cls) {
    var l = el('label', cls), i = el('input'), sp = el('span');
    i.type = 'radio'; i.name = name; i.value = value; i.checked = !!checked;
    kids.forEach(function (k) { sp.appendChild(k); });
    l.appendChild(i); l.appendChild(sp); return l;
  }
  function fbBuild() {
    var d = fbGet();
    var box = el('div', 'fbm'); box.hidden = true;
    var card = el('div', 'fbp'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'fbm-h');
    var x = el('button', 'fbclose'); x.type = 'button'; x.setAttribute('aria-label', 'Tutup'); x.textContent = '×'; x.setAttribute('data-fbclose', '');
    var form = el('form', 'fbf'); form.noValidate = true;
    var h = el('h2', '', 'Maklum balas'); h.id = 'fbm-h';
    form.appendChild(h);
    form.appendChild(el('p', 'mute fbsub', 'Ceritakan apa yang boleh dibaiki atau ditambah. Setiap cadangan dibaca oleh pembangun.'));
    form.appendChild(el('div', 'fblb', 'Setakat ini, Kucingku...'));
    var rr = el('div', 'fbr'); rr.setAttribute('role', 'radiogroup'); rr.setAttribute('aria-label', 'Setakat ini, Kucingku');
    FBR.forEach(function (r) { var i = el('i', '', r[0]); i.setAttribute('aria-hidden', 'true'); rr.appendChild(radio('r', r[1], d.r === r[1], [i, document.createTextNode(r[1])])); });
    form.appendChild(rr);
    form.appendChild(el('div', 'fblb', 'Jenis'));
    var kk = el('div', 'fbc'); kk.setAttribute('role', 'radiogroup'); kk.setAttribute('aria-label', 'Jenis');
    FBT.forEach(function (t, n) { kk.appendChild(radio('k', t[0], d.k ? d.k === t[0] : n === 0, [svg(t[1]), document.createTextNode(t[0])])); });
    form.appendChild(kk);
    var ta = el('textarea', 'fbt'); ta.name = 'm'; ta.rows = 4; ta.maxLength = 2000; ta.setAttribute('aria-label', 'Mesej'); ta.placeholder = 'Tulis di sini. Contoh: Saya nak boleh rekod ubat kutu juga.'; ta.value = d.m || '';
    form.appendChild(ta);
    var lx = el('label', 'fbx'), lt = el('span'), cb = el('input'), sw = el('i');
    lt.appendChild(el('b', '', 'Sertakan info pelayar')); lt.appendChild(el('small', '', fbInfo() + '. Tiada data kucing dihantar.'));
    cb.type = 'checkbox'; cb.name = 'inf'; cb.checked = d.inf !== false; sw.setAttribute('aria-hidden', 'true');
    lx.appendChild(lt); lx.appendChild(cb); lx.appendChild(sw); form.appendChild(lx);
    var msg = el('p', 'fberr'); msg.setAttribute('role', 'alert'); msg.hidden = true; form.appendChild(msg);
    var send = el('button', 'btn fbsend', 'Hantar'); send.type = 'submit'; form.appendChild(send);
    form.appendChild(el('p', 'mute fbnote', 'Tiada akaun diperlukan.'));
    var done = el('div', 'fbdone'); done.hidden = true;
    var di = el('i'); di.setAttribute('aria-hidden', 'true'); di.appendChild(svg('M12 21s-7-4.4-9.3-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.3 12C19 16.6 12 21 12 21Z'));
    done.appendChild(di); done.appendChild(el('h2', '', 'Terima kasih!'));
    done.appendChild(el('p', 'mute', 'Maklum balas anda dah sampai kepada pembangun. Setiap cadangan dibaca dan dipertimbangkan untuk kemas kini akan datang.'));
    var dc = el('button', 'btn g', 'Tutup'); dc.type = 'button'; dc.setAttribute('data-fbclose', ''); done.appendChild(dc);
    card.appendChild(x); card.appendChild(form); card.appendChild(done); box.appendChild(card);
    document.body.appendChild(box);
    function save() { var f = form.elements, r = form.querySelector('input[name="r"]:checked'), k = form.querySelector('input[name="k"]:checked'); var o = fbGet(); o.r = r ? r.value : ''; o.k = k ? k.value : ''; o.m = f.m.value; o.inf = f.inf.checked; fbSet(o); }
    form.addEventListener('input', save); form.addEventListener('change', save);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); save();
      var o = fbGet(), m = (o.m || '').trim();
      var err = function (t) { msg.textContent = t; msg.hidden = false; };
      msg.hidden = true;
      if (m.length < 3) { ta.focus(); return err('Tulis sedikit lagi sebelum menghantar.'); }
      if (Date.now() - (o.t || 0) < FBGAP) return err('Tunggu sebentar sebelum menghantar lagi.');
      if (navigator.onLine === false || typeof fetch !== 'function') return err('Tiada internet buat masa ini. Mesej anda disimpan di sini; cuba hantar semula bila talian ada.');
      var body = [[FB.jen, o.k || FBT[0][0]], [FB.rasa, o.r], [FB.msg, m], [FB.ver, o.inf !== false ? fbInfo() : '']]
        .filter(function (p) { return p[1]; }).map(function (p) { return p[0] + '=' + encodeURIComponent(p[1]); }).join('&');
      send.disabled = true; send.textContent = 'Menghantar...';
      fetch(FB.post, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function () {
          var n = fbGet(); n.t = Date.now(); n.m = ''; n.r = ''; fbSet(n);
          ta.value = ''; Array.prototype.forEach.call(form.querySelectorAll('input[name="r"]'), function (i) { i.checked = false; });
          form.hidden = true; done.hidden = false; dc.focus();
        }, function () { err('Tak dapat dihantar. Semak internet dan cuba lagi.'); })
        .then(function () { send.disabled = false; send.textContent = 'Hantar'; });
    });
    box.addEventListener('click', function (e) { if (e.target === box || (e.target.closest && e.target.closest('[data-fbclose]'))) fbClose(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); fbClose(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(card.querySelectorAll('button,input,textarea'), function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    box._form = form; box._done = done; box._ta = ta; box._err = msg;
    return box;
  }
  function fbOpen(kind) {
    if (!fbBox) fbBox = fbBuild();
    fbLast = document.activeElement;
    fbBox._form.hidden = false; fbBox._done.hidden = true; fbBox._err.hidden = true;
    if (kind) { var k = fbBox._form.querySelector('input[name="k"][value="' + kind + '"]'); if (k) k.checked = true; }
    fbBox.hidden = false; document.documentElement.classList.add('fbon');
    var first = fbBox._form.querySelector('input[name="r"]:checked') || fbBox._form.querySelector('input[name="r"]');
    setTimeout(function () { (first || fbBox._ta).focus(); }, 30);
  }
  function fbClose() {
    if (!fbBox || fbBox.hidden) return;
    fbBox.hidden = true; document.documentElement.classList.remove('fbon');
    if (fbLast && fbLast.focus) try { fbLast.focus(); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-fb]');
    if (!b) return;
    e.preventDefault(); fbOpen(b.getAttribute('data-fb') || '');
  });
  if (location.hash === '#maklum-balas') fbOpen('');

  var top = header;
  if (top) {
    var onScroll = function () { top.classList.toggle('sc', window.scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();
