const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.1: Jagaan rutin (c.care), masuk Fokus hari ini, Jadual, profil dan PDF.
const mk = (care, extra = {}) => { const probe = app(); const T = probe.run('td()'); const add = n => probe.run(`addD('${T}',${n})`);
  return { T, add, a: app({ data: { cats: [{ id: 'a', name: 'Mimi', sex: 'Betina', dob: add(-300), care: care(add, T), ...extra }], recs: [], vets: [], bk: 0 } }) }; };

test('version is 1.9.1', () => {
  const a = app();
  assert.match(a.json('VER'), /^1\.(9|1\d)\.\d+$/);
});

test('backup cleaning keeps valid routines and drops invalid ones', () => {
  const { a } = mk(add => [
    { id: 'k1', k: 'kuku', iv: 14, last: add(-3) },
    { id: 'k2', k: 'lain', name: '  Lap mata  ', iv: 7, last: add(-1) },
    { id: 'k3', k: 'lain', name: '', iv: 7, last: add(-1) },
    { id: 'k4', k: 'terbang', iv: 7, last: add(-1) },
    { id: 'k5', k: 'mandi', iv: 5, last: add(-1) },
    { id: 'k6', k: 'mandi', iv: 60, last: 'semalam' },
    { id: 'k1', k: 'gigi', iv: 7, last: add(-1) },
  ]);
  const care = a.json('S.cats[0].care');
  assert.deepEqual(care.map(x => x.id), ['k1', 'k2']);
  assert.equal(care[1].name, 'Lap mata');
});

test('due and overdue routines appear in Fokus hari ini and the 30-day schedule', () => {
  const { a } = mk(add => [{ id: 'k1', k: 'kuku', iv: 14, last: add(-14) }, { id: 'k2', k: 'kutu', iv: 30, last: add(-35) }, { id: 'k3', k: 'mandi', iv: 60, last: add(-1) }]);
  const t = a.json("tasks().filter(x=>x.t==='jagaan').map(x=>[x.cid,x.d])");
  assert.deepEqual(t, [['k2', -5], ['k1', 0]]);
  const home = a.json('focus()');
  assert.match(home, /Potong kuku/); assert.match(home, /Rawatan kutu/); assert.doesNotMatch(home, />Mandi</);
  assert.match(a.json('jdv()'), /Potong kuku/);
});

test('Selesai moves the next date on, and undo restores it the same day', () => {
  const { a, add } = mk(add => [{ id: 'k1', k: 'kuku', iv: 14, last: add(-20) }]);
  a.run("careDone('a','k1')");a.run('FOPEN=true');
  assert.equal(a.json('S.cats[0].care[0].last'), a.json('td()'));
  assert.equal(a.json('careNext(S.cats[0].care[0])'), add(14));
  assert.match(a.json('focus()'), /Selesai/);
  assert.equal(a.json("tasks().filter(x=>x.t==='jagaan').length"), 1); // still listed in Jadual as upcoming in 14 days
  a.run("careUndo('a','k1')");
  assert.equal(a.json('S.cats[0].care[0].last'), add(-20));
  assert.equal(a.run('S.cats[0].care[0].dn'), undefined);
  assert.equal(JSON.parse(a.storage()).cats[0].care[0].last, add(-20));
});

test('the care form validates and saves a custom routine', () => {
  const { a, T } = mk(() => []);
  a.run("cid='a'");
  a.submit('saveCare', { k: 'lain', name: '', iv: '7', last: T });
  assert.equal(a.json('messages.at(-1)'), 'Masukkan nama jagaan');
  a.submit('saveCare', { k: 'kuku', iv: '5', last: T });
  assert.equal(a.json('messages.at(-1)'), 'Pilih kekerapan');
  a.submit('saveCare', { k: 'kuku', iv: '14', last: '2999-01-01' });
  assert.equal(a.json('messages.at(-1)'), 'Masukkan tarikh hari ini atau sebelumnya');
  a.submit('saveCare', { k: 'lain', name: 'Lap mata', iv: '7', last: T });
  const care = a.json('S.cats[0].care');
  assert.equal(care.length, 1); assert.equal(care[0].name, 'Lap mata'); assert.equal(care[0].iv, 7);
  a.submit('saveCare', { k: 'kuku', iv: '14', last: T }, `'${care[0].id}'`);
  const e = a.json('S.cats[0].care[0]');
  assert.equal(e.k, 'kuku'); assert.equal(e.name, undefined);
});

test('profile tab, PDF section and delete', () => {
  const { a } = mk(add => [{ id: 'k1', k: 'telinga', iv: 14, last: add(-2) }]);
  a.run("cid='a';tab='jagaan'");
  const v = a.json('catv()');
  assert.match(v, /Bersih telinga/); assert.match(v, /Tambah jagaan rutin/); assert.match(v, /Setiap 2 minggu/);
  assert.match(a.json('rpt(S.cats[0])'), /Jagaan rutin[\s\S]*Bersih telinga/);
  a.run("careDel('k1');_ask()");
  assert.equal(a.run('S.cats[0].care'), undefined);
});

