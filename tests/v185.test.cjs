const test = require('node:test');
const assert = require('node:assert/strict');
const { app, source, fs, path } = require('./helpers.cjs');

const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

// ---- Keselamatan data: backup daripada versi lama dan semasa

test('a full v1.8 backup imports without losing or changing any field', () => {
  const text = fixture('backup-v1.8.json'), src = JSON.parse(text);
  const out = app().json(`parseBackup(${JSON.stringify(text)})`);
  for (const key of ['cats', 'recs', 'vets']) {
    assert.equal(out[key].length, src[key].length, key);
    src[key].forEach((item, i) => {
      for (const [k, v] of Object.entries(item)) assert.deepEqual(out[key][i][k], v, `${key}[${i}].${k}`);
    });
  }
});

test('an early backup (no version, old role/status/next fields) still imports every cat and record', () => {
  const text = fixture('backup-v1.0.json'), src = JSON.parse(text);
  const out = app().json(`parseBackup(${JSON.stringify(text)})`);
  assert.equal(out.version, 2);
  assert.deepEqual(out.cats.map(c => c.id), src.cats.map(c => c.id));
  assert.deepEqual(out.recs.map(r => r.id), src.recs.map(r => r.id));
  assert.deepEqual(out.cats.map(c => c.name), ['Comel', 'Tompok']);
  for (const c of out.cats) assert.equal('role' in c || 'status' in c, false);
});

test('opening the app and saving leaves stored data exactly as it was', () => {
  const data = JSON.parse(fixture('backup-v1.8.json'));
  const first = app({ data });
  first.run('save()');
  const stored = first.storage();
  // Buka semula app dengan data yang tersimpan: simpan sekali lagi tidak mengubah apa-apa.
  const again = app({ raw: stored });
  again.run('save()');
  assert.equal(again.storage(), stored);
  assert.equal(again.json('S.cats.length'), 3);
  assert.equal(again.json('S.recs.length'), 8);
  assert.equal(again.json('S.vets.length'), 1);
});

test('export → import round trip on the same phone gives back identical data', () => {
  const data = JSON.parse(fixture('backup-v1.8.json'));
  const a = app({ data });
  const exported = a.run('JSON.stringify({...S,bk:Date.now()})');
  const back = a.json(`parseBackup(${JSON.stringify(exported)})`);
  const now = a.json('S');
  for (const key of ['cats', 'recs', 'vets']) assert.deepEqual(back[key], now[key], key);
});

// ---- A2: backup di iPhone melalui butang Kongsi

function iphone({ share, canShare = () => true } = {}) {
  const shared = [];
  const nav = {
    userAgent: IPHONE, standalone: true,
    canShare, share: share || (async d => { shared.push(d); }),
  };
  class FakeFile { constructor(parts, name, opts) { this.name = name; this.type = opts.type; this.size = parts[0].size; } }
  const a = app({ ua: IPHONE, standalone: true, extra: { navigator: nav, File: FakeFile } });
  return { a, shared };
}

test('iPhone: Export opens the share sheet with a .json file and records the backup date', async () => {
  const { a, shared } = iphone();
  await a.run('exportBk()');
  assert.equal(shared.length, 1);
  const [file] = shared[0].files;
  assert.match(file.name, /^kucingku-backup-2026-10-11\.json$/);
  assert.equal(file.type, 'application/json');
  assert.equal(a.json('S.bk'), Date.parse('2026-10-11T04:00:00Z'));
  assert.match(a.json('messages.at(-1)'), /Backup sedia/);
});

test('iPhone: closing the share sheet without saving does not count as a backup', async () => {
  const abort = Object.assign(new Error('cancel'), { name: 'AbortError' });
  const { a } = iphone({ share: async () => { throw abort; } });
  await a.run('exportBk()');
  assert.equal(a.json('S.bk'), 0);
  assert.equal(a.json('messages.length'), 0);
});

