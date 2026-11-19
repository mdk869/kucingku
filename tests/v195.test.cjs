const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.3: butang ＋ Tambah di tengah menu bawah, kad Lagi, dan maklum balas dalam app.

const three = { cats: [{ id: 'a', name: 'Mimi' }, { id: 'b', name: 'Oyen' }, { id: 'c', name: 'Tompok' }], recs: [], vets: [], bk: 0 };
const sh = a => a.elements.get('#sh').innerHTML;
const form = (o = {}) => `({querySelector:s=>{if(/button/.test(s))return {};const m=s.match(/name="(\\w+)"/);const v=${JSON.stringify({ k: o.k || 'cad', r: o.r || '' })}[m[1]];return /button/.test(s)?{}:v?{value:v}:null},elements:{m:{value:${JSON.stringify(o.m ?? 'Nak rekod ubat kutu juga')}},inf:{checked:${o.inf !== false}}}})`;
const withFetch = (a, ok = true) => a.run(`globalThis.__f=[];fetch=(u,o)=>{__f.push({u,o});return ${ok ? 'Promise.resolve({type:"opaque"})' : 'Promise.reject(new Error("net"))'}}`);

test('the bottom menu has five slots with the raised ＋ Tambah button in the middle and a grid icon for Lagi', () => {
  const a = app({ standalone: true });
  a.run('render0()');
  const nav = a.elements.get('#nav').innerHTML;
  const btns = nav.match(/<button[^>]*>/g);
  assert.equal(btns.length, 5);
  assert.match(btns[2], /class="nvp" data-action="tambah"/);
  assert.match(nav, />Tambah<\/button>/);
  assert.ok(nav.indexOf('data-view="cats"') < nav.indexOf('data-action="tambah"'));
  assert.ok(nav.indexOf('data-action="tambah"') < nav.indexOf('data-view="jd"'));
  assert.match(nav, /<rect x="14" y="14" width="6" height="6" rx="1\.5"\/><\/svg>Lagi/);
});

test('with one cat the Tambah sheet skips the cat picker; with several it shows chips and remembers the choice', () => {
  const one = app();
  one.run('tambah()');
  assert.doesNotMatch(sh(one), /data-action="tmCat"/);
  assert.match(sh(one), /Untuk <b>Milo<\/b>/);
  for (const k of ['berat', 'vaksin', 'cacing', 'jagaan', 'lawatan', 'sihat', 'stok', 'kucing']) assert.match(sh(one), new RegExp(`data-action="tmGo" data-k="${k}"`));
  const a = app({ data: three });
  a.run("cid='a';tambah()");
  assert.equal((sh(a).match(/data-action="tmCat"/g) || []).length, 3);
  assert.match(sh(a), /class="on" data-action="tmCat" data-id="a"/);
  a.run("clickActions.tmCat({dataset:{id:'b'}})");
  assert.match(sh(a), /class="on" data-action="tmCat" data-id="b"/);
  a.run("cid='c';tambah()");
  assert.match(sh(a), /class="on" data-action="tmCat" data-id="b"/, 'the last picked cat is kept');
});

test('each Tambah action opens the right form for the picked cat', () => {
  const a = app({ data: three });
  a.run("TMC='b';tmGo('berat')");
  assert.equal(a.run('view'), 'cat');
  assert.equal(a.run('cid'), 'b');
  assert.equal(a.run('tab'), 'berat');
  assert.match(sh(a), /data-submit="rec"/);
  a.run("tmGo('vaksin')");
  assert.equal(a.run('tab'), 'vaksin');
  a.run("tmGo('jagaan')");
  assert.equal(a.run('tab'), 'jagaan');
  assert.match(sh(a), /data-submit="care"/, 'no routine yet, so the add form opens');
  a.run("try{tmGo('kucing')}catch(e){}"); // catForm perlukan DOM sebenar untuk umur langsung
  assert.match(sh(a), /data-submit="cat"/);
});

test('Dah beli stok opens the buy form, a picker for several items, or the add form when there is no stock', () => {
  const a = app();
  a.run("tmGo('stok')");
  assert.equal(a.run('view'), 'stok');
  assert.match(sh(a), /data-submit="stok"/);
  const b = app({ data: { cats: [{ id: 'a', name: 'Mimi' }], recs: [], vets: [], bk: 0, stock: [{ id: 's1', k: 'kering', size: 2, unit: 'kg', buys: [] }, { id: 's2', k: 'pasir', size: 10, unit: 'l', buys: [] }] } });
  b.run("tmGo('stok')");
  assert.match(sh(b), /Dah beli apa\?/);
  assert.equal((sh(b).match(/data-action="buyForm"/g) || []).length, 2);
});

test('with no cats yet, Tambah only offers to add the first cat', () => {
  const a = app({ data: { cats: [], recs: [], vets: [], bk: 0 } });
  a.run('tambah()');
  assert.match(sh(a), /Mula dengan menambah kucing pertama anda/);
  assert.doesNotMatch(sh(a), /data-k="berat"/);
  assert.match(sh(a), /data-k="kucing"/);
});

