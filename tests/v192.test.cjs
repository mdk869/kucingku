const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.2: Ringkasan kesihatan pintar (peraturan tetap, tanpa AI).
const world = (cat, recs = [], vets = []) => { const p = app(); const T = p.run('td()'); const add = n => p.run(`addD('${T}',${n})`);
  const c = typeof cat === 'function' ? cat(add) : cat; const r = typeof recs === 'function' ? recs(add) : recs;
  return { a: app({ data: { cats: [{ id: 'a', name: 'Oyen', sex: 'Jantan', ...c }], recs: r, vets, bk: 0 } }), add, T }; };
const W = (add, d, v, i) => ({ id: 'w' + i, cat: 'a', type: 'berat', date: add(d), val: v });
const kinds = a => a.json("hAlerts(S.cats[0]).map(x=>x.k+':'+x.lv+':'+x.t)");

test('three drops in a row raise a weight alert (and do not double with the monthly rule)', () => {
  const { a } = world(add => ({ dob: add(-1200) }), add => [W(add, -21, 3400, 1), W(add, -14, 3300, 2), W(add, -7, 3200, 3), W(add, 0, 3100, 4)]);
  const k = kinds(a);
  assert.deepEqual(k.filter(x => x.startsWith('berat')), ['berat:bad:Berat turun 3 kali berturut-turut']);
  assert.match(a.json('hAlerts(S.cats[0])[0].s'), /3\.4 kg → 3\.1 kg/);
});

test('a drop of more than 10% within a month is flagged; small drops are not', () => {
  const big = world(add => ({ dob: add(-1200) }), add => [W(add, -20, 4000, 1), W(add, 0, 3500, 2)]);
  assert.ok(kinds(big.a).includes('berat:bad:Berat turun 13% dalam sebulan'));
  const small = world(add => ({ dob: add(-1200) }), add => [W(add, -20, 4000, 1), W(add, 0, 3800, 2)]);
  assert.equal(kinds(small.a).filter(x => x.startsWith('berat')).length, 0);
});

test('a rise of more than 15% is flagged only for adult cats, never for growing kittens', () => {
  const adult = world(add => ({ dob: add(-1200) }), add => [W(add, -25, 4000, 1), W(add, 0, 4700, 2)]);
  assert.ok(kinds(adult.a).includes('berat:bad:Berat naik 18% dalam sebulan'));
  const kitten = world(add => ({ dob: add(-100) }), add => [W(add, -25, 900, 1), W(add, 0, 1400, 2)]);
  assert.equal(kinds(kitten.a).filter(x => x.startsWith('berat')).length, 0);
});

test('old weigh-ins (over 60 days) do not trigger weight-change alerts', () => {
  const { a } = world(add => ({ dob: add(-1200) }), add => [W(add, -120, 4000, 1), W(add, -100, 3000, 2)]);
  assert.equal(kinds(a).filter(x => x.startsWith('berat')).length, 0);
});

test('overdue weigh-in, vaccine, deworming and routine care become warnings', () => {
  const { a } = world(add => ({ dob: add(-1200), care: [{ id: 'k1', k: 'kuku', iv: 14, last: add(-20) }] }),
    add => [W(add, -40, 4000, 1), { id: 'v', cat: 'a', type: 'vaksin', date: add(-1200 + 70), name: 'F3' }, { id: 'd', cat: 'a', type: 'cacing', date: add(-100), name: 'Drontal' }]);
  const k = kinds(a);
  assert.ok(k.some(x => x.startsWith('timbang:warn:Belum timbang 5 minggu')), k.join('|'));
  assert.ok(k.some(x => /^vaksin:warn:Vaksin core lewat \d+ hari$/.test(x)), k.join('|'));
  assert.ok(k.some(x => /^cacing:warn:Ubat cacing lewat \d+ hari$/.test(x)), k.join('|'));
  assert.ok(k.includes('jagaan:warn:Jagaan rutin lewat'));
});

test('Home shows the summary card only when something needs attention; it links to the cat', () => {
  const calm = world(add => ({ dob: add(-1200) }), add => [W(add, 0, 4000, 1), { id: 'v', cat: 'a', type: 'vaksin', date: add(-10), name: 'F3' }, { id: 'd', cat: 'a', type: 'cacing', date: add(-10), name: 'Drontal' }]);
  assert.deepEqual(kinds(calm.a), []);
  assert.doesNotMatch(calm.a.json('home()'), /Ringkasan kesihatan/);
  const { a } = world(add => ({ dob: add(-1200) }), add => [W(add, -20, 4000, 1), W(add, 0, 3500, 2)]);
  const h = a.json('home()');
  assert.match(h, /Ringkasan kesihatan[\s\S]*perlu perhatian[\s\S]*data-action="openCat" data-id="a"[\s\S]*Oyen:/);
});

test('profile card shows four tiles, the alerts, Telefon vet and Timbang sekarang', () => {
  const { a } = world(add => ({ dob: add(-1200) }), add => [W(add, -20, 4000, 1), W(add, 0, 3500, 2)], [{ id: 'v1', name: 'Klinik', tel: '03-1234 5678', main: true }]);
  a.run("cid='a';tab='berat'");
  const v = a.json('catv()');
  for (const t of ['Ringkasan kesihatan', 'Berat', 'Vaksin', 'Ubat cacing', 'Jagaan rutin', 'Telefon vet', 'href="tel:0312345678"', 'Timbang sekarang', 'Bila amaran keluar?']) assert.ok(v.includes(t), t);
});

test('English translates the dynamic alert texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('2 perlu perhatian'), '2 need attention');
  assert.equal(t('Berat turun 13% dalam sebulan'), 'Weight dropped 13% in a month');
  assert.equal(t('Belum timbang 5 minggu'), 'Not weighed for 5 weeks');
  assert.equal(t('Vaksin core lewat 3 hari'), 'Core vaccine overdue by 3 days');
  assert.equal(t('Untuk umur ini, timbang setiap bulan.'), 'At this age, weigh every month.');
  assert.equal(t('4 kg → 3.5 kg. Pertimbangkan untuk jumpa vet.'), '4 kg → 3.5 kg. Consider seeing a vet.');
});
