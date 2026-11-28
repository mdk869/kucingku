const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { source } = require('./helpers.cjs');

// Website: "Apa yang baharu" (/tentang#perubahan) dan ciri v1.9, dibaca daripada changelog.json.
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const CL = JSON.parse(read('changelog.json'));

const SER = v => v.split('.').slice(0, 2).join('.');
test('website changes do not touch the app (no update popup on phones)', () => {
  const ver = source.match(/const VER='([\d.]+)'/)[1];
  assert.equal(CL[0].v, ver, 'changelog top entry = app version');
  assert.match(read('sw.js'), new RegExp(`const CACHE = 'kucingku-${ver.replace(/\./g, '\\.')}'`));
  assert.match(read('sw.js'), /request\.mode === 'navigate' && \/\^\\\/\(tentang\|privasi\|j\)\(\\\.html\)\?\\\/\?\$\/\.test/, 'sw.js website bypass unchanged: changelog lives at /tentang#perubahan');
  assert.deepEqual(JSON.parse(read('vercel.json')).rewrites.map(r => r.source), ['/tentang', '/privasi', '/j']);
});

test('changelog view, latest box and version labels exist in /tentang', () => {
  const h = read('tentang.html');
  assert.match(h, /<main id="laman">/);
  assert.match(h, /<main id="perubahan-v" class="clv" hidden/);
  assert.match(h, /<a href="#perubahan" class="nvnew">Apa yang baharu<span class="vpill" data-ver hidden><\/span><\/a>/);
  assert.match(h, /data-newpill hidden/);
  assert.match(h, /<section class="wn" data-wn hidden/);
  for (const f of ['all', 'new', 'imp', 'fix']) assert.match(h, new RegExp(`data-f="${f}"`));
  assert.doesNotMatch(h, /v1\.8\.7/, 'no hard-coded old version');
  assert.match(h, /<a href="#perubahan">Apa yang baharu<\/a><a href="\/privasi">/);
  assert.match(read('privasi.html'), /href="\/tentang#perubahan"/);
});

test('every feature card with a version points to a real changelog entry', () => {
  const h = read('tentang.html');
  const cards = [...h.matchAll(/<article class="f" data-v="([\d.]+)" data-t="(new|imp)">/g)];
  assert.ok(cards.length >= 6);
  for (const [, v] of cards) assert.ok(CL.some(e => e.v === v), v);
  assert.equal((h.match(/<article class="f"/g) || []).length, 12);
  // Cards still badged must belong to the current version series (e.g. 1.10.x).
  const ser = v => v.split('.').slice(0, 2).join('.');
  for (const n of ['Jadual ubat', 'Sesi vet', 'Jika saya hilang']) {
    const m = h.match(new RegExp(`<article class="f" data-v="([\\d.]+)" data-t="new">(?:(?!</article>).)*?${n}`, 's'));
    assert.ok(m, n); assert.equal(ser(m[1]), ser(CL[0].v), n);
  }
  assert.doesNotMatch(h, /Ubat berjalan/, 'website uses the new name Jadual ubat');
});

test('new screenshots exist and are used; app install screenshots are left alone', () => {
  const h = read('tentang.html');
  for (const n of ['utama', 'tambah', 'ubat', 'sesi', 'hilang', 'stok', 'profil', 'jadual']) {
    assert.ok(fs.existsSync(path.join(root, `img/web-${n}.webp`)), n);
    assert.match(h, new RegExp(`img/web-${n}\\.webp`));
  }
  assert.doesNotMatch(h, /pratonton-/);
  for (const n of ['utama', 'profil', 'kucing', 'jadual']) assert.ok(fs.existsSync(path.join(root, `img/pratonton-${n}.webp`)));
});

test('belanja kopi never appears on the website', () => {
  for (const f of ['tentang.html', 'web.js']) assert.doesNotMatch(read(f), /kopi|penyokong|DuitNow/i, f);
  assert.doesNotMatch(JSON.stringify(CL), /kopi|penyokong/i);
});

// Jalankan web.js dengan DOM kecil: semak isi dikira daripada changelog.json.
function fakeDom(hash) {
  const els = {}, all = [];
  const mk = (sel, attrs = {}) => {
    const e = { sel, hidden: true, textContent: '', children: [], attrs: { ...attrs }, classList: { list: new Set(), add(c) { this.list.add(c); }, remove(c) { this.list.delete(c); }, toggle() {} },
      appendChild(c) { this.children.push(c); return c; }, getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = v; },
      querySelector(s) { return s === '.nb' ? this.children.find(c => /nb/.test(c.className)) || null : s === 'span' ? this.span : null; }, remove() {} };
    all.push(e); return e;
  };
  ['[data-ver]', '[data-ver-f]', '[data-newpill]', '[data-newtext]', '[data-wn]', '[data-wnl]', '[data-wnh]', '[data-cll]', '[data-clmore]', '[data-cle]', '[data-clerr]'].forEach(s => { els[s] = mk(s); });
  const cards = [mk('.f', { 'data-v': CL[0].v, 'data-t': 'new' }), mk('.f', { 'data-v': CL[0].v, 'data-t': 'imp' }), mk('.f', { 'data-v': CL.find(e => SER(e.v) !== SER(CL[0].v)).v, 'data-t': 'new' }), mk('.f', { 'data-v': '1.0.0', 'data-t': 'new' }), mk('.f', { 'data-v': (CL.find((e, i) => i > 0 && SER(e.v) === SER(CL[0].v)) || CL[0]).v, 'data-t': 'new' })];
  const chips = ['all', 'new', 'imp', 'fix'].map(f => { const b = mk('btn', { 'data-f': f }); b.span = mk('span'); return b; });
  const laman = mk('#laman'); laman.hidden = false; const clv = mk('#perubahan-v');
  const document = {
    title: 'Kucingku', documentElement: { classList: { add() {} } },
    getElementById: id => (id === 'laman' ? laman : id === 'perubahan-v' ? clv : null),
    querySelector: s => els[s] || null,
    querySelectorAll: s => (s === '.f[data-v]' ? cards : s === '[data-clf] button' ? chips : els[s] ? [els[s]] : []),
    createElement: tag => { const e = mk(tag); e.className = ''; return e; },
    addEventListener() {}, body: { appendChild() {} }
  };
  let fetched;
  const win = {
    document, location: { hash, pathname: '/tentang', search: '' }, history: { pushState() {}, replaceState() {} },
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }, screen: { width: 1920, height: 1080 }, matchMedia: () => ({ matches: false }),
    addEventListener() {}, scrollTo() {}, scrollY: 0, innerHeight: 900, setTimeout, clearTimeout,
    fetch: u => { fetched = u; return Promise.resolve({ ok: true, json: () => Promise.resolve(CL) }); },
    Date: class extends Date { static now() { return Date.parse(CL[0].d + 'T10:00:00+08:00') + 3 * 864e5; } }
  };
  win.window = win;
  return { win, els, cards, chips, laman, clv, get fetched() { return fetched; } };
}
const run = async hash => { const d = fakeDom(hash); vm.runInNewContext(read('web.js'), d.win); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); return d; };

