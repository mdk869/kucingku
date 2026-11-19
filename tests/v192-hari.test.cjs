const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.2: Hari istimewa (hari lahir & ulang tahun mula dibela).
const mk = cat => { const p = app(); const T = p.run('td()'); const yearsAgo = n => (+T.slice(0, 4) - n) + T.slice(4);
  return { a: app({ data: { cats: [{ id: 'a', name: 'Mimi', sex: 'Betina', ...cat(yearsAgo, T) }], recs: [], vets: [], bk: 0 } }), T, yearsAgo }; };

test('birthday and adoption anniversary show on Home on the day, with the number of years', () => {
  const { a } = mk(y => ({ dob: y(2), adopt: y(1) }));
  const h = a.json('home()');
  assert.match(h, /Hari lahir Mimi! 2 tahun/);
  assert.match(h, /1 tahun Mimi bersama anda/);
  assert.match(h, /data-action="spShare" data-id="a" data-k="lahir"/);
});

test('no card on other days, on the day of birth itself, or for a 29 Feb birthday outside 28 Feb in non-leap years', () => {
  const other = mk((y, T) => ({ dob: (+T.slice(0, 4) - 2) + '-' + (T.slice(5, 7) === '01' ? '02' : '01') + '-15' }));
  assert.doesNotMatch(other.a.json('home()'), /Hari istimewa/);
  const born = mk((y, T) => ({ dob: T }));
  assert.doesNotMatch(born.a.json('home()'), /Hari istimewa/);
  const a = app();
  assert.equal(a.run("isDay('2024-02-29','2027-02-28')"), true);
  assert.equal(a.run("isDay('2024-02-29','2028-02-28')"), false);
  assert.equal(a.run("isDay('2024-02-29','2028-02-29')"), true);
});

test('closing the card hides it for the rest of the day only', () => {
  const { a } = mk(y => ({ dob: y(3) }));
  a.run("spHide('a','lahir')");
  assert.doesNotMatch(a.json('home()'), /Hari lahir Mimi/);
  a.run("localStorage.setItem('kucingku-seen-day-v1',JSON.stringify({d:'2000-01-01',k:['a:lahir']}))");
  assert.match(a.json('home()'), /Hari lahir Mimi/);
});

test('adoption day is saved from the profile form, validated, can be cleared and survives backup cleaning', () => {
  const { a, T, yearsAgo } = mk(y => ({ dob: y(3) }));
  a.run("try{catForm('a')}catch(e){}");
  assert.match(a.elements.get('#sh').innerHTML, /name="adopt"/);
  const base = { name: 'Mimi', sex: 'Betina', dob: yearsAgo(3), dobx: 'Tepat', brs: '', pattern: '', chip: '', note: '' };
  a.submit('saveCat', { ...base, adopt: yearsAgo(4) }, "'a'");
  assert.equal(a.json('messages.at(-1)'), 'Hari mula dibela mesti selepas tarikh lahir');
  a.submit('saveCat', { ...base, adopt: '2999-01-01' }, "'a'");
  assert.equal(a.json('messages.at(-1)'), 'Masukkan tarikh hari ini atau sebelumnya');
  a.submit('saveCat', { ...base, adopt: yearsAgo(2) }, "'a'");
  assert.equal(a.json('S.cats[0].adopt'), yearsAgo(2));
  assert.equal(JSON.parse(a.storage()).cats[0].adopt, yearsAgo(2));
  a.run("cid='a';tab='berat'");
  assert.match(a.json('catv()'), /Mula dibela[\s\S]*2 tahun bersama/);
  a.submit('saveCat', { ...base, adopt: '' }, "'a'");
  assert.equal(a.run('S.cats[0].adopt'), undefined);
  const b = app({ data: { cats: [{ id: 'a', name: 'X', adopt: 'semalam' }], recs: [], vets: [], bk: 0 } });
  assert.equal(b.run('S.cats[0].adopt'), undefined);
});

test('the share sheet offers an adoption-day card when the adoption day is known', () => {
  const { a } = mk(y => ({ dob: y(3), adopt: y(2) }));
  a.run("spShare('a','bela')");
  const sh = a.elements.get('#sh').innerHTML;
  assert.match(sh, /data-v="bela"/); assert.match(sh, /2 tahun bersama!/); assert.match(sh, /Sejak /);
});

test('English translates the special-day texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('Hari lahir Mimi! 2 tahun'), "Mimi's birthday! 2 years");
  assert.equal(t('1 tahun Mimi bersama anda'), '1 year with Mimi');
  assert.equal(t('3 tahun bersama!'), '3 years together!');
  assert.equal(t('Hari istimewa'), 'Special day');
});
