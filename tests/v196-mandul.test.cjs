const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.4: pemandulan boleh direkod dengan tarikh lampau, ditukar atau dipadam.
// Punca: pengguna Threads bertanya cara merekod kucing yang dimandulkan 5 tahun lalu.

const cats = (ms, dob = '2020-03-01') => ({ cats: [{ id: 'a', name: 'Mimi', sex: 'Betina', dob, ...(ms ? { ms } : {}) }], recs: [], vets: [], bk: 0 });
const sh = a => a.elements.get('#sh').innerHTML;
const form = v => `({md:{value:${JSON.stringify(v)}}})`;

test('tapping the Pemandulan tile opens a date sheet instead of marking today', () => {
  const a = app({ data: cats() });
  a.run("cid='a';tileGo('md')");
  assert.equal(a.run('cat("a").ms===undefined'), true, 'nothing saved just by tapping');
  const h = sh(a);
  assert.match(h, /data-submit="md"/);
  assert.match(h, /Bila Mimi dimandulkan\?/);
  assert.match(h, new RegExp(`name="md" type="date" required max="${a.run('td()')}" min="2020-03-01" value="${a.run('td()')}"`));
  assert.match(h, /Tak ingat tarikh tepat\?/);
  assert.doesNotMatch(h, /mdDel/, 'no delete button before anything is recorded');
});

test('a date from years ago can be saved, and shows on the tile and the profile', () => {
  const a = app({ data: cats() });
  a.run(`cid='a';saveMd({},${form('2021-06-15')})`);
  assert.equal(a.json('cat("a").ms.md'), '2021-06-15');
  assert.deepEqual(a.json('messages'), ['Pemandulan direkod']);
  const tile = a.json('sched(cat("a"))').find(x => x.k === 'md');
  assert.equal(tile.ok, true);
  assert.match(tile.a, /^Selesai /);
  assert.match(a.json('pcard(cat("a"))'), /Pemandulan/);
});

test('an existing record can be changed or deleted', () => {
  const a = app({ data: cats({ md: '2021-06-15' }) });
  a.run("cid='a';mdForm()");
  assert.match(sh(a), /value="2021-06-15"/);
  assert.match(sh(a), /Tukar tarikh jika perlu/);
  assert.match(sh(a), /data-action="mdDel"/);
  a.run(`saveMd({},${form('2022-01-01')})`);
  assert.equal(a.json('cat("a").ms.md'), '2022-01-01');
  a.run('mdDel();_ask()');
  assert.equal(a.run('cat("a").ms===undefined'), true);
  assert.equal(a.json('messages').at(-1), 'Rekod pemandulan dipadam');
});

test('future dates and dates before birth are refused', () => {
  const a = app({ data: cats() });
  a.run("cid='a'");
  a.run(`saveMd({},${form('2099-01-01')})`);
  a.run(`saveMd({},${form('2019-01-01')})`);
  a.run(`saveMd({},${form('')})`);
  assert.equal(a.run('cat("a").ms===undefined'), true);
  assert.deepEqual(a.json('messages'), ['Masukkan tarikh pemandulan yang sah, hari ini atau sebelumnya', 'Tarikh pemandulan mesti selepas tarikh lahir', 'Pilih tarikh pemandulan']);
});

test('Edit profil can record it too, even without a date of birth', () => {
  const a = app({ data: cats(null, '') });
  assert.equal(a.run('msT(cat("a"))'), '', 'no health schedule without a date of birth');
  const fd = o => `({preventDefault(){},target:{}})`;
  a.run(`FormData=function(){return {[Symbol.iterator]:function*(){yield*Object.entries({name:'Mimi',sex:'Betina',dob:'',dobx:'Tepat',adopt:'',md:'2019-05-05',brs:'',brx:'',pattern:'',chip:'',note:''})}}}`);
  a.run(`saveCat(${fd()},'a')`);
  assert.equal(a.json('cat("a").ms.md'), '2019-05-05');
  assert.equal(a.run('cat("a").md===undefined'), true, 'the form field is not stored as a loose property');
  a.run(`FormData=function(){return {[Symbol.iterator]:function*(){yield*Object.entries({name:'Mimi',sex:'Betina',dob:'',dobx:'Tepat',adopt:'',md:'',brs:'',brx:'',pattern:'',chip:'',note:''})}}}`);
  a.run(`saveCat(${fd()},'a')`);
  assert.equal(a.run('cat("a").ms===undefined'), true, 'clearing the field removes the record');
});

test('the neutering date survives a backup round trip', () => {
  const a = app({ data: cats({ md: '2021-06-15' }) });
  const out = a.json('clean(S)');
  assert.equal(out.cats[0].ms.md, '2021-06-15');
});

test('English translates the neutering sheet', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('Bila Mimi dimandulkan?'), 'When was Mimi neutered / spayed?');
  assert.equal(t('Pemandulan direkod'), 'Neutering recorded');
  assert.equal(t('Tarikh pemandulan (pilihan)'), 'Neutering / spaying date (optional)');
  assert.equal(t('Padam rekod pemandulan ini?'), 'Delete this neutering record?');
});
