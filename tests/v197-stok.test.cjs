const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.5: Stok lebih kemas. Nama sendiri, kucing yang makan, bilangan beg,
// peralihan jenama 7 hari, dan peringatan kitten setahun.

const ago = (a, n) => a.run(`addD(td(),-${n})`);
const base = a => ({ cats: [{ id: 'm1', name: 'Mochi', sex: 'Jantan', dob: a ? a : '2025-01-01' }, { id: 'mm', name: 'Mama', sex: 'Betina', dob: '2022-01-01' }], recs: [], vets: [], bk: 0 });
const sh = a => a.elements.get('#sh').innerHTML;
const withStock = (stock, dob) => { const a0 = app(); const d = base(dob); d.stock = stock(a0); return app({ data: d }); };

test('backups keep the new stock fields and drop broken ones', () => {
  const a = app();
  const T = a.run('td()');
  const out = a.json(`clean(${JSON.stringify({ cats: [{ id: 'm1', name: 'Mochi' }], recs: [], vets: [], bk: 0, stock: [{ id: 's1', k: 'kering', name: 'Kibble kitten', brand: 'B', est: 14, cats: ['m1', 'ghost', 'm1', 5], tr: { f: 'A', t: 'B', d: T }, buys: [{ id: 'b1', date: T, n: 3, tr: 1 }, { id: 'b2', date: T, n: 40 }] }, { id: 's2', k: 'pasir', est: 21, tr: { t: '', d: T }, buys: [] }] })})`);
  const [x, y] = out.stock;
  assert.equal(x.name, 'Kibble kitten', 'a name is kept for food too, not just Lain-lain');
  assert.deepEqual(x.cats, ['m1'], 'only cats that exist, once each');
  assert.deepEqual(x.tr, { f: 'A', t: 'B', d: T });
  assert.equal(x.buys[0].n, 3);
  assert.equal(x.buys[0].tr, 1);
  assert.equal(x.buys[1].n, undefined, 'a silly bag count is dropped');
  assert.equal(y.tr, undefined);
});

test('lasting time is learned per bag, and a brand switch does not spoil the average', () => {
  const a = withStock(a0 => [{ id: 's1', k: 'kering', est: 30, buys: [{ id: 'b1', date: ago(a0, 90), n: 2 }, { id: 'b2', date: ago(a0, 62), n: 2 }, { id: 'b3', date: ago(a0, 50), tr: 1 }, { id: 'b4', date: ago(a0, 2) }] }]);
  const i = a.json('stInfo(S.stock[0])');
  assert.equal(i.per, 14, '28 days for 2 bags = 14 days a bag; the switch intervals are skipped');
  assert.equal(i.n, 1);
  assert.equal(i.left, 12);
  const b = withStock(a0 => [{ id: 's1', k: 'kering', est: 30, buys: [{ id: 'b1', date: ago(a0, 40) }, { id: 'b2', date: ago(a0, 20), n: 3 }] }]);
  const j = b.json('stInfo(S.stock[0])');
  assert.equal(j.tahan, 60, '3 bags last three times as long');
  assert.match(b.json('stokv()'), /Biasanya tahan ±60 hari <span>\(untuk 3 beg\)<\/span>/);
  assert.match(b.json('stokv()'), /3 beg · dibeli|3 × /);
});

