const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, seed } = require('./helpers.cjs');

// Real-world user agents for the browsers people open shared links in.
const UA = {
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  fbAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.39.108;]',
  webviewAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36',
  tiktokIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_36.5.0 JsSdk/2.0 NetType/WIFI',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};
const browser = q => q.includes('pointer:coarse'); // phone in a normal browser tab, not installed
const installed = q => q.includes('pointer:coarse') || q.includes('standalone');
const location = { origin: 'https://kucingku-bay.vercel.app', host: 'kucingku-bay.vercel.app', pathname: '/', search: '?utm_source=facebook' };
const empty = { cats: [], recs: [], vets: [], bk: 0 };
const open = (ua, opts = {}) => app({ ua, media: browser, extra: { location }, ...opts });
const html = (a, sel = '#app') => a.elements.get(sel).innerHTML;

test('installed app (home screen or Play Store) shows no install prompts', () => {
  for (const a of [app({ ua: UA.androidChrome, media: installed }), app({ ua: UA.iosSafari, media: () => false, standalone: true, extra: { screen: { width: 390, height: 844 } } })]) {
    assert.equal(a.run('ENV.sa'), true);
    assert.doesNotMatch(html(a), /Pasang Kucingku di skrin utama|class="gate/);
    a.run("go('more')");
    assert.doesNotMatch(html(a), /data-action="ixGo"/);
  }
});

test('phone browser tab shows the install card on Home and a Pasang app row in Lagi', () => {
  const a = open(UA.androidChrome);
  assert.deepEqual(a.json('ENV'), { ios: false, and: true, sa: false, iab: false, app: '', br: 'chrome' });
  assert.match(html(a), /class="ix".*Pasang Kucingku di skrin utama.*data-action="ixGo".*data-action="ixLater"/s);
  a.run("go('more')");
  assert.match(html(a), /data-action="ixGo".*Pasang app/s);
  // New users with no cats still see the card under the welcome hero.
  assert.match(html(open(UA.iosSafari, { data: empty })), /Selamat datang!.*class="ix"/s);
});

test('Android without the browser install event falls back to illustrated menu steps', () => {
  const a = open(UA.androidChrome);
  a.run('ixGo()');
  const sh = html(a, '#sh');
  assert.equal(a.elements.get('#sh').hidden, false);
  assert.match(sh, /Android · 3 langkah mudah/);
  assert.match(sh, /Tekan menu ⋮.*Pilih Pasang app.*Tekan Pasang/s);
  assert.equal((sh.match(/class="il"/g) || []).length, 3);
  assert.doesNotMatch(sh, /Sudah ada data di sini/);
  const s2 = open(UA.samsung); s2.run('ixGo()');
  assert.match(html(s2, '#sh'), /Samsung Internet, menu ≡/);
});

test('Android with the browser install event installs in one tap', async () => {
  const a = open(UA.androidChrome);
  a.run("globalThis.prompted=0;bip={prompt(){prompted++},userChoice:Promise.resolve({outcome:'accepted'})}");
  a.run('ixGo()');
  assert.equal(a.run('prompted'), 1);
  assert.equal(a.run("$('#sh').hidden"), true, 'no manual steps when the native prompt is available');
  await new Promise(r => setImmediate(r));
  assert.equal(a.run('ixDone'), true);
  assert.doesNotMatch(html(a), /class="ix"/);
});

test('dismissed install prompt keeps the button available and returns after 7 days', () => {
  const a = open(UA.androidChrome);
  a.run("bip={prompt(){},userChoice:Promise.resolve({outcome:'dismissed'})};ixGo()");
  assert.equal(a.run('ixDone'), false);
  const before = a.storage();
  a.run('ixLaterSet()');
  assert.doesNotMatch(html(a), /class="ix"/);
  assert.equal(a.storage(), before, 'cat data is untouched');
  a.run("go('more')");
  assert.match(html(a), /data-action="ixGo"/, 'Lagi still offers installing');
  a.run("localStorage.setItem(IK+'-later',String(Date.now()-8*864e5));go('home')");
  assert.match(html(a), /class="ix"/);
});

test('iPhone Safari shows Share → Add to Home Screen steps and warns that the installed app starts empty', () => {
  const a = open(UA.iosSafari);
  assert.equal(a.run('ENV.br'), 'safari');
  a.run('ixGo()');
  const sh = html(a, '#sh');
  assert.match(sh, /iPhone · 3 langkah mudah/);
  assert.match(sh, /Tekan butang Kongsi.*di bar bawah skrin.*Pilih Tambah ke Skrin Utama.*Tekan Tambah/s);
  assert.match(sh, /Sudah ada data di sini\?.*data-action="ixData"/s);
  a.run("clickActions.ixData()");
  assert.equal(a.run('view+ssub'), 'setdata');
  const b = open(UA.iosSafari, { data: empty }); b.run('ixGo()');
  assert.doesNotMatch(html(b, '#sh'), /Sudah ada data/);
  const c = open(UA.iosChrome); c.run('ixGo()');
  assert.match(html(c, '#sh'), /Di Chrome, ikon Kongsi ada di hujung kanan bar alamat/);
});

test('Facebook in-app browser on Android gets a one-tap Open in Chrome link instead of the app', () => {
  const a = open(UA.fbAndroid);
  assert.deepEqual(a.json('[ENV.iab,ENV.app]'), [true, 'Facebook']);
  const h = html(a);
  assert.match(h, /class="gate iab".*Buka dalam Chrome.*Kucingku sedang dibuka dalam <b>Facebook<\/b>/s);
  assert.ok(h.includes('href="intent://kucingku-bay.vercel.app/?utm_source=facebook#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fkucingku-bay.vercel.app%2F%3Futm_source%3Dfacebook;end"'));
  assert.match(h, /id="ixu" class="ixu" readonly value="https:\/\/kucingku-bay.vercel.app\/\?utm_source=facebook"/);
  assert.equal(html(a, '#nav'), '');
  a.run('iabStay()');
  assert.match(html(a), /class="hero"/);
  assert.doesNotMatch(html(a), /class="ix"/, 'cannot install from an in-app browser');
  assert.match(html(open(UA.webviewAndroid)), /dibuka dalam <b>aplikasi ini<\/b>/);
});

test('TikTok in-app browser on iPhone explains how to open in Safari', () => {
  const a = open(UA.tiktokIos);
  const h = html(a);
  assert.match(h, /Buka dalam Safari.*<b>TikTok<\/b>.*Tekan menu ⋯.*Pilih Buka dalam pelayar luar.*tampal dalam Safari/s);
  assert.doesNotMatch(h, /intent:\/\//);
  a.run('ixCopy()');
  assert.deepEqual(a.json('messages'), ['Tekan lama pada pautan untuk salin']);
});

test('desktop gate shows a QR code to open the app on a phone', () => {
  const a = app({ ua: UA.desktop, media: () => false, extra: { screen: { width: 1920, height: 1080 } } });
  assert.match(html(a), /Kucingku untuk telefon sahaja.*<img class="qr" src="icons\/qr.svg"/s);
});

test('install helper is fully translated to English', () => {
  const MALAY = /\b(tekan|pilih|pasang|tambah|kongsi|salin|pautan|skrin|utama|dalam|pelayar|langkah|mudah|sudah|data di|ikon|buka|teruskan|imbas|kamera|telefon|sahaja|nanti|sekarang|aplikasi|dibuka|hilang|tidak|berjaya|tampal|bucu|kanan|atas|bawah|leret|senarai|batal|tetapan|baharu|faham)\b/i;
  const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const segs = h => [...new Set([...(h.match(/(?:aria-label|alt)="[^"]*"/g) || []).map(m => decode(m.replace(/^[a-z-]+="|"$/g, ''))), ...h.split(/<[^>]*>/).map(x => decode(x).trim()).filter(Boolean)])];
  const check = (a, h) => {
    // Allowed: the "In Bahasa Melayu: …" hints deliberately quote the Malay menu labels.
    const left = a.json(`${JSON.stringify(segs(h))}.map(trs)`).filter(x => MALAY.test(x) && !/In Bahasa Melayu/.test(x));
    assert.deepEqual(left, []);
  };
  const st = { v: 1, lang: 'en', bk: 30, unit: 'auto' };
  for (const ua of [UA.androidChrome, UA.iosSafari, UA.samsung, UA.iosChrome]) { const a = open(ua, { settings: st }); check(a, html(a)); a.run('ixGo()'); check(a, html(a, '#sh')); a.run("go('more')"); check(a, html(a)); }
  for (const ua of [UA.fbAndroid, UA.tiktokIos, UA.webviewAndroid]) { const a = open(ua, { settings: st }); check(a, html(a)); }
  const d = app({ ua: UA.desktop, media: () => false, settings: st, extra: { screen: { width: 1920, height: 1080 } } }); check(d, html(d));
  const s = open(UA.iosSafari, { settings: st }); s.run('ixGo()');
  assert.deepEqual(s.json('["Tambah ke Skrin Utama","iPhone · 3 langkah mudah","Kucingku sedang dibuka dalam"].map(trs)'), ['Add to Home Screen', 'iPhone · 3 easy steps', 'Kucingku is open inside']);
});

test('manifest keeps the existing app identity and tags home-screen launches', () => {
  const m = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '../manifest.webmanifest'), 'utf8'));
  assert.equal(m.id, './');
  assert.equal(m.start_url, './?utm_source=homescreen');
  assert.equal(m.display, 'standalone');
  assert.ok(seed.cats.length);
});
