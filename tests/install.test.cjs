const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./helpers.cjs');

// Real-world user agents for the browsers people open shared links in.
const UA = {
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  miui: 'Mozilla/5.0 (Linux; U; Android 13; en-us; 2201117TG Build/TKQ1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.5.0-gn',
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  fbAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.39.108;]',
  webviewAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36',
  tiktokIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_36.5.0 JsSdk/2.0 NetType/WIFI',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};
const browser = q => q.includes('pointer:coarse'); // phone in a normal browser tab, not installed
const installed = q => q.includes('pointer:coarse') || q.includes('standalone');
const loc = (search = '?utm_source=facebook') => ({ origin: 'https://kucingku-bay.vercel.app', host: 'kucingku-bay.vercel.app', pathname: '/', search });
const extra = (search) => ({ location: loc(search), URLSearchParams });
const open = (ua, opts = {}) => app({ ua, media: browser, extra: extra(), ...opts });
const html = (a, sel = '#app') => a.elements.get(sel).innerHTML;
const LOCK = /class="lock" role="dialog"/;

test('installed app (home screen or Play Store) opens normally with no lock', () => {
  for (const a of [app({ ua: UA.androidChrome, media: installed }), app({ ua: UA.iosSafari, media: () => false, standalone: true, extra: { screen: { width: 390, height: 844 } } })]) {
    assert.equal(a.run('ENV.sa'), true);
    assert.doesNotMatch(html(a), LOCK);
    assert.doesNotMatch(html(a), /class="lk"/);
    assert.match(html(a), /class="hero"/);
    a.run("go('more')");
    assert.doesNotMatch(html(a), /data-action="ixGo"|LOCK/);
  }
});

test('phone browser tab is locked: app greyed behind a panel that cannot be dismissed', () => {
  const a = open(UA.androidChrome);
  assert.deepEqual(a.json('ENV'), { ios: false, and: true, sa: false, iab: false, app: '', br: 'chrome' });
  const h = html(a);
  assert.match(h, /^<div class="lk" inert aria-hidden="true">.*class="hero".*<\/div><div class="lock" role="dialog" aria-modal="true"/s);
  assert.match(h, /Pasang Kucingku untuk mula.*Android · Percuma, tanpa daftar akaun/s);
  assert.doesNotMatch(h.slice(h.indexOf('class="lock"')), /data-action="(closeSh|ixLater|go)"/, 'no way to close the panel');
  // Every view stays locked, including navigation from the bottom bar.
  for (const v of ['cats', 'jd', 'more', 'set']) { a.run(`go('${v}')`); assert.match(html(a), LOCK, v); }
  assert.match(html(open(UA.iosSafari, { data: { cats: [], recs: [], vets: [], bk: 0 } })), /class="lk".*Selamat datang!.*class="lock"/s);
});

test('Android without the browser install event shows the illustrated menu steps directly', () => {
  const a = open(UA.androidChrome);
  const h = html(a);
  assert.match(h, /Tekan menu ⋮.*Pilih Pasang app.*Tekan Pasang/s);
  assert.equal((h.match(/class="il"/g) || []).length, 3);
  assert.doesNotMatch(h, /data-action="ixGo"/);

});

test('Android with the browser install event installs in one tap, then says to open from the icon', async () => {
  const a = open(UA.androidChrome);
  a.run("globalThis.prompted=0;bip={prompt(){prompted++},userChoice:Promise.resolve({outcome:'accepted'})};render()");
  const h = html(a);
  assert.match(h, /<button class="btn lkb" data-action="ixGo">Pasang Kucingku<\/button><details class="lks"><summary>Butang tidak berfungsi\? Pasang secara manual<\/summary>.*Tekan menu ⋮/s);
  a.run('ixGo()');
  assert.equal(a.run('prompted'), 1);
  await new Promise(r => setImmediate(r));
  const done = html(a);
  assert.match(done, /class="lkd".*Kucingku sudah dipasang.*buka Kucingku dari ikon di skrin utama/s);
  assert.match(done, LOCK, 'the browser tab stays locked; the app is used from the icon');
});

test('dismissing the install prompt falls back to manual steps instead of unlocking', async () => {
  const a = open(UA.androidChrome);
  a.run("bip={prompt(){},userChoice:Promise.resolve({outcome:'dismissed'})};render();ixGo()");
  await new Promise(r => setImmediate(r));
  assert.equal(a.run('ixDone'), false);
  const h = html(a);
  assert.match(h, LOCK);
  assert.doesNotMatch(h, /data-action="ixGo"/);
  assert.match(h, /<ol class="sts">.*Tekan menu ⋮/s);
});

test('iPhone shows Share → Add to Home Screen steps for Safari and Chrome', () => {
  const a = open(UA.iosSafari);
  assert.equal(a.run('ENV.br'), 'safari');
  const h = html(a);
  assert.match(h, /iPhone · Percuma.*Tekan butang Kongsi.*di bar bawah skrin.*Pilih Tambah ke Skrin Utama.*Tekan Tambah/s);
  assert.doesNotMatch(h.slice(h.indexOf('class="lock"')), /Export|Backup/);
  assert.match(html(open(UA.iosChrome)), /Di Chrome, ikon Kongsi ada di hujung kanan bar alamat/);
});