test('buying a different brand starts a 7-day switch unless "just this once" is chosen', () => {
  const mk = () => withStock(a0 => [{ id: 's1', k: 'kering', name: 'Kibble kitten', brand: 'Brand A', est: 14, buys: [{ id: 'b1', date: ago(a0, 10), cost: 40 }] }]);
  const a = mk();
  a.run("buyForm('s1')");
  assert.match(sh(a), /data-was="Brand A"/);
  assert.match(sh(a), /class="trq" hidden/);
  assert.match(sh(a), /name="cost"[^>]*value="40"/, 'last cost is filled in');
  const T = a.run('td()');
  a.submit('saveBuy', { brand: 'Brand B', var: 'kitten', qty: '1.5 kg', cost: '25', date: T, n: '1', tr: '1' }, "'s1'");
  assert.equal(a.json('S.stock[0].brand'), 'Brand B');
  assert.deepEqual(a.json('S.stock[0].tr'), { f: 'Brand A', t: 'Brand B', d: T });
  assert.equal(a.json('S.stock[0].buys.at(-1).tr'), 1);
  const b = mk();
  b.submit('saveBuy', { brand: 'Brand C', var: '', qty: '', cost: '', date: T, n: '2', tr: '0' }, "'s1'");
  assert.equal(b.json('S.stock[0].brand'), 'Brand A', 'the usual brand stays');
  assert.equal(b.run('S.stock[0].tr===undefined'), true);
  const lb = b.json('S.stock[0].buys.at(-1)');
  assert.equal(lb.brand, 'Brand C');
  assert.equal(lb.n, 2);
  assert.equal(lb.tr, undefined);
  b.submit('saveBuy', { brand: 'Brand A', date: T, n: '12' }, "'s1'");
  assert.equal(b.json('messages').at(-1), 'Bilangan mesti antara 1 hingga 9');
});

test('litter does not ask about a brand switch', () => {
  const a = withStock(a0 => [{ id: 's3', k: 'pasir', brand: 'P', est: 21, buys: [{ id: 'b1', date: ago(a0, 5) }] }]);
  a.run("buyForm('s3')");
  assert.doesNotMatch(sh(a), /class="trq"/);
});

test('the Home card shows the day, today\'s mix and the 4-step guide; it ends by itself after day 7', () => {
  const a = withStock(a0 => [{ id: 's1', k: 'kering', name: 'Kibble kitten', brand: 'B', est: 14, tr: { f: 'A', t: 'B', d: ago(a0, 2) }, buys: [{ id: 'b1', date: ago(a0, 2), tr: 1 }] }]);
  const h = a.json('trHome()');
  assert.match(h, /Peralihan makanan · Hari 3 \/ 7/);
  assert.match(h, /Kibble kitten: A → B/);
  assert.match(h, /50% lama \+ 50% baharu/);
  assert.match(h, /class="on"><small>Hari 3–4<\/small><b>50 · 50<\/b>/);
  assert.match(h, /rujuk vet/);
  assert.match(a.json('home()'), /class="card trh"/);
  assert.match(a.json('stokv()'), /Peralihan ke B<\/b> · <span>Hari 3 \/ 7/);
  a.run('S.stock[0].tr.d=addD(td(),-6)');
  assert.match(a.json('trHome()'), /100% baharu/);
  a.run('S.stock[0].tr.d=addD(td(),-7)');
  assert.equal(a.json('trHome()'), '');
  assert.doesNotMatch(a.json('stokv()'), /Peralihan ke/);
});

test('Stop switch goes back to the old brand; Finish early keeps the new one', () => {
  const mk = () => withStock(a0 => [{ id: 's1', k: 'kering', brand: 'B', est: 14, tr: { f: 'A', t: 'B', d: ago(a0, 1) }, buys: [{ id: 'b1', date: ago(a0, 1), tr: 1 }] }]);
  const a = mk();
  a.run("trEnd('s1',true);_ask()");
  assert.equal(a.json('S.stock[0].brand'), 'A');
  assert.equal(a.run('S.stock[0].tr===undefined'), true);
  const b = mk();
  b.run("trEnd('s1',false)");
  assert.equal(b.json('S.stock[0].brand'), 'B');
  assert.equal(b.run('S.stock[0].tr===undefined'), true);
  assert.equal(b.json('messages').at(-1), 'Peralihan selesai');
});

