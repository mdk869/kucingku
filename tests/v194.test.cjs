const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.4: Stok makanan & pasir (S.stock), anggaran tarikh habis, kos ke Perbelanjaan.
const mk = (stock = () => []) => { const p = app(); const T = p.run('td()'); const add = n => p.run(`addD('${T}',${n})`);
  return { a: app({ data: { cats: [{ id: 'a', name: 'Mimi' }], recs: [], vets: [], bk: 0, stock: stock(add) } }), add, T }; };
const B = (add, d, extra = {}) => ({ id: 'b' + Math.abs(d) + (d < 0 ? 'm' : 'p'), date: add(d), ...extra });

test('backup cleaning keeps valid stock and drops invalid items and purchases', () => {
  const { a } = mk(add => [
    { id: 's1', k: 'pasir', brand: '  Brand X ', est: 21, buys: [B(add, -10, { cost: 30 }), { id: 'bad', date: 'kelmarin' }, B(add, -10)] },
    { id: 's2', k: 'lain', name: '', est: 10, buys: [] },
    { id: 's3', k: 'emas', est: 10, buys: [] },
    { id: 's4', k: 'kering', est: 9999, buys: [] },
  ]);
  const st = a.json('S.stock');
  assert.deepEqual(st.map(x => x.id), ['s1', 's4']);
  assert.equal(st[0].brand, 'Brand X'); assert.equal(st[0].buys.length, 1); assert.equal(st[0].buys[0].cost, 30);
  assert.equal(st[1].est, 30, 'out-of-range estimate falls back to the type default');
});

test('one purchase uses the first guess; later purchases teach the app how long stock lasts', () => {
  const one = mk(add => [{ id: 's1', k: 'pasir', est: 21, buys: [B(add, -18)] }]);
  assert.deepEqual(one.a.json("(({tahan,learned,left})=>({tahan,learned,left}))(stInfo(S.stock[0]))"), { tahan: 21, learned: false, left: 3 });
  const many = mk(add => [{ id: 's1', k: 'pasir', est: 21, buys: [B(add, -72), B(add, -48), B(add, -24), B(add, -20)] }]);
  // last 3 intervals: 24, 24, 4 → average 17 days; last purchase 20 days ago → 3 days overdue
  assert.deepEqual(many.a.json("(({tahan,learned,left})=>({tahan,learned,left}))(stInfo(S.stock[0]))"), { tahan: 17, learned: true, left: -3 });
});

test('Home warns about stock running low (3 days or less) and Lagi shows the count', () => {
  const { a } = mk(add => [{ id: 's1', k: 'pasir', est: 21, buys: [B(add, -19)] }, { id: 's2', k: 'kering', est: 30, buys: [B(add, -2)] }]);
  const h = a.json('home()');
  assert.match(h, /Hampir habis<\/div>[\s\S]*Pasir[\s\S]*Habis dalam ±2 hari[\s\S]*data-action="buyForm" data-id="s1"/);
  assert.doesNotMatch(h, /Makanan kering/);
  assert.match(a.json('morev()'), /data-view="stok"[\s\S]*1 hampir habis/);
});

test('adding stock validates and records the first purchase', () => {
  const { a, T } = mk();
  a.submit('saveStok', { k: 'lain', name: '', brand: '', var: '', est: '30', qty: '', date: T, cost: '' });
  assert.equal(a.json('messages.at(-1)'), 'Masukkan nama stok');
  a.submit('saveStok', { k: 'pasir', brand: 'X', var: '', est: '0', qty: '', date: T, cost: '' });
  assert.equal(a.json('messages.at(-1)'), 'Masukkan bilangan hari antara 1 hingga 365');
  a.submit('saveStok', { k: 'pasir', brand: 'X', var: '', est: '21', qty: '10 L', date: '2999-01-01', cost: '' });
  assert.equal(a.json('messages.at(-1)'), 'Masukkan tarikh hari ini atau sebelumnya');
  a.submit('saveStok', { k: 'pasir', brand: 'Brand X', var: 'tofu', est: '21', qty: '10 L', date: T, cost: '29.90' });
  const x = a.json('S.stock[0]');
  assert.equal(x.brand, 'Brand X'); assert.equal(x.var, 'tofu'); assert.equal(x.buys.length, 1); assert.equal(x.buys[0].cost, 29.9);
});

test('Dah beli pre-fills the last brand, saves the purchase and updates the brand when it changes', () => {
  const { a, T } = mk(add => [{ id: 's1', k: 'kering', brand: 'Lama', var: 'kitten', qty: '7 kg', est: 30, buys: [B(add, -30)] }]);
  a.run("buyForm('s1')");
  assert.match(a.elements.get('#sh').innerHTML, /name="brand" value="Lama"/);
  a.submit('saveBuy', { brand: 'Baharu', var: 'adult', qty: '7 kg', cost: '80', date: T }, "'s1'");
  const x = a.json('S.stock[0]');
  assert.equal(x.buys.length, 2); assert.equal(x.brand, 'Baharu'); assert.equal(x.var, 'adult');
  assert.equal(a.json('stInfo(S.stock[0]).left'), 30);
});

test('stock costs count in Perbelanjaan as Stok, without a cat', () => {
  const { a } = mk(add => [{ id: 's1', k: 'pasir', brand: 'Brand X', est: 21, buys: [B(add, 0, { cost: 30 })] }]);
  assert.equal(a.json("costs().filter(r=>r.type==='stok').length"), 1);
  const e = a.json('expv()');
  assert.match(e, /Stok/); assert.match(e, /RM 30\.00/); assert.match(e, /Pasir · Brand X/);
});

test('deleting a purchase and a stock item asks first', () => {
  const { a } = mk(add => [{ id: 's1', k: 'pasir', est: 21, buys: [B(add, -10), B(add, -1)] }]);
  a.run("buyDel('s1','b1m');_ask()");
  assert.equal(a.json('S.stock[0].buys.length'), 1);
  a.run("stokDel('s1');_ask()");
  assert.equal(a.run('S.stock'), undefined);
});

test('English translates the stock texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('±5 hari'), '±5 days');
  assert.equal(t('Biasanya tahan ±24 hari'), 'Usually lasts ±24 days');
  assert.equal(t('Anggaran habis dalam ±1 hari'), 'Likely to run out in ±1 day');
  assert.equal(t('Dah beli: Pasir'), 'Bought: Litter');
});

test('new styles never reuse an existing class name (the cat list card broke when .kc was reused)', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  const rules = sel => (html.match(new RegExp('(^|[}\\n])' + sel.replace('.', '\\.') + '\\{[^}]*\\}', 'g')) || []);
  for (const r of rules('.kc')) assert.doesNotMatch(r, /position:absolute|border-radius:50%/, r);
  for (const [sel, bad] of [['.ks', /margin:6px 0 12px/], ['.kn', /font-size:120px/], ['.wn', /text-align:center/], ['.lt', /FFF3EF/], ['.hb', /inline-block/]])
    for (const r of rules(sel)) assert.doesNotMatch(r, bad, r);
  assert.doesNotMatch(html, /\.seg\.ks\{|\.kp\.kn |\.tabs\.tg\{|\.rsk\.lt\{|\.btn\.hb\{/);
});