test('Android browsers that cannot install send the user to Chrome', () => {
  const a = open(UA.miui);
  assert.equal(a.run('ENV.br'), 'other');
  const h = html(a);
  assert.match(h, LOCK);
  assert.match(h, /Pelayar ini tidak boleh memasang app.*href="intent:\/\/kucingku-bay.vercel.app\/\?utm_source=facebook#Intent;scheme=https;package=com.android.chrome;/s);
  assert.match(h, /data-action="ixCopy"/);
  assert.doesNotMatch(h, /Tekan menu ⋮/);
});

test('Samsung Internet is sent to Chrome because Play Protect blocks its installed apps', () => {
  const a = open(UA.samsung);
  assert.equal(a.run('ENV.br'), 'samsung');
  const h = html(a);
  assert.match(h, LOCK);
  assert.match(h, /Samsung Internet memasang app dengan cara yang disekat oleh Google Play Protect.*href="intent:\/\/kucingku-bay.vercel.app\/[^"]*package=com.android.chrome;/s);
  assert.doesNotMatch(h, /Tekan menu ⋮|data-action="ixGo"/);
  a.run("bip={prompt(){},userChoice:Promise.resolve({})};render()");
  assert.doesNotMatch(html(a), /data-action="ixGo"/, 'never offers Samsung Internet\'s own install prompt');
});

test('?dev opens the app in a browser for testing and ?dev=0 turns it off', () => {
  const a = app({ ua: UA.androidChrome, media: browser, extra: extra('?dev') });
  assert.equal(a.run('DEV'), true);
  assert.doesNotMatch(html(a), LOCK);
  assert.match(html(a), /class="hero"/);
  assert.equal(a.run("localStorage.getItem(IK+'-dev')"), '1');
  const off = app({ ua: UA.androidChrome, media: browser, extra: extra('?dev=0') });
  assert.equal(off.run('DEV'), false);
  assert.match(html(off), LOCK);
});

test('Facebook in-app browser on Android gets a one-tap Open in Chrome link and no way to continue there', () => {
  const a = open(UA.fbAndroid);
  assert.deepEqual(a.json('[ENV.iab,ENV.app]'), [true, 'Facebook']);
  const h = html(a);
  assert.match(h, /class="gate iab".*Buka dalam Chrome.*Kucingku sedang dibuka dalam <b>Facebook<\/b>/s);
  assert.ok(h.includes('href="intent://kucingku-bay.vercel.app/?utm_source=facebook#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fkucingku-bay.vercel.app%2F%3Futm_source%3Dfacebook;end"'));
  assert.match(h, /id="ixu" class="ixu" readonly value="https:\/\/kucingku-bay.vercel.app\/\?utm_source=facebook"/);
  assert.doesNotMatch(h, /Teruskan di sini|iabStay/);
  assert.equal(html(a, '#nav'), '');
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

test('install lock is fully translated to English', () => {
  const MALAY = /\b(tekan|pilih|pasang|tambah|kongsi|salin|pautan|skrin|utama|dalam|pelayar|langkah|mudah|sudah|ikon|buka|teruskan|imbas|kamera|telefon|sahaja|aplikasi|dibuka|hilang|tidak|berjaya|tampal|bucu|kanan|atas|bawah|leret|senarai|batal|tetapan|baharu|percuma|daftar|akaun|mula|butang|berfungsi|manual|tutup|digunakan|sekali|kemudian)\b/i;
  const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const lockPart = h => h.includes('class="lock"') ? h.slice(h.indexOf('class="lock"')) : h;
  const segs = h => [...new Set([...(h.match(/(?:aria-label|alt)="[^"]*"/g) || []).map(m => decode(m.replace(/^[a-z-]+="|"$/g, ''))), ...h.split(/<[^>]*>/).map(x => decode(x).trim()).filter(Boolean)])];
  const check = (a, h) => {
    // Allowed: the "In Bahasa Melayu: …" hints deliberately quote the Malay menu labels.
    const left = a.json(`${JSON.stringify(segs(lockPart(h)))}.map(trs)`).filter(x => MALAY.test(x) && !/In Bahasa Melayu/.test(x));
    assert.deepEqual(left, []);
  };
  const st = { v: 1, lang: 'en', bk: 30, unit: 'auto' };
  for (const ua of [UA.androidChrome, UA.iosSafari, UA.samsung, UA.iosChrome, UA.miui, UA.fbAndroid, UA.tiktokIos, UA.webviewAndroid]) { const a = open(ua, { settings: st }); check(a, html(a)); }
  const b = open(UA.androidChrome, { settings: st }); b.run("bip={prompt(){},userChoice:Promise.resolve({})};render()"); check(b, html(b));
  b.run('ixDone=true;render()'); check(b, html(b));
  const d = app({ ua: UA.desktop, media: () => false, settings: st, extra: { screen: { width: 1920, height: 1080 } } }); check(d, html(d));
  assert.deepEqual(b.json('["Pasang Kucingku untuk mula","Kucingku sudah dipasang","Tambah ke Skrin Utama"].map(trs)'), ['Install Kucingku to start', 'Kucingku is installed', 'Add to Home Screen']);
});

test('manifest keeps the existing app identity and tags home-screen launches', () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.webmanifest'), 'utf8'));
  assert.equal(m.id, './');
  assert.equal(m.start_url, './?utm_source=homescreen');
  assert.equal(m.display, 'standalone');
});
