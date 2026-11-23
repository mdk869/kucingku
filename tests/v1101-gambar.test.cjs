const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { app } = require('./helpers.cjs');
const fixture = n => fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8');

test('profile form shows a round photo preview with Tukar gambar / Buang', () => {
  const a = app({ data: JSON.parse(fixture('backup-v1.8.json')) });
  a.run("try{catForm('oreo1')}catch(e){}");
  const h = a.elements.get('#sh').innerHTML;
  assert.match(h, /class="pha" id="phav"><img/);
  assert.match(h, /Tukar gambar<input type="file" accept="image\/\*" data-change="pic" class="vh">/);
  assert.match(h, /data-action="picDel">Buang</);
  assert.match(h, /id="phsz">\d+ KB</);
  a.run("try{catForm('mochi2')}catch(e){}");
  const h2 = a.elements.get('#sh').innerHTML;
  assert.match(h2, /Pilih gambar<input/);
  assert.doesNotMatch(h2, /picDel/);
  assert.match(h2, /id="phsz"><\/small>/);
});

test('crop sheet actions are wired and output is a square 400 px photo', () => {
  const a = app();
  for (const k of ['crRot', 'crNo', 'crOk']) assert.equal(a.run(`typeof clickActions.${k}`), 'function', k);
  assert.equal(a.run('PHO'), 400);
  assert.equal(a.run("phKB('data:image/jpeg;base64,'+'A'.repeat(40960))"), '30 KB');
  assert.equal(a.run('crOk()'), undefined, 'no crash when nothing is open');
});

test('crop texts are translated', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  assert.deepEqual(a.json('["Laraskan gambar","Guna gambar","Tukar gambar","Pilih gambar","Buang","Putar","Jadual ubat"].map(trs)'), ['Adjust photo', 'Use photo', 'Change photo', 'Choose photo', 'Remove', 'Rotate', 'Medicine schedule']);
});