test('iPhone: if the share sheet is unavailable the old download path is used instead', async () => {
  const { a, shared } = iphone({ canShare: () => false });
  let clicked = 0;
  a.run(`document.body={appendChild(){}};document.createElement=()=>({click(){globalThis.__c=(globalThis.__c||0)+1},remove(){}});URL.createObjectURL=()=>'blob:x';URL.revokeObjectURL=()=>{}`);
  await a.run('exportBk()');
  clicked = a.run('globalThis.__c');
  assert.equal(shared.length, 0);
  assert.equal(clicked, 1);
  assert.match(a.json('messages.at(-1)'), /Muat turun backup dimulakan/);
});

// ---- A3: amaran data dalam telefon

test('new users see that data lives on this phone only, with the right wording for iPhone and Android', () => {
  const empty = { cats: [], recs: [], vets: [], bk: 0 };
  const ios = app({ data: empty, ua: IPHONE, standalone: true });
  ios.run('render()');
  assert.match(ios.elements.get('#app').innerHTML, /Jika ikon Kucingku dipadam dari skrin utama/);
  const and = app({ data: empty, standalone: true });
  and.run('render()');
  assert.match(and.elements.get('#app').innerHTML, /data Chrome dibersihkan/);
  and.run("view='set';ssub='data';render()");
  assert.match(and.elements.get('#app').innerHTML, /Data disimpan dalam telefon ini sahaja/);
});

// ---- A1: Vercel Analytics membezakan jenis skrin

test('analytics paths tell apart the installed app, install screen, in-app browser and desktop', () => {
  const u = 'https://kucingku-bay.vercel.app/?utm_source=threads&x=1';
  assert.equal(app({ standalone: true }).run(`vaUrl('${u}')`), 'https://kucingku-bay.vercel.app/app');
  assert.equal(app({ media: q => !q.includes('display-mode') }).run(`vaUrl('${u}')`), 'https://kucingku-bay.vercel.app/pasang/threads');
  assert.equal(app({ ua: 'Mozilla/5.0 (Linux; Android 14; wv) Barcelona 300.0 Mobile', media: q => !q.includes('display-mode') }).run(`vaUrl('${u}')`), 'https://kucingku-bay.vercel.app/buka-pelayar/threads');
  assert.equal(app({ ua: 'Windows NT 10.0', media: () => false }).run(`vaUrl('https://kucingku-bay.vercel.app/')`), 'https://kucingku-bay.vercel.app/desktop');
  assert.equal(app({ media: q => !q.includes('display-mode') }).run(`vaUrl('https://kucingku-bay.vercel.app/?utm_source=<b>"x')`), 'https://kucingku-bay.vercel.app/pasang/bx');
});

test('the analytics hook is queued before the Vercel script loads', () => {
  const vaq = [];
  app({ standalone: true, extra: { window: { vaq } } });
  assert.equal(vaq[0][0], 'beforeSend');
  const ev = vaq[0][1]({ type: 'pageview', url: 'https://kucingku-bay.vercel.app/?utm_source=homescreen' });
  assert.equal(ev.url, 'https://kucingku-bay.vercel.app/app');
  assert.equal(ev.type, 'pageview');
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(html.indexOf('src="app.js"') < html.indexOf('/_vercel/insights/script.js'));
});

// ---- A5: laporan masalah

test('an unexpected app error prepares a report with version, phone and message but no cat data', () => {
  const a = app({ standalone: true, data: JSON.parse(fixture('backup-v1.8.json')) });
  a.run("onErr('TypeError: x is undefined','https://kucingku-bay.vercel.app/app.js',120,7)");
  const info = a.run('errInfo');
  assert.match(info, /^Android app/);
  assert.match(info, /TypeError: x is undefined @120:7/);
  const url = decodeURIComponent(a.run("fbUrl('Ralat: '+errInfo)"));
  assert.match(url, new RegExp('Kucingku v' + a.run('VER').replace(/\./g, '\\.') + ' · BM · Ralat: Android app'));
  assert.doesNotMatch(url, /Oreo|Mochi|Bestari/);
});

