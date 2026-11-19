const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.3: Kongsi kad profil sebagai gambar; popup kemas kini menggabungkan semua versi yang terlepas.
const mk = (cat = {}, recs = []) => { const p = app(); const T = p.run('td()'); const add = n => p.run(`addD('${T}',${n})`);
  const c = typeof cat === 'function' ? cat(add) : cat; const r = typeof recs === 'function' ? recs(add) : recs;
  return { a: app({ data: { cats: [{ id: 'a', name: 'Mimi', sex: 'Betina', chip: '900123456789', breed: 'Domestik', pattern: 'Calico', ...c }], recs: r, vets: [{ id: 'v1', name: 'Klinik Rahsia', tel: '03-9999 0000', main: true }], bk: 0 } }), add }; };

test('card ages read naturally: weeks, months, then years and months', () => {
  for (const [days, re] of [[30, /^4 minggu$/], [200, /^6 bulan$/], [365, /^1 tahun$/], [500, /^1 tahun 4 bulan$/]]) {
    const { a } = mk(add => ({ dob: add(-days) }));
    assert.match(a.json('kAge(S.cats[0])'), re, String(days));
  }
});

test('profile card never contains the microchip number or the vet, and follows the chosen fields', () => {
  const { a } = mk(add => ({ dob: add(-400) }), add => [{ id: 'w', cat: 'a', type: 'berat', date: add(0), val: 3200 }]);
  a.run("kOpt={id:'a',m:'profil',f:['umur','baka']}");
  let h = a.json('kcard(S.cats[0],kOpt)');
  assert.doesNotMatch(h, /900123456789|Klinik Rahsia|03-9999/);
  assert.match(h, /Domestik/); assert.doesNotMatch(h, /3\.2 kg/); assert.match(h, /Dibuat dengan/);
  a.run("kField({value:'berat',checked:true})");
  h = a.json('kcard(S.cats[0],kOpt)');
  assert.match(h, /3\.2 kg/);
  a.run("kField({value:'bogus',checked:true})");
  assert.deepEqual(a.json('kOpt.f'), ['umur', 'baka', 'berat']);
});

test('birthday card has the greeting and age; it is only offered when the date of birth is known', () => {
  const { a } = mk(add => ({ dob: add(-365) }));
  a.run("kOpt={id:'a',m:'lahir',f:[]}");
  const h = a.json('kcard(S.cats[0],kOpt)');
  assert.match(h, /Selamat hari lahir!/); assert.match(h, /1 tahun/); assert.match(h, /class="kp kl"/);
  a.run("cardForm('a')");
  assert.match(a.elements.get('#sh').innerHTML, /data-action="kMode" data-v="lahir"/);
  const b = mk({});
  b.a.run("cardForm('a')");
  assert.doesNotMatch(b.a.elements.get('#sh').innerHTML, /data-v="lahir"/);
});

test('male cats get the blue card and the profile has a Kongsi kad button', () => {
  const { a } = mk({ sex: 'Jantan' });
  a.run("kOpt={id:'a',m:'profil',f:['umur']}");
  assert.match(a.json('kcard(S.cats[0],kOpt)'), /class="kp j"/);
  a.run("cid='a';tab='berat'");
  assert.match(a.json('catv()'), /data-action="cardForm" data-id="a"[^>]*>[\s\S]*Kongsi kad/);
});

test('the update popup lists every version the phone missed, newest first', () => {
  const a = app();
  const v = a.json('VER');
  a.run(`CL=[{v:'9.9.2',d:'2026-12-02',i:[{t:'new',ms:'Kedua',en:'Second'}]},{v:'9.9.1',d:'2026-12-01',i:[{t:'fix',ms:'Pertama',en:'First'}]},{v:'${v}',d:'2026-11-19',i:[{t:'new',ms:'Semasa',en:'Current'}]}];updW={postMessage(){}};updV=CL.filter(x=>vGt(x.v,VER));updShow()`);
  const sh = a.elements.get('#sh').innerHTML;
  assert.match(sh, /v9\.9\.2/); assert.match(sh, /Kedua[\s\S]*Pertama/); assert.doesNotMatch(sh, /Semasa/);
});

test('English translates the card texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('Kongsi kad Mimi'), "Share Mimi's card");
  assert.equal(t('1 tahun 4 bulan'), '1 year 4 months');
  assert.equal(t('6 bulan'), '6 months');
  assert.equal(t('Selamat hari lahir!'), 'Happy birthday!');
});
