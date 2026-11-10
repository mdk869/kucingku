const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, source } = require('./helpers.cjs');

// v1.8.7: website rasmi (/tentang) untuk desktop, Dasar Privasi (/privasi) dan pratonton link (Open Graph).
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const loc = pathname => { const l = { origin: 'https://kucingku-bay.vercel.app', host: 'kucingku-bay.vercel.app', pathname, search: '', went: [] }; l.replace = u => l.went.push(u); return l; };
const open = (ua, pathname, opts = {}) => { const location = loc(pathname); const a = app({ ua, extra: { location, URLSearchParams, screen: opts.screen || { width: 1920, height: 1080 } }, media: opts.media || (() => false) }); return { a, location }; };

test('desktop visitors are sent to the official website', () => {
  const { a, location } = open(DESK, '/');
  assert.deepEqual(location.went, ['/tentang']);
  assert.equal(a.elements.get('#app').innerHTML, '');
});

test('iPad (reports as Mac) is treated as desktop and sent to the website', () => {
  const { location } = open(IPAD, '/', { media: q => q.includes('pointer:coarse'), screen: { width: 820, height: 1180 } });
  assert.deepEqual(location.went, ['/tentang']);
});

test('no redirect loop: if the app is ever shown at /tentang, it falls back to the QR screen', () => {
  for (const p of ['/tentang', '/tentang/', '/privasi', '/tentang.html']) {
    const { a, location } = open(DESK, p);
    assert.deepEqual(location.went, [], p);
    assert.match(a.elements.get('#app').innerHTML, /icons\/qr.svg/);
  }
});

test('phones are never redirected to the website', () => {
  const { location } = open(IPHONE, '/', { media: q => q.includes('pointer:coarse'), screen: { width: 390, height: 844 } });
  assert.deepEqual(location.went, []);
});

test('website and app use the same phone detection (else "Buka app" could bounce tablets back)', () => {
  const rx = s => s.match(/\/iPhone\|iPod\|Android\.\*Mobile\|Windows Phone\/i/g);
  assert.ok(rx(source) && rx(read('web.js')));
  assert.match(source, /matchMedia\('\(pointer:coarse\)'\)\.matches&&Math\.min\(screen\.width,screen\.height\)<600/);
  assert.match(read('web.js'), /matchMedia\('\(pointer:coarse\)'\)\.matches && Math\.min\(screen\.width, screen\.height\) < 600/);
});

test('service worker serves /tentang and /privasi from the network, not the cached app', () => {
  const sw = read('sw.js');
  const ver = source.match(/const VER='([\d.]+)'/)[1];
  assert.equal(ver, '1.8.7');
  assert.match(sw, new RegExp(`const CACHE = 'kucingku-${ver.replace(/\./g, '\\.')}'`));
  const rx = new RegExp(sw.match(/request\.mode === 'navigate' && \/(.+)\/\.test\(url\.pathname\)\) return;/)[1]);
  for (const p of ['/tentang', '/privasi', '/tentang/']) assert.ok(rx.test(p), p);
  for (const p of ['/', '/index.html', '/?utm_source=web']) assert.ok(!rx.test(p), p);
  assert.equal(JSON.parse(read('package.json')).version, ver);
});

test('Vercel serves the website pages at clean URLs', () => {
  const v = JSON.parse(read('vercel.json'));
  assert.deepEqual(v.rewrites, [{ source: '/tentang', destination: '/tentang.html' }, { source: '/privasi', destination: '/privasi.html' }]);
  assert.equal(v.cleanUrls, undefined, 'cleanUrls would redirect /index.html, which the service worker caches');
});

test('website pages follow the strict CSP: no inline scripts, styles or handlers; all local files exist', () => {
  for (const f of ['tentang.html', 'privasi.html']) {
    const h = read(f);
    assert.match(h, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self';/);
    assert.doesNotMatch(h, /<script(?![^>]*\bsrc=)[^>]*>/, f + ' inline script');
    assert.doesNotMatch(h, /\sstyle=|<style/, f + ' inline style');
    assert.doesNotMatch(h, /\son[a-z]+=/i, f + ' inline handler');
    for (const [, u] of h.matchAll(/(?:src|href)="([^"#:]+?)"/g)) {
      if (u.startsWith('/_vercel/') || u === '/tentang' || u === '/privasi' || u.startsWith('/?')) continue;
      assert.ok(fs.existsSync(path.join(root, u.replace(/^\//, ''))), `${f}: ${u}`);
    }
    for (const [u] of h.matchAll(/target="_blank"[^>]*/g)) assert.match(u, /rel="noopener"/);
  }
});

test('desktop website: QR, WhatsApp and copy link; phones get a "Buka Kucingku" button', () => {
  const h = read('tentang.html');
  assert.match(h, /class="get only-desk"[\s\S]*icons\/qr\.svg/);
  const wa = h.match(/https:\/\/wa\.me\/\?text=([^"]+)/)[1];
  assert.match(decodeURIComponent(wa), /https:\/\/kucingku-bay\.vercel\.app\/\?utm_source=web$/);
  assert.match(h, /data-copy/);
  assert.match(h, /class="btn" href="\/\?utm_source=web">Buka Kucingku</);
  assert.match(read('web.js'), /var LINK = 'https:\/\/kucingku-bay\.vercel\.app\/\?utm_source=web'/);
});

test('shared links show a preview image (Open Graph) on the app and the website', () => {
  for (const f of ['index.html', 'tentang.html']) {
    const h = read(f);
    const img = h.match(/<meta property="og:image" content="https:\/\/kucingku-bay\.vercel\.app\/([^"]+)"/)[1];
    assert.ok(fs.existsSync(path.join(root, img)), img);
    assert.match(h, /<meta property="og:title" content="Kucingku/);
    assert.match(h, /<meta name="twitter:card" content="summary_large_image">/);
  }
  const jpg = fs.readFileSync(path.join(root, 'img/og.jpg'));
  assert.ok(jpg.length < 150 * 1024, 'og.jpg should stay small');
});

test('privacy policy covers storage, analytics, third parties and deletion', () => {
  const h = read('privasi.html');
  for (const s of ['localStorage', 'Vercel Web Analytics', 'Google Fonts', 'cdnjs', 'Google Forms', 'Padam semua data', 'Berkuat kuasa']) assert.ok(h.includes(s), s);
});

test('logo link scrolls fully to the top (anchor is the page, not the sticky header)', () => {
  const h = read('tentang.html');
  assert.match(h, /<body id="top">/);
  assert.doesNotMatch(h, /<header[^>]*id="top"/);
  assert.match(h, /<a class="brand" href="#top">/);
});

test('in-page links are scrolled by script (same result in every browser)', () => {
  const js = read('web.js');
  assert.match(js, /closest\('a\[href\^="#"\]'\)/);
  assert.match(js, /e\.preventDefault\(\);\s*goTo\(id\)/);
  assert.match(js, /id === 'dapatkan'/);
  assert.doesNotMatch(read('web.css'), /html\{[^}]*scroll-behavior:smooth/);
});
