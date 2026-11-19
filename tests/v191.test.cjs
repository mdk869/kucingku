const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.1: Jagaan rutin (c.care), masuk Fokus hari ini, Jadual, profil dan PDF.
const mk = (care, extra = {}) => { const probe = app(); const T = probe.run('td()'); const add = n => probe.run(`addD('${T}',${n})`);
  return { T, add, a: app({ data: { cats: [{ id: 'a', name: 'Mimi', sex: 'Betina', dob: add(-300), care: care(add, T), ...extra }], recs: [], vets: [], bk: 0 } }) }; };

test('version is 1.9.1', () => {
  const a = app();
  assert.equal(a.json('VER'), '1.9.1');
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
  a.run("careDone('a','k1')");
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
  assert.match(v, /class="tabs tg"/);
  const order = [...v.matchAll(/data-tab="(\w+)"/g)].map(m => m[1]);
  assert.deepEqual(order, ['berat', 'vaksin', 'cacing', 'jagaan', 'lawatan', 'sihat']);
  assert.match(v, /class="on" role="tab" aria-selected="true" data-action="tab" data-tab="jagaan"/);
});