test('errors from outside the app (fonts, analytics, extensions) are ignored', () => {
  const a = app();
  for (const [m, s] of [['Script error.', ''], ['boom', 'https://kucingku-bay.vercel.app/_vercel/insights/script.js'], ['boom', 'chrome-extension://abc/x.js'], ['ResizeObserver loop limit exceeded', '']]) {
    a.run(`onErr(${JSON.stringify(m)},${JSON.stringify(s)},1,1)`);
    assert.equal(a.run('errInfo'), '', m + ' ' + s);
  }
  a.run("onErr('boom','https://kucingku-bay.vercel.app/',1,1)");
  assert.match(a.run('errInfo'), /boom/);
});

test('the error panel is shown once, with Report, Reload and Close, and works even in English', () => {
  const made = [];
  const body = { appendChild(el) { made.push(el); } };
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' }, extra: {} });
  a.run(`document.body=${'{appendChild(el){globalThis.__made=(globalThis.__made||[]);__made.push(el)}}'};document.getElementById=()=>null;document.createElement=()=>{const btns=[{addEventListener(){}},{addEventListener(){}},{addEventListener(){}}];return{setAttribute(){},querySelectorAll:()=>btns,remove(){}}}`);
  a.run("onErr('boom','',0,0)");
  a.run("onErr('boom again','',0,0)");
  const panels = a.run('globalThis.__made');
  assert.equal(panels.length, 1);
  assert.match(panels[0].innerHTML, /Something went wrong in the app/);
  assert.match(panels[0].innerHTML, /Report<\/button>/);
  assert.match(panels[0].innerHTML, /Reload<\/button>/);
  void body; void made;
});

test('error handling is registered before the rest of the app runs', () => {
  const firstHandler = source.indexOf("addEventListener('error'");
  const firstLoad = source.indexOf('localStorage.getItem');
  assert.ok(firstHandler > 0 && firstHandler < firstLoad);
});

// ---- A8: gambar dan fon

test('a cat photo can be removed from the profile form', () => {
  const data = JSON.parse(fixture('backup-v1.8.json'));
  const a = app({ data });
  a.run("try{catForm('oreo1')}catch(e){}"); // liveAge perlukan DOM sebenar
  assert.match(a.elements.get('#sh').innerHTML, /data-action="picDel"/);
  a.run('picDel()');
  a.submit('saveCat', { name: 'Oreo', sex: 'Jantan', dob: '2026-06-01', dobx: 'Tepat', brs: 'Domestic Shorthair' }, "'oreo1'");
  assert.equal(a.run("cat('oreo1').photo"), undefined);
  assert.equal(JSON.parse(a.storage()).cats[0].photo, undefined);
  a.run("try{catForm('mochi2')}catch(e){}");
  assert.doesNotMatch(a.elements.get('#sh').innerHTML, /picDel/);
});

test('editing a profile without touching the photo keeps it', () => {
  const data = JSON.parse(fixture('backup-v1.8.json'));
  const a = app({ data });
  a.run("try{catForm('oreo1')}catch(e){}");
  a.submit('saveCat', { name: 'Oreo 2', sex: 'Jantan', dob: '2026-06-01', dobx: 'Tepat', brs: 'Domestic Shorthair' }, "'oreo1'");
  assert.equal(a.run("cat('oreo1').photo"), data.cats[0].photo);
});

test('the stylesheet only names fonts that are actually loaded', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.doesNotMatch(html, /Figtree|Bricolage/);
  assert.match(html, /family=Fredoka[^"]*family=Nunito/);
});

test('every new message has an English translation', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  for (const t of ['Ada masalah dalam app', 'Laporkan', 'Muat semula', 'Buang gambar', 'Backup sedia. Pastikan fail disimpan di luar app ini.', 'Gambar tidak dapat dibaca. Cuba gambar lain.', 'Data disimpan dalam telefon ini sahaja']) {
    assert.notEqual(a.run(`trs(${JSON.stringify(t)})`), t, t);
  }
});
