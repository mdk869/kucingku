const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, seed, source } = require('./helpers.cjs');

const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const data = today => ({
  version: 2, bk: 0,
  cats: [
    { id: 'a', name: 'Oreo', sex: 'Jantan', dob: addDays(today, -45), dobx: 'Anggaran', breed: 'Domestic Shorthair', pattern: 'Black and white', chip: '123', note: 'Friendly' },
    { id: 'b', name: 'Mochi', sex: 'Betina', dob: addDays(today, -600), breed: 'Tidak pasti', ms: { md: addDays(today, -300) } },
    { id: 'c', name: 'Luna', sex: 'Betina', dob: addDays(today, -45) },
    { id: 'd', name: 'Kiki', sex: 'Belum pasti' },
  ],
  vets: [
    { id: 'v1', name: 'PetCare Hospital', tel: '03-1234 5678', addr: 'Main Street 1', hours: '9am to 8pm', doc: 'Dr Sam', main: true, h24: true },
    { id: 'v2', name: 'Sunrise Animals', tel: '', addr: 'https://maps.example.com/x', hours: '', doc: '', note: '' },
  ],
  recs: [
    { id: 'r1', cat: 'a', type: 'berat', date: today, val: 650 }, { id: 'r2', cat: 'a', type: 'berat', date: addDays(today, -1), val: 600 },
    { id: 'r3', cat: 'a', type: 'cacing', date: addDays(today, -3), name: 'Drontal', clinic: 'v2' },
    { id: 'r4', cat: 'a', type: 'vaksin', date: addDays(today, -3), name: 'F3 (Tricat)', note: 'ok', clinic: 'v1', cost: 85 },
    { id: 'r5', cat: 'b', type: 'berat', date: addDays(today, -10), val: 3400 }, { id: 'r6', cat: 'b', type: 'berat', date: addDays(today, -40), val: 3300 },
    { id: 'r7', cat: 'b', type: 'vaksin', date: addDays(today, -300), name: 'Rabies' },
    { id: 'r8', cat: 'a', type: 'lawatan', date: addDays(today, 5), time: '10:30', name: 'Checkup', note: 'Bring book', clinic: 'v1', cost: 120.5 },
    { id: 'r9', cat: 'a', type: 'lawatan', date: addDays(today, -20), name: 'Flu', clinic: 'v1' },
    { id: 'r10', cat: 'a', type: 'sihat', date: addDays(today, -5), name: 'Sneezing', note: 'Mild' },
    { id: 'r11', cat: 'c', type: 'berat', date: addDays(today, -3), val: 600 },
  ],
});
const world = (lang = 'en') => { const probe = app(); const today = probe.run('td()'); return app({ data: data(today), settings: { v: 1, lang, bk: 30, unit: 'auto' } }); };

