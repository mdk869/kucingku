const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, seed } = require('./helpers.cjs');

const click = (a, dataset) => a.events.click({ preventDefault() {}, target: { closest: () => ({ dataset }) } });
const SK = 'kucingku-settings-v1';

test('settings default to Bahasa Melayu, 30-day backup reminder and automatic weight unit', () => {
  const a = app();
  assert.deepEqual(a.json('SET'), { lang: 'ms', bk: 30, unit: 'auto', scheme: 'sakura', mode: 'system' });
  assert.equal(a.settings(), null);
});

test('settings use their own storage key and never enter the data or backups', () => {
  const a = app();
  const before = a.storage();
  a.run("setUnit('kg');setLang('en');setBk(14)");
  assert.deepEqual(JSON.parse(a.settings()), { v: 1, lang: 'en', bk: 14, unit: 'kg', scheme: 'sakura', mode: 'system' });
  assert.equal(a.storage(), before);
  assert.deepEqual(a.json('Object.keys(S)'), ['version', 'cats', 'recs', 'vets', 'bk']);
});

test('saved settings are restored and invalid stored values are ignored', () => {
  assert.deepEqual(app({ settings: { v: 1, lang: 'en', bk: 60, unit: 'g' } }).json('SET'), { lang: 'en', bk: 60, unit: 'g', scheme: 'sakura', mode: 'system' });
  assert.deepEqual(app({ settings: { v: 1, lang: 'fr', bk: 7, unit: 'pound' } }).json('SET'), { lang: 'ms', bk: 30, unit: 'auto', scheme: 'sakura', mode: 'system' });
  assert.deepEqual(app({ settings: { lang: 'en', bk: 14, unit: 'kg' } }).json('SET'), { lang: 'ms', bk: 30, unit: 'auto', scheme: 'sakura', mode: 'system' }, 'object without the version marker');
});

test('a failed settings write keeps the previous value and tells the user', () => {
  const a = app({ failSave: true });
  a.run("setUnit('kg')");
  assert.equal(a.json('SET.unit'), 'auto');
  assert.match(a.json('messages.at(-1)'), /Gagal menyimpan tetapan/);
});

test('setters reject values outside the allowed lists', () => {
  const a = app();
  a.run("setUnit('stone');setLang('fr');setBk(7)");
  assert.deepEqual(a.json('SET'), { lang: 'ms', bk: 30, unit: 'auto', scheme: 'sakura', mode: 'system' });
  assert.equal(a.settings(), null);
});

test('settings categories open through delegated events and go() returns to the list', () => {
  const a = app();
  click(a, { action: 'go', view: 'set' });
  assert.match(a.elements.get('#app').innerHTML, /data-v="umum"[\s\S]*data-v="peringatan"[\s\S]*data-v="data"[\s\S]*data-v="tentang"/);
  assert.doesNotMatch(a.elements.get('#app').innerHTML, /data-action="setLang"/);
  click(a, { action: 'setGo', v: 'umum' });
  assert.match(a.elements.get('#app').innerHTML, /data-action="setLang"[\s\S]*data-action="setUnit"/);
  click(a, { action: 'setUnit', v: 'kg' });
  assert.equal(a.json('SET.unit'), 'kg');
  click(a, { action: 'go', view: 'more' });
  click(a, { action: 'go', view: 'set' });
  assert.equal(a.json('ssub'), '');
});

test('the Data category holds backup, import and delete-all; the old Backup page is gone', () => {
  const a = app();
  click(a, { action: 'goData' });
  const html = a.elements.get('#app').innerHTML;
  for (const action of ['exportBk', 'copyBk', 'impBk', 'wipe']) assert.match(html, new RegExp('data-action="' + action + '"'));
  assert.match(html, /data-change="impFile"/);
  assert.doesNotMatch(a.json('morev()'), /Backup/);
  assert.equal(a.json("typeof bkv"), 'undefined');
});

test('delete-all and import replace data but leave settings untouched', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 14, unit: 'kg', scheme: 'sakura', mode: 'system' } });
  a.run("wipe()");
  assert.match(a.elements.get('#sh').innerHTML, /Padam semua data\?/);
  a.run('_ask()');
  assert.equal(a.json('S.cats.length'), 0);
  assert.equal(JSON.parse(a.storage()).cats.length, 0);
  assert.deepEqual(a.json('SET'), { lang: 'en', bk: 14, unit: 'kg', scheme: 'sakura', mode: 'system' });
  a.run(`impTxt(${JSON.stringify(JSON.stringify({ version: 2, cats: [{ id: 'z', name: 'Zed' }], recs: [], vets: [], bk: 0 }))})`);
  a.run('_ask()');
  assert.equal(a.json('S.cats[0].name'), 'Zed');
  assert.deepEqual(a.json('SET'), { lang: 'en', bk: 14, unit: 'kg', scheme: 'sakura', mode: 'system' });
});

test('backup reminder follows the setting (off, 14, 30 and 60 days)', () => {
  const a = app();
  const days = n => `S.bk=Date.now()-${n}*864e5`;
  a.run('S.bk=0');
  assert.equal(a.json('bkOld()'), true);
  for (const [setting, age, expected] of [[30, 20, false], [30, 40, true], [14, 20, true], [60, 40, false], [0, 400, false]]) {
    a.run(`SET.bk=${setting};${days(age)}`);
    assert.equal(a.json('bkOld()'), expected, `${setting}-day reminder, backup ${age} days old`);
  }
  a.run('SET.bk=0');
  assert.match(a.json('bkBody()'), /Peringatan mati/);
});