test('stock can have its own name and the cats that eat it; the profile shows what each cat eats', () => {
  const a = app({ data: base() });
  a.run('stokForm()');
  assert.match(sh(a), /Nama \(pilihan\)/);
  assert.match(sh(a), /name="cats" value="m1"/);
  const T = a.run('td()');
  a.submit('saveStok', { k: 'kering', name: 'Kibble kitten', brand: 'Brand A', var: 'kitten', est: '14', qty: '1.5 kg', date: T, cost: '', cats: ['m1', 'ghost'] });
  const x = a.json('S.stock[0]');
  assert.equal(x.name, 'Kibble kitten');
  assert.deepEqual(x.cats, ['m1']);
  assert.match(a.json('pcard(cat("m1"))'), /Makan[\s\S]*Kibble kitten \(Brand A\)/);
  assert.doesNotMatch(a.json('pcard(cat("mm"))'), /Kibble kitten/);
  const h = a.json('stokv()');
  assert.match(h, /<b>Kibble kitten<\/b><span class="stb">Makanan kering · Brand A · kitten/);
  assert.match(h, /class="stcs"><span>Mochi<\/span>/);
  a.run("delCat('m1');_ask()");
  assert.equal(a.run('S.stock[0].cats===undefined'), true, 'a deleted cat is removed from stock');
});

test('the stock list is grouped into Makanan and Pasir & lain-lain', () => {
  const a = withStock(a0 => [{ id: 's3', k: 'pasir', est: 21, buys: [] }, { id: 's1', k: 'kering', est: 14, buys: [] }]);
  const h = a.json('stokv()');
  assert.ok(h.indexOf('>Makanan<') < h.indexOf('data-id="s1"'));
  assert.ok(h.indexOf('data-id="s1"') < h.indexOf('>Pasir &amp; lain-lain<') || h.indexOf('data-id="s1"') < h.indexOf('>Pasir & lain-lain<'));
  assert.ok(h.indexOf('lain-lain<') < h.indexOf('data-id="s3"'));
});

test('a kitten turning one, still on kitten food, gets one gentle card that can be closed', () => {
  const a0 = app();
  const dob = a0.run("(()=>{const x=new Date(td()+'T00:00');x.setFullYear(x.getFullYear()-1);x.setDate(x.getDate()-10);return iso(x)})()");
  const d = { cats: [{ id: 'm1', name: 'Mochi', dob }, { id: 'm2', name: 'Michan', dob }, { id: 'mm', name: 'Mama', dob: '2022-01-01' }], recs: [], vets: [], bk: 0, stock: [{ id: 's1', k: 'kering', name: 'Kibble kitten', est: 14, cats: ['m1', 'm2'], buys: [] }, { id: 's2', k: 'kering', name: 'Kibble Mama', var: 'adult', est: 30, cats: ['mm'], buys: [] }] };
  const a = app({ data: d });
  const h = a.json('kitHome()');
  assert.equal((h.match(/class="card kith"/g) || []).length, 1, 'one card for kittens on the same food');
  assert.match(h, /Mochi dan Michan dah setahun/);
  assert.match(h, /Mereka kini makan Kibble kitten\./);
  assert.match(h, /Tanya vet jika tak pasti/);
  a.run("kitHide('m1,m2')");
  assert.equal(a.json('kitHome()'), '');
  const b = app({ data: { ...d, stock: [{ id: 's2', k: 'kering', name: 'Kibble Mama', var: 'adult', est: 30, cats: ['m1'], buys: [] }] } });
  assert.equal(b.json('kitHome()'), '', 'no card when the cat is already on non-kitten food');
});

test('English translates the new stock texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('Peralihan makanan · Hari 3 / 7'), 'Food switch · Day 3 / 7');
  assert.equal(t('50% lama + 50% baharu'), '50% old + 50% new');
  assert.equal(t('Peralihan ke Brand B'), 'Switching to Brand B');
  assert.equal(t('Mochi dan Michan dah setahun'), 'Mochi and Michan are one year old');
  assert.equal(t('Mochi dah setahun'), 'Mochi is one year old');
  assert.equal(t('(untuk 2 beg)'), '(for 2 bags)');
  assert.equal(t('Pasir & lain-lain'), 'Litter & others');
  assert.equal(t('Beli lain kali ini sahaja'), 'Just a different one this time');
});