test('profile tabs are a 3-column grid with Jagaan visible in the second row, and the active tab is marked', () => {
  const { a } = mk(() => []);
  a.run("cid='a';tab='jagaan'");
  const v = a.json('catv()');
  assert.match(v, /class="tabs tgr"/);
  const order = [...v.matchAll(/data-tab="(\w+)"/g)].map(m => m[1]);
  assert.deepEqual(order, ['berat', 'vaksin', 'cacing', 'jagaan', 'lawatan', 'sihat']);
  assert.match(v, /class="on" role="tab" aria-selected="true" data-action="tab" data-tab="jagaan"/);
});

// ---- Kemas kini app & senarai perubahan
const fs = require('node:fs'), path = require('node:path');
const CLJ = JSON.parse(fs.readFileSync(path.join(__dirname, '../changelog.json'), 'utf8'));
const SW = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');

test('changelog.json: newest first, starts at the current version, every item in BM and English', () => {
  const a = app();
  assert.equal(CLJ[0].v, a.json('VER'));
  for (let i = 1; i < CLJ.length; i++) assert.ok(a.json(`vGt('${CLJ[i - 1].v}','${CLJ[i].v}')`), CLJ[i].v);
  for (const e of CLJ) { assert.match(e.d, /^\d{4}-\d{2}-\d{2}$/); assert.ok(e.i.length);
    for (const x of e.i) { assert.ok(['new', 'imp', 'fix'].includes(x.t)); assert.ok(x.ms && x.en, e.v); } }
});

test('service worker waits for the Kemas kini button, except on first install or from an older version', () => {
  assert.match(SW, /addEventListener\('message'[\s\S]*event\.data === 'skip'[\s\S]*skipWaiting/);
  assert.doesNotMatch(SW, /\.then\(\(\) => self\.skipWaiting\(\)\)/);
  assert.match(SW, /const ASK_FROM = '1\.9\.1'/);
  assert.match(SW, /'changelog\.json'/);
  assert.match(SW, /pathname\.endsWith\('\/changelog\.json'\)[\s\S]*fetch\(request/);
  // newer(): same semantic as the app's vGt
  const newer = new Function(SW.match(/const newer = (.+);\n/)[0] + 'return newer;')();
  assert.equal(newer('1.9.1', '1.9.0'), true); assert.equal(newer('1.9.1', '1.9.1'), false); assert.equal(newer('1.9.1', '1.10.0'), false);
});

test('update popup lists the new version and offers Kemas kini sekarang and Nanti; Nanti leaves a bar', () => {
  const a = app();
  a.run(`CL=${JSON.stringify([{ v: '9.9.9', d: '2026-12-01', i: [{ t: 'new', ms: 'Fungsi ujian', en: 'Test feature' }] }, ...CLJ])};updW={postMessage(m){globalThis.sent=m}};updV=[CL[0]];updShow()`);
  const sh = a.elements.get('#sh').innerHTML;
  for (const t of ['Versi baharu tersedia', 'v9.9.9', 'Fungsi ujian', 'Kemas kini sekarang', 'Nanti', 'Data kucing anda tidak berubah']) assert.ok(sh.includes(t), t);
  a.run('updLaterF()');
  assert.match(a.elements.get('#ub').innerHTML, /Versi baharu tersedia[\s\S]*Kemas kini/);
  a.run('updNow()');
  assert.equal(a.run('sent'), 'skip');
});

test('Apa yang baharu shows once after an update, but not on a fresh install', async () => {
  const a = app();
  a.run(`CL=${JSON.stringify(CLJ)};localStorage.setItem('kucingku-seen-v1','1.9.0');a0=document.querySelector('#sh');a0.hidden=true;whatsNew()`);
  await new Promise(r => setImmediate(r));
  assert.match(a.elements.get('#sh').innerHTML, /Kucingku dah dikemas kini/);
  assert.ok(a.elements.get('#sh').innerHTML.includes(CLJ[0].i[0].ms.slice(0, 20)));
  assert.equal(a.run("localStorage.getItem('kucingku-seen-v1')"), a.json('VER'));
  const b = app({ data: { cats: [], recs: [], vets: [], bk: 0 } });
  b.run(`CL=${JSON.stringify(CLJ)};document.querySelector('#sh').innerHTML='';whatsNew()`);
  await new Promise(r => setImmediate(r));
  assert.doesNotMatch(b.elements.get('#sh').innerHTML, /dikemas kini/);
});

test('Setting → Tentang links to the changelog, which marks the current version and translates', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  a.run("view='set';ssub='tentang'");
  assert.match(a.json('setv()'), /data-v="log"[\s\S]*Senarai perubahan/);
  a.run(`CL=${JSON.stringify(CLJ)};ssub='log'`);
  const v = a.json('setv()');
  assert.match(v, /Versi anda/); assert.match(v, /Routine care/); assert.match(v, /v1\.0\.0/);
  for (const t of ['Senarai perubahan', 'Versi anda', 'Baharu', 'Lebih baik', 'Dibaiki', 'Versi baharu tersedia', 'Kemas kini sekarang', 'Nanti', 'Kucingku dah dikemas kini', 'Lihat semua perubahan'])
    assert.notEqual(a.json(`trs(${JSON.stringify(t)})`), t, t);
  assert.equal(a.json('trs("Apa yang baharu dalam v1.9.1")'), "What's new in v1.9.1");
});
