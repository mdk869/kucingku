const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.3: dinding penyokong (belanja kopi). Tiada jumlah RM, tiada ranking.

const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSf-Pk_1/viewform';
const CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-abc_1/pub?gid=123&single=true&output=csv';
const setup = a => a.run(`PK.form='${FORM}';PK.nama='entry.11';PK.kucing='entry.22';PK.ucapan='entry.33';PK.izin='entry.44';PK.csv='${CSV}'`);
const sh = a => a.elements.get('#sh').innerHTML;
const rows = n => 'Bulan,Nama,Kucing,Ucapan\n' + Array.from({ length: n }, (_, i) => `2026-${String(11 - (i % 3)).padStart(2, '0')},Orang ${i + 1},${i % 2 ? '' : 'Mimi'},"Terima kasih, app ni bagus ${i + 1}"`).join('\n');
const withFetch = (a, text, ok = true) => a.run(`globalThis.__f=[];fetch=(u,o)=>{__f.push({u,o});return ${ok ? `Promise.resolve({ok:true,text:()=>Promise.resolve(${JSON.stringify(text)})})` : 'Promise.reject(new Error("net"))'}}`);

test('the shipped supporter form and list are the developer\'s, and nothing shows if they are removed', () => {
  const a = app();
  assert.equal(a.run('pkPost()'), 'https://docs.google.com/forms/d/e/1FAIpQLScWV2y_ExT-nmu7Kj0kk6Ao-7lQLvNYKxO28OhLPENiwJes4Q/formResponse');
  assert.match(a.run('pkCsv()'), /^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/2PACX-1vS-xWck.*output=csv$/);
  a.run("PK.form='';PK.csv=''");
  a.run('kopiSheet()');
  assert.doesNotMatch(sh(a), /pkForm/);
  assert.doesNotMatch(a.json('morev()'), /Penyokong Kucingku/);
});

test('the QR sheet offers "Saya dah belanja" once configured, and the form has name, anonymous, cat, message and consent', () => {
  const a = app();
  setup(a);
  a.run('kopiSheet()');
  assert.match(sh(a), /data-action="pkForm">Saya dah belanja ☕/);
  a.run('pkForm()');
  const h = sh(a);
  for (const n of ['n', 'anon', 'c', 'm', 'ok']) assert.match(h, new RegExp(`name="${n}"`));
  assert.match(h, /name="m" maxlength="80" required/);
  assert.match(h, /name="ok" checked/);
  assert.match(h, /Jumlah sumbangan tidak dipaparkan/);
  assert.match(h, /Langkau/);
});

test('sending posts name, cat, message and consent to the supporter form and gives this phone the Penyokong badge', async () => {
  const a = app();
  setup(a);
  withFetch(a, '');
  await a.run(`savePk({},{elements:{n:{value:'Kak Ida'},anon:{checked:false},c:{value:'Mimi & Oyen'},m:{value:'Terima kasih buat app ni!'},ok:{checked:true}}})`);
  const [f] = a.json('__f');
  assert.equal(f.u, FORM.replace('viewform', 'formResponse'));
  const p = new URLSearchParams(f.o.body);
  assert.equal(p.get('entry.11'), 'Kak Ida');
  assert.equal(p.get('entry.22'), 'Mimi & Oyen');
  assert.equal(p.get('entry.33'), 'Terima kasih buat app ni!');
  assert.equal(p.get('entry.44'), 'Ya');
  assert.match(sh(a), /Anda penyokong Kucingku!/);
  assert.match(sh(a), /Terima kasih<\/span>, Kak Ida/);
  assert.match(sh(a), /selepas disemak/);
  assert.match(a.json('morev()'), /<span class="pkg"><svg[^]*?<span>Penyokong<\/span><\/span>/);
});

test('anonymous sends no name, and declining consent is sent as Tidak', async () => {
  const a = app();
  setup(a);
  withFetch(a, '');
  await a.run(`savePk({},{elements:{n:{value:'Rahsia'},anon:{checked:true},c:{value:''},m:{value:'Semoga maju'},ok:{checked:false}}})`);
  const p = new URLSearchParams(a.json('__f')[0].o.body);
  assert.equal(p.get('entry.11'), 'Tanpa nama');
  assert.equal(p.get('entry.44'), 'Tidak');
  assert.doesNotMatch(a.json('__f')[0].o.body, /Rahsia/);
  assert.doesNotMatch(sh(a), /selepas disemak/);
});

