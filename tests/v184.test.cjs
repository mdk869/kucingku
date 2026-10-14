const test = require('node:test');
const assert = require('node:assert/strict');
const { app, seed, source, fs, path } = require('./helpers.cjs');

const root = path.join(__dirname, '..');
const cats = [{ id: 'a', name: 'Milo', dob: '2024-01-01' }];

// Session history with a real back stack; popstate is delivered when the test calls flush().
function browser() {
  const listeners = {}, queue = [];
  const h = {
    stack: [null], i: 0,
    get state() { return this.stack[this.i]; },
    get length() { return this.stack.length; },
    pushState(s) { this.stack = this.stack.slice(0, this.i + 1); this.stack.push(JSON.parse(JSON.stringify(s))); this.i++; },
    replaceState(s) { this.stack[this.i] = JSON.parse(JSON.stringify(s)); },
    back() { queue.push(() => { if (this.i > 0) { this.i--; (listeners.popstate || (() => {}))({ state: this.stack[this.i] }); } }); },
  };
  return {
    history: h,
    extra: { history: h, addEventListener: (name, fn) => { listeners[name] = fn; } },
    flush() { while (queue.length) queue.shift()(); },
  };
}
const runTimers = a => { for (const [id, fn] of [...a.timers]) { a.timers.delete(id); fn(); } };

test('two weigh-ins on the same day: the one entered last is the current weight and drives the trend', () => {
  const a = app({ data: { cats, vets: [], bk: 0, recs: [
    { id: 'r1', cat: 'a', type: 'berat', date: '2026-10-11', val: 3000 },
    { id: 'r2', cat: 'a', type: 'berat', date: '2026-10-11', val: 3200 },
  ] } });
  assert.equal(a.json("lastW('a').val"), 3200);
  assert.deepEqual(a.json("wTrend('a')"), { w: 3200, d: 200 });
  assert.equal(a.json("doneToday()[0].l"), '3.2 kg');
  a.run("view='cat';cid='a';tab='berat';render()");
  assert.match(a.elements.get('#app').innerHTML, /class="big">3\.2 kg/);
});

test('a combined vaccine counts for both the core schedule and rabies', () => {
  const a = app({ data: { cats: [{ id: 'a', name: 'Oyen', dob: '2026-06-01' }], vets: [], bk: 0, recs: [
    { id: 'v1', cat: 'a', type: 'vaksin', date: '2026-10-01', name: 'F4 + Rabies' },
  ] } });
  const p = a.json("plan(cat('a'))");
  assert.equal(p.v.last, '2026-10-01');
  assert.equal(p.rb.id, 'v1');
  assert.equal(a.json("isCore({name:'Rabies'})"), false);
  assert.equal(a.json("isCore({name:'Purevax RCP Rabies'})"), true);
});

test('a vaccine tile prefills only the vaccine name, never the notes', () => {
  const a = app();
  a.run("recForm('','vaksin','F3 (Tricat)')");
  const html = a.elements.get('#sh').innerHTML;
  assert.match(html, /name="name"[^>]*value="F3 \(Tricat\)"/);
  assert.match(html, /name="note" value=""/);
});

test('an adult with no vaccine history gets a second dose 4 weeks after a first vaccine marked as such', () => {
  const recs = first => [{ id: 'v1', cat: 'a', type: 'vaksin', date: '2026-10-01', name: 'F3 (Tricat)', ...(first ? { first: true } : {}) }];
  const marked = app({ data: { cats: [{ id: 'a', name: 'Oyen', dob: '2023-01-01' }], vets: [], bk: 0, recs: recs(true) } });
  assert.deepEqual(marked.json("plan(cat('a')).v"), { d: '2026-10-29', l: 'Dos kedua', last: '2026-10-01' });
  const unmarked = app({ data: { cats: [{ id: 'a', name: 'Oyen', dob: '2023-01-01' }], vets: [], bk: 0, recs: recs(false) } });
  assert.equal(unmarked.json("plan(cat('a')).v.l"), 'Booster 3 tahun');
  const both = app({ data: { cats: [{ id: 'a', name: 'Oyen', dob: '2023-01-01' }], vets: [], bk: 0, recs: [...recs(true), { id: 'v2', cat: 'a', type: 'vaksin', date: '2026-10-10', name: 'F3' }] } });
  assert.equal(both.json("plan(cat('a')).v.l"), 'Booster 3 tahun');
});