test('web.js fills version, latest box and 30-day badges from changelog.json', async () => {
  const d = await run('');
  assert.equal(d.fetched, 'changelog.json');
  assert.equal(d.els['[data-ver]'].textContent, 'v' + CL[0].v);
  assert.equal(d.els['[data-ver-f]'].textContent, ' · v' + CL[0].v);
  assert.equal(d.els['[data-newpill]'].hidden, false);
  assert.equal(d.els['[data-newtext]'].textContent, 'Apa yang baharu dalam v' + CL[0].v);
  assert.equal(d.els['[data-wn]'].hidden, false);
  assert.equal(d.els['[data-wnl]'].children.length, Math.min(3, CL[0].i.length));
  const badge = c => (c.children.find(x => /nb/.test(x.className)) || {}).textContent;
  assert.equal(badge(d.cards[0]), 'Baharu');
  assert.equal(badge(d.cards[1]), 'Lebih baik');
  assert.equal(badge(d.cards[2]), undefined, 'only the latest version series gets badges');
  assert.equal(badge(d.cards[4]), 'Baharu', 'an earlier patch of the same series (1.10.x) keeps its badge');
  assert.equal(badge(d.cards[3]), undefined, 'old version gets no badge');
  assert.equal(d.laman.hidden, false);
});

test('#perubahan shows the changelog view with 7 recent versions and filter counts', async () => {
  const d = await run('#perubahan');
  assert.equal(d.laman.hidden, true);
  assert.equal(d.clv.hidden, false);
  assert.equal(d.els['[data-cll]'].children.length, Math.min(7, CL.length));
  const total = CL.reduce((n, e) => n + e.i.length, 0);
  assert.equal(String(d.chips[0].span.textContent), String(total));
  assert.equal(d.chips[0].attrs['aria-pressed'], 'true');
  assert.equal(d.els['[data-clmore]'].hidden, CL.length <= 7);
});

test('website feedback uses its own form UI, never the raw Google Form link', () => {
  for (const f of ['tentang.html', 'privasi.html']) {
    const h = read(f);
    assert.doesNotMatch(h, /docs\.google\.com\/forms/, f + ': no raw form link');
    assert.match(h, /data-fb/, f);
    assert.match(h, /<script src="web\.js" defer><\/script>/, f);
    assert.match(h, /connect-src 'self' https:\/\/docs\.google\.com;/, f + ': CSP allows sending');
  }
  assert.match(read('tentang.html'), /atau dalam app: Lagi → Maklum balas\./);
});

test('website feedback sends to the same Google Form and fields as the app', () => {
  const js = read('web.js');
  const app = source.match(/const FB=\{form:'([^']+)',jen:'([^']+)',rasa:'([^']+)',msg:'([^']+)',ver:'([^']+)'\}/);
  assert.ok(app);
  assert.ok(js.includes(app[1].replace(/viewform$/, 'formResponse')), 'same form');
  for (const k of [2, 3, 4, 5]) assert.ok(js.includes(`'${app[k]}'`), app[k]);
  const appT = [...source.match(/FBT=\[(.*?)\],FBR=/)[1].matchAll(/\['\w+','([^']+)'/g)].map(m => m[1]);
  const appR = [...source.match(/FBR=\[(.*?)\];/)[1].matchAll(/\['[^']+','([^']+)'\]/g)].map(m => m[1]);
  const webT = [...js.match(/var FBT = \[(.*?)\];/)[1].matchAll(/\['([^']+)', '/g)].map(m => m[1]);
  const webR = [...js.match(/var FBR = \[(.*?)\];/)[1].matchAll(/\['[^']+', '([^']+)'\]/g)].map(m => m[1]);
  assert.deepEqual(webT, appT, 'Jenis options match the Google Form');
  assert.deepEqual(webR, appR, 'Rasa options match the Google Form');
  assert.match(js, /mode: 'no-cors'/);
  assert.match(js, /FBGAP = 30000/);
  assert.match(js, /Tiada data kucing dihantar/);
});