test('without internet the supporter message waits in the queue and is sent later', async () => {
  const a = app();
  setup(a);
  withFetch(a, '', false);
  await a.run(`savePk({},{elements:{n:{value:'Aina'},anon:{checked:false},c:{value:''},m:{value:'Terima kasih!'},ok:{checked:true}}})`);
  assert.equal(a.json('FBS.q').length, 1);
  withFetch(a, '');
  await a.run('fbFlush()');
  assert.equal(new URLSearchParams(a.json('__f')[0].o.body).get('entry.11'), 'Aina');
  assert.equal(a.json('FBS.q').length, 0);
});

test('the wall reads the published sheet, stays hidden below 3 names, and shows the 4 newest with no amounts', async () => {
  const a = app();
  setup(a);
  withFetch(a, rows(2));
  await a.run('pkLoad(true)');
  assert.doesNotMatch(a.json('morev()'), /Penyokong Kucingku/);
  withFetch(a, rows(6));
  await a.run('pkLoad(true)');
  assert.match(a.json('__f')[0].u, new RegExp('^' + CSV.replace(/[?.]/g, '\\$&') + '&_=\\d+$'));
  const h = a.json('morev()');
  assert.match(h, /Penyokong Kucingku<svg/);
  assert.equal((h.match(/class="pkr"/g) || []).length, 4);
  assert.match(h, /“Terima kasih, app ni bagus 1”/);
  assert.match(h, /<\/svg>Mimi<\/span>/);
  assert.match(h, /Lihat semua penyokong <span>\(6\)<\/span>/);
  assert.doesNotMatch(h, /RM\s?\d/);
  assert.ok(h.indexOf('Suka Kucingku?') < h.indexOf('Penyokong Kucingku'));
  a.run('pkAll()');
  assert.equal((sh(a).match(/class="pkr"/g) || []).length, 6);
});

test('sheet text is escaped and trimmed, and blank messages are skipped', () => {
  const a = app();
  const l = a.json(`pkParse(${JSON.stringify('Bulan,Nama,Kucing,Ucapan\n2026-11,<b>X</b>,,"<script>alert(1)</script>"\n2026-11,,,\n2026-10,,Oyen,' + 'a'.repeat(200))})`);
  assert.equal(l.length, 2);
  assert.equal(l[1].n, 'Tanpa nama');
  assert.equal(l[1].m.length, 80);
  a.run(`PKS.l=${JSON.stringify(l)}.concat(${JSON.stringify(l)})`);
  setup(a);
  const h = a.json('pkWall()');
  assert.doesNotMatch(h, /<script>|<b>X/);
  assert.match(h, /&lt;b&gt;X/);
});

test('only Google links are accepted for the supporter form and list', () => {
  const a = app();
  setup(a);
  a.run("PK.csv='https://evil.example/pub?output=csv'");
  assert.equal(a.run('pkCsv()'), '');
  a.run("PK.form='https://evil.example/forms/d/e/x/viewform'");
  assert.equal(a.run('pkPost()'), '');
});

test('hidden inside the Play Store app, like Belanja kopi', () => {
  const store = new Map();
  const a = app({ extra: { sessionStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } } });
  setup(a);
  a.run(`PKS.l=${JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ d: '2026-11', n: 'N' + i, c: '', m: 'Hai' })))};PKS.me={n:'A',d:'2026-11'}`);
  assert.match(a.json('morev()'), /Penyokong Kucingku/);
  a.run("document.referrer='android-app://com.example.kucingku'");
  const h = a.json('morev()');
  assert.doesNotMatch(h, /Penyokong/);
  assert.equal(a.run('pkPost()'), '');
});

test('the list is fetched again every time Lagi is opened, at most every 30 seconds', async () => {
  const a = app();
  setup(a);
  withFetch(a, rows(5));
  await a.run('pkLoad()');
  await a.run('pkLoad()');
  assert.equal(a.json('__f').length, 1, 'not twice within 30 seconds');
  a.run('PKS.t-=31000');
  await a.run('pkLoad()');
  assert.equal(a.json('__f').length, 2);
});

test('English translates the supporter texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('Anda penyokong Kucingku!'), "You're a Kucingku supporter!");
  assert.equal(t('Penyokong Kucingku'), 'Kucingku supporters');
  assert.equal(t('Boleh paparkan dalam app'), 'OK to show in the app');
});