test('the Lagi page shows the feedback card with three quick types, then the coffee card, then the version', () => {
  const a = app();
  const h = a.json('morev()');
  assert.match(h, /Ada idea atau jumpa masalah\?/);
  for (const k of ['cad', 'mas', 'lain']) assert.match(h, new RegExp(`data-action="fbForm" data-k="${k}"`));
  assert.ok(h.indexOf('fbk') < h.indexOf('Suka Kucingku?'));
  assert.ok(h.indexOf('Suka Kucingku?') < h.indexOf('Kucingku v'));
  a.run("view='set';ssub='tentang'");
  const t = a.json('setv()');
  assert.doesNotMatch(t, /Suka Kucingku\?/, 'the coffee card moved out of About');
  assert.match(t, /data-action="fbForm"/);
});

test('the feedback sheet preselects the tapped type and shows what app info will be included', () => {
  const a = app();
  a.run("fbForm('mas')");
  const h = sh(a);
  assert.match(h, /data-submit="fb"/);
  assert.match(h, /value="mas" data-change="fbDraft" checked/);
  assert.match(h, /name="inf" data-change="fbDraft" checked/);
  assert.match(h, new RegExp('Kucingku v' + a.run('VER').replace(/\./g, '\\.') + ' · BM · Android'));
  assert.match(h, /Tiada data kucing dihantar/);
  for (const r of ['Kurang', 'Biasa', 'Bagus', 'Suka!']) assert.match(h, new RegExp(`value="${r}"`));
});

test('Hantar posts straight to the Google Form with type, rating, message and app info, and never cat data', async () => {
  const a = app();
  withFetch(a);
  await a.run(`saveFb({},${form({ k: 'mas', r: 'Bagus', m: 'Butang simpan tak jalan' })})`);
  const [f] = a.json('__f');
  assert.equal(f.u, 'https://docs.google.com/forms/d/e/1FAIpQLSfK5e5iSrBBUDWH5bMCLIxYPe6dWAKIaNkdOt_UXYqnKObJyw/formResponse');
  assert.equal(f.o.method, 'POST');
  assert.equal(f.o.mode, 'no-cors');
  assert.equal(f.o.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const p = new URLSearchParams(f.o.body);
  assert.equal(p.get('entry.987852967'), 'Masalah');
  assert.equal(p.get('entry.1382123140'), 'Bagus');
  assert.equal(p.get('entry.1914040619'), 'Butang simpan tak jalan');
  assert.match(p.get('entry.1022943400'), /^Kucingku v\d+\.\d+\.\d+ · BM · Android/);
  assert.doesNotMatch(f.o.body, /Milo/);
  assert.match(sh(a), /Terima kasih!/);
  assert.match(sh(a), /dah sampai kepada pembangun/);
  assert.equal(a.json('FBS.q').length, 0);
  assert.equal(a.json('FBS.m'), '', 'the draft is cleared after sending');
});

test('app info can be left out, too-short messages are refused, and sends are spaced 30 seconds apart', async () => {
  const a = app();
  withFetch(a);
  await a.run(`saveFb({},${form({ m: 'ok' })})`);
  assert.deepEqual(a.json('messages'), ['Tulis sedikit lagi sebelum menghantar.']);
  await a.run(`saveFb({},${form({ inf: false })})`);
  assert.equal(new URLSearchParams(a.json('__f')[0].o.body).get('entry.1022943400'), null);
  await a.run(`saveFb({},${form({ m: 'Satu lagi cadangan' })})`);
  assert.equal(a.json('__f').length, 1);
  assert.equal(a.json('messages')[1], 'Tunggu sebentar sebelum menghantar lagi.');
});

test('without internet the feedback is kept and sent on its own once back online', async () => {
  const a = app();
  withFetch(a, false);
  await a.run(`saveFb({},${form()})`);
  assert.match(sh(a), /Tiada internet buat masa ini/);
  assert.equal(a.json('FBS.q').length, 1);
  assert.equal(JSON.parse(a.run("localStorage.getItem('kucingku-fb-v1')")).q.length, 1, 'saved, so it survives closing the app');
  withFetch(a);
  await a.run('fbFlush()');
  assert.equal(a.json('__f').length, 1);
  assert.equal(a.json('FBS.q').length, 0);
});

test('a half-written message is kept as a draft when the sheet is closed', () => {
  const a = app();
  a.run(`fbDraft({form:${form({ k: 'lain', m: 'Separuh tulis' })}})`);
  a.run('fbForm()');
  assert.match(sh(a), />Separuh tulis<\/textarea>/);
  assert.match(sh(a), /value="lain" data-change="fbDraft" checked/);
});

test('English translates the new menu, Tambah and feedback texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('Ada idea atau jumpa masalah?'), 'Got an idea or found a problem?');
  assert.equal(t('Jagaan selesai'), 'Care done');
  assert.equal(t('Dah beli stok'), 'Bought stock');
  assert.equal(t('Terima kasih!'), 'Thank you!');
  assert.equal(t('Cadangan'), 'Idea');
  assert.equal(t('Masalah'), 'Problem');
  assert.equal(t('Hantar'), 'Send');
});