const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const segments = html => {
  const out = new Set();
  (html.match(/(?:placeholder|aria-label|alt|title)="[^"]*"/g) || []).forEach(m => out.add(decode(m.replace(/^[a-z-]+="|"$/g, ''))));
  html.split(/<[^>]*>/).map(x => decode(x).trim()).filter(Boolean).forEach(x => out.add(x));
  return [...out];
};
// Malay words that must not survive translation (Bahasa Melayu itself is the one allowed label).
const MALAY = /\b(tarikh|berat|kucing|rekod|hari|minggu|bulan|tahun|tambah|simpan|padam|klinik|ubat|cacing|vaksin|lawatan|sebab|catatan|selesai|seterusnya|terakhir|lewat|esok|jadual|kesihatan|petua|jagaan|umur|baka|jantina|telefon|alamat|waktu|doktor|nama|masa|pilih|fail|tampal|semua|dalam|akan|datang|untuk|dan|atau|yang|ini|anda|sahaja|belum|ada|tiada|boleh|dipadam|disimpan|gambar|warna|corak|utama|lagi|pemandulan|temujanji|rawatan|timbang|kitaran|hidup|fasa|tentang|bahasa|peringatan|selamat|dengan|daripada|supaya|jika|kemudian|sekali|setiap|hingga|bawah|selepas|cuba|gagal|berjaya|sah|kosong|tekan|buat|sentiasa|mula|merekod|guna|ikut|nasihat|mesti|antara|dibaca|tidak|dapat|dahulu|salinan|asal|dikekalkan|menyimpan|terlalu|besar|mengandungi|berulang|rujukan|hilang|disokong|versi|muat|turun|dimulakan|pustaka|tersedia|memuat|menyediakan|halaman|bertarikh|sebelumnya|nilai|ditolak|bukan|storan|diganti)\b/i;
const leftovers = (a, html) => {
  const segs = segments(html).filter(x => x !== 'Bahasa Melayu');
  const translated = a.json(`${JSON.stringify(segs)}.map(trs)`);
  return translated.filter(x => MALAY.test(x));
};

test('translation helpers are the identity in Bahasa Melayu', () => {
  const a = world('ms');
  assert.deepEqual(a.json(`["Hari ini","6 minggu (1 bulan 15 hari)","Lewat 3 hari"].map(trs)`), ['Hari ini', '6 minggu (1 bulan 15 hari)', 'Lewat 3 hari']);
});

test('dictionary entries are complete and every key is a non-empty string pair', () => {
  const a = app();
  const entries = a.json('Object.entries(EN)');
  assert.ok(entries.length > 250);
  for (const [k, v] of entries) { assert.equal(typeof v, 'string'); assert.ok(k.trim() && v.trim(), k); }
});

test('dynamic phrases are translated with correct singular and plural forms', () => {
  const a = world();
  const t = list => a.json(`${JSON.stringify(list)}.map(trs)`);
  assert.deepEqual(t(['6 minggu (1 bulan 15 hari)', '1 minggu (1 hari)', '±12 minggu (2 hari)', 'Lewat 1 hari', 'Lewat 3 hari', '1 hari lagi', '5 hari lagi', '5 hari', 'Hari ini', 'Esok']),
    ['6 weeks (1 month 15 days)', '1 week (1 day)', '±12 weeks (2 days)', 'Overdue 1 day', 'Overdue 3 days', '1 day left', '5 days left', '5 days', 'Today', 'Tomorrow']);
  assert.deepEqual(t(['+50 g sejak timbangan sebelum ini', 'Timbang berat Oreo', 'Vaksin rabies Mochi', 'Seterusnya esok · Setiap hari', 'Terakhir 5 Okt 2026', '3 perkara hari ini · 1 lewat', '1 daripada 4 selesai', 'Tambah rekod lawatan vet', 'Belum ada rekod berat.', 'Umur: ±6 minggu (1 hari)', '✓ Ubat cacing', '♂ Jantan', '25 Okt 2026 (anggaran)']),
    ['+50 g since the last weigh-in', 'Weigh-in Oreo', 'Rabies vaccine Mochi', 'Due tomorrow · Every day', 'Last 5 Okt 2026', '3 items today · 1 overdue', '1 of 4 done', 'Add vet visit record', 'No weight records yet.', 'Age: ±6 weeks (1 day)', '✓ Deworming', '♂ Male', '25 Okt 2026 (estimated)']);
  assert.equal(a.json(`trs("Import 2 kucing, 3 rekod dan 1 klinik? Semua data semasa akan diganti.")`), 'Import 2 cats, 3 records and 1 clinic? All current data will be replaced.');
  assert.equal(a.json(`trs("Berat Mochi mesti antara 1 g hingga 30 kg")`), 'Weight for Mochi must be between 1 g and 30 kg');
});

test('every screen, form, confirmation and PDF report has no Malay text left in English', () => {
  const a = world();
  const found = [];
  const check = (label, html) => { for (const x of leftovers(a, html)) found.push(`${label}: ${x}`); };
  for (const v of ['home()', 'cats()', 'jdv()', 'morev()', 'vetv()']) check(v, a.json(v));
  for (const sub of ['', 'umum', 'peringatan', 'data', 'tentang']) { a.run(`ssub='${sub}'`); check('setv:' + sub, a.json('setv()')); }
  a.run("ssub=''");
  for (const id of ['a', 'b', 'c', 'd']) for (const tab of ['berat', 'vaksin', 'cacing', 'lawatan', 'sihat']) { a.run(`cid='${id}';tab='${tab}'`); check(`catv:${id}:${tab}`, a.json('catv()')); }
  const sheet = (label, code) => { a.run(`cid='a';tab='berat';try{${code}}catch(e){}`); check(label, a.elements.get('#sh').innerHTML); };
  for (const id of ['a', 'b']) { sheet('catForm:' + id, `catForm('${id}')`); }
  sheet('catForm:new', 'catForm()'); sheet('vetForm', 'vetForm()'); sheet('vetForm:edit', "vetForm('v1')"); sheet('quickW', 'quickW()');
  sheet('addRec', 'addRec()'); sheet('recType', "recType('a')"); sheet('addAppt', 'addAppt()');
  for (const tab of ['berat', 'vaksin', 'cacing', 'lawatan', 'sihat']) sheet('recForm:' + tab, `tab='${tab}';recForm()`);
  for (const id of ['r1', 'r4', 'r3', 'r8', 'r10']) sheet('recForm:edit:' + id, `tab=S.recs.find(r=>r.id==='${id}').type;recForm('${id}')`);
  for (const code of ["delRec('r1')", "delCat('a')", "delVet('v1')", 'wipe()']) sheet('ask:' + code, code);
  for (const id of ['a', 'b', 'c', 'd']) check('pdf:' + id, a.json(`rpt(S.cats.find(c=>c.id==='${id}'))`));
  assert.deepEqual(found, []);
});

test('every fixed message and validation error has an English translation', () => {
  const a = world();
  const literals = new Set();
  for (const re of [/toast\('((?:[^'\\\n]|\\.)*)'\)/g, /new Error\('((?:[^'\\\n]|\\.)*)'\)/g, /\bask\('((?:[^'\\\n]|\\.)*)'/g, /\breturn '((?:[^'\\\n]|\\.)*)'(?=[;}\n])/g]) {
    for (const m of source.matchAll(re)) if (MALAY.test(m[1]) && !/['`$<]/.test(m[1])) literals.add(m[1].replace(/\\'/g, "'"));
  }
  assert.ok(literals.size > 40, 'message scan found ' + literals.size);
  const missing = [...literals].filter(s => a.json(`trs(${JSON.stringify(s)})`) === s && s !== 'Bahasa Melayu');
  assert.deepEqual(missing, []);
});

test('English formats dates in English and Bahasa Melayu keeps its own', () => {
  const en = world('en'), ms = world('ms');
  assert.equal(en.json('LOC()'), 'en-MY');
  assert.equal(ms.json('LOC()'), 'ms-MY');
  assert.match(en.json("fd('2026-10-10')"), /Oct/);
});

test('delegated language switch persists the choice and updates the document language', () => {
  const a = app();
  a.run("setLang('en')");
  assert.equal(JSON.parse(a.settings()).lang, 'en');
  assert.equal(a.json('messages.at(-1)'), 'Bahasa ditukar');
  a.run("setLang('ms')");
  assert.equal(JSON.parse(a.settings()).lang, 'ms');
});