test('the first-vaccine flag is saved from the form, cleared on edit and survives backup round trips', () => {
  const a = app();
  a.run("cid='a'");
  a.submit('saveRec', { date: '2026-10-01', name: 'F3', first: 'on' }, "'','vaksin'");
  const id = a.json("S.recs[0].id");
  assert.equal(a.json('S.recs[0].first'), true);
  assert.equal(a.json("clean(JSON.parse(JSON.stringify(S))).recs[0].first"), true);
  a.submit('saveRec', { date: '2026-10-01', name: 'F3' }, `'${id}','vaksin'`);
  assert.equal(a.run('S.recs[0].first'), undefined);
  a.submit('saveRec', { date: '2026-10-01', name: 'Kutu', first: 'on' }, "'','cacing'");
  assert.equal(a.run('S.recs[1].first'), undefined);
  assert.equal(a.run("clean({cats:[{id:'a'}],recs:[{id:'x',cat:'a',type:'vaksin',date:'2026-10-01',first:'yes'}]}).recs[0].first"), undefined);
});

test('event handlers avoid Object.hasOwn so older iPhones (iOS < 15.4) still work', () => {
  assert.equal(/Object\.hasOwn\(/.test(source), false);
});

test('Android Back closes an open form first, then returns to the previous screen', () => {
  const b = browser(), a = app({ extra: b.extra });
  a.run("go('cats')");
  a.run("openCat('a','vaksin')");
  assert.equal(b.history.length, 3);
  a.run("recForm()");
  assert.equal(b.history.length, 4);
  b.history.back(); b.flush();
  assert.equal(a.elements.get('#sh').hidden, true);
  assert.equal(a.json('view'), 'cat');
  b.history.back(); b.flush();
  assert.equal(a.json('view'), 'cats');
  b.history.back(); b.flush();
  assert.equal(a.json('view'), 'home');
});

test('closing a form with its own button removes the form entry so Back is not wasted', () => {
  const b = browser(), a = app({ extra: b.extra });
  a.run("openCat('a','berat');recForm()");
  assert.equal(b.history.length, 3);
  a.run('closeSh()');
  runTimers(a); b.flush();
  assert.equal(b.history.i, 1);
  assert.equal(a.json('view'), 'cat');
});

test('confirming a dialog that navigates replaces the dialog entry instead of stacking a new one', () => {
  const b = browser(), a = app({ extra: b.extra });
  a.run("openCat('a','berat');delCat('a')");
  assert.equal(b.history.length, 3);
  a.run("clickActions.confirm()");
  runTimers(a); b.flush();
  assert.equal(a.json('view'), 'cats');
  assert.equal(b.history.length, 3);
  assert.equal(b.history.state.v, 'cats');
});

test('a stale history entry for a deleted cat falls back to the cat list', () => {
  const b = browser(), a = app({ extra: b.extra });
  a.run("onPop({state:{v:'cat',cid:'gone',tab:'x',ssub:''}})");
  assert.equal(a.json('view'), 'cats');
  a.run("onPop({state:{v:'evil'}})");
  assert.equal(a.json('view'), 'cats');
});

test('the installed app asks the browser to keep its storage; the browser tab does not', async () => {
  let asked = 0;
  const storage = { persisted: async () => false, persist: async () => { asked++; return true; } };
  app({ standalone: true, extra: { navigator: { userAgent: 'Android Mobile', standalone: true, storage } } });
  app({ media: q => !q.includes('display-mode'), extra: { navigator: { userAgent: 'Android Mobile', storage } } });
  await new Promise(r => setImmediate(r));
  assert.equal(asked, 1);
});

test('the service worker caches every app file and is renamed for this release', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const ver = source.match(/const VER='([\d.]+)'/)[1];
  assert.ok(sw.includes(`const CACHE = 'kucingku-${ver}'`));
  const shell = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map(m => m[1]).filter(f => f !== './');
  for (const f of shell) assert.ok(fs.existsSync(path.join(root, f)), f);
  assert.ok(sw.includes("url.pathname.startsWith('/_vercel/')"));
  assert.match(source, /serviceWorker\.register\('sw\.js'\)/);
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.ok(vercel.headers.some(h => h.source === '/sw.js' && h.headers.some(x => x.key === 'Cache-Control' && x.value === 'no-cache')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version, ver);
});

test('the manifest offers a maskable icon for Android and the Play Store', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  const icon = m.icons.find(i => i.purpose === 'maskable');
  assert.ok(icon && icon.sizes === '512x512' && fs.existsSync(path.join(root, icon.src)));
});
