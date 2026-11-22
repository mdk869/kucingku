// Halaman "Hai, saya ..." untuk QR pada loket kucing (Kucingku v1.10).
// Butiran datang dari bahagian # pada link (tidak dihantar ke server). Format: nama~pemilik~telefon~J|B~warna~ciri~corak~microchip
(function () {
  const $ = document.getElementById('j');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dec = s => { try { return decodeURIComponent(s || '').trim().slice(0, 60); } catch (e) { return ''; } };
  const f = (location.hash || '').slice(1).split('~').map(dec);
  const [name, own, tel, sx, col, ciri, corak, chip] = f;
  if (!name || !/^\d{10,15}$/.test(tel || '')) {
    $.innerHTML = '<p class="bad">Kod QR ini tidak lengkap.<br><small>This QR code is incomplete.</small></p>';
    return;
  }
  document.title = 'Hai, saya ' + name + ' · Kucingku';
  const local = tel.startsWith('60') ? '0' + tel.slice(2) : '+' + tel;
  const show = /^0\d{9,10}$/.test(local) ? local.slice(0, 3) + '-' + (local.length === 11 ? local.slice(3, 7) + ' ' + local.slice(7) : local.slice(3, 6) + ' ' + local.slice(6)) : local;
  const sex = sx === 'J' ? 'Jantan' : sx === 'B' ? 'Betina' : '';
  const color = /^[0-9a-f]{6}$/i.test(col || '') ? '#' + col : '#E27C97';
  const msg = loc => 'Assalamualaikum. Saya jumpa kucing anda, ' + name + ' (imbas QR pada kolar).' + (loc ? '\n\nLokasi saya jumpa: ' + loc : '');
  const wa = loc => 'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg(loc));
  const row = (k, v) => v ? `<div><span>${k}</span><b>${esc(v)}</b></div>` : '';
  const WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.2-.8-2.7-1.1-4.4-3.9-4.5-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.7-.1 1.3z"/></svg>';
  const PH = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#B8456A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
  const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#2F6B47" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  $.innerHTML = `<div class="av" style="background:${color}">${esc(name.charAt(0).toUpperCase())}</div>
<h1>Hai, saya ${esc(name)}</h1><p class="sub">Saya mungkin sesat. Tolong beritahu tuan saya ya.</p><p class="en">Hi, I'm ${esc(name)}. I may be lost, please tell my owner.</p>
<div class="card">${row('Tuan', own)}${row(corak ? 'Jantina · warna' : 'Jantina', [sex, corak].filter(Boolean).join(' · '))}${row('Ciri', ciri)}${row('Microchip', chip)}</div>
<a class="b wa" href="${wa('')}" rel="noopener">${WA}WhatsApp ${esc(own || 'tuan saya')}</a>
<a class="b ph" href="tel:+${tel}">${PH}Panggil ${esc(show)}</a>
<button class="b lo" id="lo" type="button">${PIN}<span>Hantar lokasi saya jumpa ${esc(name)}</span></button>
<div class="tip">Beri air dan tunggu di tempat selamat. Jangan kejar.</div>
<p class="ft"><a href="/tentang">Dibuat dengan Kucingku</a></p>`;
  const lo = document.getElementById('lo');
  lo.addEventListener('click', () => {
    if (!navigator.geolocation) { location.href = wa(''); return; }
    lo.querySelector('span').textContent = 'Mencari lokasi…';
    navigator.geolocation.getCurrentPosition(
      p => { location.href = wa('https://maps.google.com/?q=' + p.coords.latitude.toFixed(5) + ',' + p.coords.longitude.toFixed(5)); },
      () => { location.href = wa(''); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
})();