test('weights display in grams below 1000 g and kilograms from 1000 g in automatic mode', () => {
  const a = app();
  assert.deepEqual(a.json("[85,650,999,1000,1250,3255,3400].map(fw)"), ['85 g', '650 g', '999 g', '1 kg', '1.25 kg', '3.255 kg', '3.4 kg']);
});

test('fixed units override the automatic display rule', () => {
  const a = app();
  a.run("SET.unit='g'");
  assert.deepEqual(a.json("[85,3400].map(fw)"), ['85 g', '3400 g']);
  a.run("SET.unit='kg'");
  assert.deepEqual(a.json("[85,650,3400].map(fw)"), ['0.085 kg', '0.65 kg', '3.4 kg']);
});

test('weight input is read in the unit chosen in Settings, with one rule per mode', () => {
  const a = app();
  const read = (unit, v) => { a.run(`SET.unit='${unit}'`); return a.json(`wG({val:${JSON.stringify(v)}},'val')`); };
  assert.deepEqual(['3.4', '650', '85', '19.9', '20', '0', 'abc', ''].map(v => read('auto', v)), [3400, 650, 85, 19900, 20, 0, 0, 0]);
  assert.deepEqual(['650', '3.4', '0.4', '30000', '30001'].map(v => read('g', v)), [650, 3, 0, 30000, 0]);
  assert.deepEqual(['0.7', '30', '30.001', '700', '0.0004'].map(v => read('kg', v)), [700, 30000, 0, 0, 0]);
});

test('weight field label, pre-filled value and hint follow the unit setting', () => {
  const a = app();
  assert.equal(a.json('wLbl()'), 'Berat');
  assert.match(a.json("wIn('val',3400)"), /value="3\.4"/);
  assert.match(a.json("wIn('val',650)"), /value="650"/);
  assert.match(a.json("wIn('val',0)"), /Cth\. 650 g atau 3\.4 kg\./);
  a.run("SET.unit='g'");
  assert.equal(a.json('wLbl()'), 'Berat (g)');
  assert.match(a.json("wIn('val',3400)"), /value="3400"/);
  assert.doesNotMatch(a.json("wIn('val',0)"), /Cth\. 650 g/);
  a.run("SET.unit='kg'");
  assert.equal(a.json('wLbl()'), 'Berat (kg)');
  assert.match(a.json("wIn('val',650)"), /value="0\.65"/);
  assert.doesNotMatch(a.json("wIn('val',650)"), /<select|name="val_u"/);
});

test('live weight hint shows how the value will be recorded', () => {
  const a = app();
  const hint = value => { a.run(`wHint({name:'val',value:${JSON.stringify(value)}})`); return a.elements.get('#wh_val').textContent; };
  assert.equal(hint('3.4'), 'Direkod: 3.4 kg');
  assert.equal(hint('650'), 'Direkod: 650 g');
  assert.match(hint(''), /Cth\. 650 g/);
});

test('saving weights uses the Settings unit and rejects values outside 1 g to 30 kg', () => {
  const a = app();
  const save = (unit, val) => { a.run(`SET.unit='${unit}'`); a.submit('saveRec', { date: a.run('td()'), val }, "'','berat'"); };
  save('auto', '3.4'); save('auto', '650'); save('kg', '0.7'); save('g', '85');
  assert.deepEqual(a.json('S.recs.map(r=>r.val)'), [3400, 650, 700, 85]);
  save('kg', '700'); save('g', '0.4'); save('auto', 'oops');
  assert.equal(a.json('S.recs.length'), 4);
  assert.match(a.json('messages.at(-1)'), /mesti antara 1 g hingga 30 kg/);
});

test('quick weigh-in and the add-weight form carry no unit selector', () => {
  const a = app({ data: { ...seed, cats: [...seed.cats, { id: 'b', name: 'B' }] } });
  a.run('quickW()');
  const html = a.elements.get('#sh').innerHTML;
  assert.doesNotMatch(html, /<select|_u"/);
  assert.equal((html.match(/data-input="wHint"/g) || []).length, 2);
  a.run("tab='berat';recForm()");
  assert.doesNotMatch(a.elements.get('#sh').innerHTML, /<select/);
});

test('every select option carries an explicit value so translated labels never change stored data', () => {
  const a = app();
  a.run("try{catForm('a')}catch(e){}"); // liveAge needs a real DOM form
  const forms = [a.elements.get('#sh').innerHTML];
  a.run("try{catForm()}catch(e){}"); forms.push(a.elements.get('#sh').innerHTML);
  for (const html of forms) assert.doesNotMatch(html, /<option(?![^>]*\bvalue=)/);
});

test('quick weigh-in lists each cat with last weight and a live hint that falls back to it', () => {
  const a = app({ data: { version: 2, bk: 0, cats: [{ id: 'a', name: 'Oreo', sex: 'Jantan', dob: '2026-06-01' }, { id: 'b', name: 'Ibu', sex: 'Betina', dob: '2024-01-01' }], vets: [], recs: [{ id: 'r1', cat: 'a', type: 'berat', date: '2026-10-05', val: 900 }] } });
  a.run('quickW()');
  const html = a.elements.get('#sh').innerHTML;
  assert.match(html, /name="w_a"[^>]*placeholder="0"/);
  assert.match(html, /id="wh_w_a" data-d="Terakhir: 900 g">Terakhir: 900 g/);
  assert.match(html, /id="wh_w_b" data-d="Belum ditimbang">Belum ditimbang/);
  assert.equal((html.match(/Cth\. 650 g/g) || []).length, 1);
  a.run(`wHint({name:'w_a',value:'1.2',dataset:{}})`);
  assert.equal(a.elements.get('#wh_w_a').textContent, 'Direkod: 1.2 kg');
});
