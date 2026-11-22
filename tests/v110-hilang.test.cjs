const test = require('node:test');
const assert = require('node:assert/strict');
const { app, fs, path } = require('./helpers.cjs');
const vm = require('node:vm');
const cats = { cats: [{ id: 'a', name: 'Mochi', sex: 'Jantan', dob: '2025-09-01', color: '#6FA0D8', pattern: 'Putih oren', chip: '900123456789012' }], recs: [], vets: [], bk: 0 };

test('phone numbers become international digits; the link carries details after # only', () => {
  const a = app({ data: cats });
  assert.equal(a.run("jPhone('012-345 6789')"), '60123456789');
  assert.equal(a.run("jPhone('+60 11-2345 6789')"), '601123456789');
  assert.equal(a.run("jPhone('123')"), '');
  const u = a.run("jUrl(cat('a'),{own:'Aisyah',tel:'012-345 6789'})");
  assert.equal(u, 'https://kucingku-bay.vercel.app/j#Mochi~Aisyah~60123456789~J~6FA0D8');
  const full = a.run("jUrl(cat('a'),{own:'Aisyah',tel:'0123456789',full:1,ciri:'Kolar biru'})");
  assert.match(full, /~Kolar%20biru~Putih%20oren~900123456789012$/);
});

test('Kongsi kad has a Jika saya hilang mode with Poster A4, Status and QR loket', () => {
  const a = app({ data: cats });
  a.run("sheet=h=>{globalThis.SH=h};kOpt={};cardForm('a');kMode('hilang')");
  let h = a.run('SH');
  assert.match(h, /Jika saya hilang/); assert.match(h, /Poster A4/); assert.match(h, /QR loket/); assert.match(h, /Tolong bantu<br>Mochi pulang/);
  assert.match(h, /Nombor anda hanya ada pada gambar ini\./); assert.match(h, /data-action="hkPdf"/);
  assert.doesNotMatch(h, /[\u{1F300}-\u{1FAFF}]/u, 'no emoji icons');
  a.run("hkF('status')"); h = a.run('SH');
  assert.match(h, /TOLONG KONGSI/); assert.match(h, /Kucing kami<br>hilang/); assert.match(h, /data-action="hkShare"/);
  a.run("hkF('loket')"); h = a.run('SH');
  assert.match(h, /Sesuai loket kecil/); assert.match(h, /Saiz QR sekurang-kurangnya 2 cm/); assert.match(h, /Panduan kedai engrave/); assert.match(h, /data-action="hkSvgS"/);
});

test('exports need a valid number and owner name; the number is never saved to storage', () => {
  const a = app({ data: cats });
  a.run("kOpt={id:'a',m:'hilang'};KH.tel='12';KH.own='Aisyah'");
  assert.equal(a.run('hkOk()'), false); assert.equal(a.json('messages.at(-1)'), 'Masukkan nombor telefon yang sah');
  a.run("KH.tel='012-345 6789';KH.own=''"); assert.equal(a.run('hkOk()'), false); assert.equal(a.json('messages.at(-1)'), 'Masukkan nama pemilik');
  a.run("KH.own='Aisyah'"); assert.equal(a.run('hkOk()'), true);
  a.run('save()');
  assert.doesNotMatch(a.storage(), /012-345|60123456789/);
});

test('QR encoder is vendored and makes a scannable-size matrix for the short link', () => {
  const src = fs.readFileSync(path.join(__dirname, '../qr.js'), 'utf8');
  assert.match(src, /lesen MIT/);
  const ctx = vm.createContext({}); vm.runInContext(src + ';globalThis.q=qrcode', ctx);
  const q = ctx.q(0, 'M'); q.addData('https://kucingku-bay.vercel.app/j#Mochi~Aisyah~60123456789~J~6FA0D8'); q.make();
  assert.ok(q.getModuleCount() <= 37, 'QR size ' + q.getModuleCount());
  assert.match(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), /'qr\.js'/);
});

test('finder page /j: strict CSP, no inline script, builds WhatsApp and tel links from the hash', () => {
  const h = fs.readFileSync(path.join(__dirname, '../j.html'), 'utf8');
  assert.match(h, /script-src 'self'/); assert.doesNotMatch(h, /<script(?![^>]*\bsrc=)[^>]*>/); assert.match(h, /noindex/);
  const js = fs.readFileSync(path.join(__dirname, '../j.js'), 'utf8');
  const el = { innerHTML: '', addEventListener() {}, querySelector() { return {}; } };
  const run = hash => { const ctx = vm.createContext({ location: { hash }, document: { title: '', getElementById: () => el }, navigator: {} }); vm.runInContext(js, ctx); return el.innerHTML; };
  const out = run('#Mochi~Aisyah~60123456789~J~6FA0D8');
  assert.match(out, /Hai, saya Mochi/); assert.match(out, /https:\/\/wa\.me\/60123456789\?text=Assalamualaikum/); assert.match(out, /tel:\+60123456789/); assert.match(out, /Panggil 012-345 6789/);
  assert.match(run('#<b>x</b>~A~60123456789'), /&lt;b&gt;x/);
  assert.match(run('#Mochi~Aisyah~12'), /tidak lengkap/);
});

test('English: lost-card screens have translations', () => {
  const a = app({ data: cats, settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = l => a.json(`${JSON.stringify(l)}.map(trs)`);
  assert.deepEqual(t(['Jika saya hilang', 'Tolong bantu', 'Mochi pulang', 'Hilang sejak 21 Nov 2026', 'Nampak Mochi? Hubungi Aisyah', 'TOLONG KONGSI', 'Kucing kami', 'hilang', 'Simpan PDF', 'Panduan kedai engrave']),
    ['If I get lost', 'Please help', 'Mochi get home', 'Lost since 21 Nov 2026', 'Seen Mochi? Contact Aisyah', 'PLEASE SHARE', 'Our cat is', 'missing', 'Save PDF', 'Guide for the engraving shop']);
});
