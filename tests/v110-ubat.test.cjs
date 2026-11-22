const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

const two = { cats: [{ id: 'a', name: 'Mochi', dob: '2024-01-01' }, { id: 'b', name: 'Oreo', dob: '2024-01-01' }], recs: [], vets: [], bk: 0 };
const T = a => a.run('td()');
const withForm = (a, fields, cats) => a.run(`saveMed({preventDefault(){},target:${JSON.stringify({ ...fields, cats, dataset: { cat: 'a', id: '' } })}})`);

test('add medicine for one or several cats; schedule, end date and dose count', () => {
  const a = app({ data: two });
  withForm(a, { name: 'Amoxicillin', dose: '0.5 ml', how: 'mulut', n: '2', t0: '20:00', t1: '08:00', st: T(a), days: '7', note: '' }, ['a', 'b']);
  const m = a.json("S.cats[0].meds[0]");
  assert.equal(m.name, 'Amoxicillin'); assert.deepEqual(m.tm, ['08:00', '20:00']); assert.equal(m.days, 7); assert.equal(m.n, 2);
  assert.equal(a.json("S.cats[1].meds.length"), 1);
  assert.equal(a.run("mEnd(S.cats[0].meds[0])"), a.run(`addD('${T(a)}',6)`));
  assert.equal(a.json("mDoses(S.cats[0].meds[0]).length"), 14);
  assert.equal(a.json('messages.at(-1)'), 'Ubat disimpan');
});

test('validation: name, times per day, valid times and 1-90 days', () => {
  const a = app({ data: two });
  withForm(a, { name: '', n: '1', t0: '08:00', st: T(a) }, ['a']); assert.equal(a.json('messages.at(-1)'), 'Masukkan nama ubat');
  withForm(a, { name: 'X', n: '1', t0: '25:00', st: T(a) }, ['a']); assert.equal(a.json('messages.at(-1)'), 'Masukkan masa dos yang sah');
  withForm(a, { name: 'X', n: '1', t0: '08:00', st: T(a), days: '120' }, ['a']); assert.equal(a.json('messages.at(-1)'), 'Berapa hari mesti antara 1 hingga 90');
  withForm(a, { name: 'X', n: '1', t0: '08:00', st: T(a) }, []); assert.equal(a.json('messages.at(-1)'), 'Pilih sekurang-kurangnya seekor kucing');
  assert.equal(a.run('S.cats[0].meds'), undefined);
});

test('Home: today\'s doses with Diberi / Terlepas; marking updates progress, undo clears it', () => {
  const a = app({ data: two });
  withForm(a, { name: 'Amoxicillin', dose: '0.5 ml', how: 'mulut', n: '2', t0: '08:00', t1: '20:00', st: T(a), days: '7' }, ['a']);
  let h = a.run('focus()');
  assert.match(h, /Ubat<\/div>/); assert.match(h, /data-action="mGive"/); assert.match(h, /Amoxicillin · 0\.5 ml/); assert.match(h, /hari 1\/7/);
  const id = a.json('S.cats[0].meds[0].id'), k = T(a) + '#0';
  a.run(`mMark({dataset:{cat:'a',id:'${id}',k:'${k}'}},'08:05')`);
  assert.equal(a.json(`S.cats[0].meds[0].g['${k}']`), '08:05');
  h = a.run('focus()');
  assert.match(h, /✓ <span>Diberi<\/span> 08:05/); assert.match(h, /1 daripada \d+ selesai/);
  a.run(`mMark({dataset:{cat:'a',id:'${id}',k:'${T(a)}#1'}},0)`);
  assert.match(a.run('focus()'), /Terlepas/);
  a.run(`mMark({dataset:{cat:'a',id:'${id}',k:'${k}'}})`);
  assert.equal(a.run(`S.cats[0].meds[0].g&&S.cats[0].meds[0].g['${k}']`), undefined);
});

test('past doses that were never marked count as missed; profile card shows grid, stats and actions', () => {
  const a = app({ data: two });
  const st = a.run(`addD(td(),-2)`);
  withForm(a, { name: 'Amoxicillin', dose: '0.5 ml', how: 'mulut', n: '2', t0: '08:00', t1: '20:00', st, days: '7' }, ['a']);
  const s = a.json('mStats(S.cats[0].meds[0])');
  assert.equal(s.n, 4); assert.equal(s.y, 0); assert.equal(s.all, 14);
  a.run("cid='a';tab='sihat';view='cat'");
  const h = a.run('catv()');
  assert.match(h, /Ubat sedang diambil/); assert.match(h, /Hari 3\/7/); assert.match(h, /mzc n/); assert.match(h, /Berhenti awal/); assert.match(h, /4 terlepas/);
  assert.match(h, /data-action="medForm" data-cat="a">Tambah ubat/);
});

test('Berhenti awal ends the medicine today and moves it to Ubat lepas; delete removes it', () => {
  const a = app({ data: two });
  const st = a.run(`addD(td(),-9)`);
  withForm(a, { name: 'Vitamin B', dose: '1 titis', how: 'titis', n: '1', t0: '08:00', st, days: '14' }, ['a']);
  const id = a.json('S.cats[0].meds[0].id');
  a.run(`mStop({dataset:{cat:'a',id:'${id}'}});_ask()`);
  assert.equal(a.json('S.cats[0].meds[0].end'), a.run('addD(td(),-1)'));
  a.run("cid='a';tab='sihat';view='cat'");
  assert.doesNotMatch(a.run('catv()'), /Ubat sedang diambil/);
  assert.match(a.run('catv()'), /Ubat lepas[\s\S]*Vitamin B · 1 titis[\s\S]*dihentikan/);
  a.run(`medDel({dataset:{cat:'a',id:'${id}'}});_ask()`);
  assert.equal(a.run('S.cats[0].meds'), undefined);
});

test('as-needed medicine: no Home rows, Dah beri logs a dose', () => {
  const a = app({ data: two });
  withForm(a, { name: 'Ubat sakit', dose: '', how: 'mulut', n: '0', st: T(a), days: '' }, ['a']);
  assert.doesNotMatch(a.run('focus()'), /mGive/);
  const id = a.json('S.cats[0].meds[0].id');
  a.run(`mNow({dataset:{cat:'a',id:'${id}'}})`); a.run(`mNow({dataset:{cat:'a',id:'${id}'}})`);
  assert.equal(a.json('mGiven(S.cats[0].meds[0])'), 2);
});

test('clean keeps valid medicines and drops bad fields', () => {
  const a = app();
  const out = a.json(`clean({cats:[{id:'a',name:'M',meds:[{id:'m1',name:'Amox',n:2,tm:['08:00','20:00'],st:'2026-10-01',days:7,how:'mulut',g:{'2026-10-01#0':'08:01','2026-10-01#1':0,'bad':1,'2026-10-02#0':'99:99'},end:'2026-09-01'},{id:'m2',name:'',n:1,tm:['08:00'],st:'2026-10-01'},{id:'m3',name:'X',n:2,tm:['08:00'],st:'2026-10-01'},{id:'m4',name:'Y',n:1,tm:['08:00'],st:'2026-10-01',days:500,how:'zzz'}]}],recs:[],vets:[]})`);
  const ms = out.cats[0].meds;
  assert.deepEqual(ms.map(m => m.id), ['m1', 'm4']);
  assert.deepEqual(ms[0].g, { '2026-10-01#0': '08:01', '2026-10-01#1': 0 });
  assert.equal(ms[0].end, undefined); assert.equal(ms[1].days, 0); assert.equal(ms[1].how, 'mulut');
});

test('Sesi vet can add a take-home medicine for every selected cat', () => {
  const a = app({ data: two });
  a.run(`saveSv({preventDefault(){},target:{date:td(),cats:['a','b'],dm:'1',mn:'Amoxicillin',mdo:'0.5 ml',mdy:'7',mfn:'2'}})`);
  assert.equal(a.json('S.cats[0].meds[0].name'), 'Amoxicillin'); assert.deepEqual(a.json('S.cats[1].meds[0].tm'), ['08:00', '20:00']);
  assert.match(a.json("S.recs.find(r=>r.name==='Sesi vet').note"), /Ubat Amoxicillin/);
});

test('calendar export includes daily medicine doses (with RRULE) and routine care', () => {
  const a = app({ data: { ...two, cats: [{ ...two.cats[0], care: [{ id: 'k1', k: 'kuku', iv: 14, last: '2026-10-01' }] }, two.cats[1]] } });
  withForm(a, { name: 'Amoxicillin', dose: '0.5 ml', how: 'mulut', n: '2', t0: '08:00', t1: '20:00', st: T(a), days: '7' }, ['a']);
  const ev = a.json('calEvents({u:true})');
  assert.equal(ev.filter(e => e.rr === 'FREQ=DAILY;COUNT=7').length, 2);
  assert.ok(ev.some(e => e.rr === 'FREQ=DAILY;INTERVAL=14' && /Potong kuku/.test(e.title)));
  assert.match(a.run('icsText(calEvents({u:true}))'), /RRULE:FREQ=DAILY;COUNT=7/);
  assert.match(a.run("view='cal';calv()"), /Ubat dan jagaan rutin/);
});

test('English: medicine form, Home rows and profile have no Malay left', () => {
  const a = app({ data: two, settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const st = a.run(`addD(td(),-2)`);
  withForm(a, { name: 'Amoxicillin', dose: '0.5 ml', how: 'mulut', n: '2', t0: '08:00', t1: '20:00', st, days: '7' }, ['a']);
  const t = l => a.json(`${JSON.stringify(l)}.map(trs)`);
  assert.deepEqual(t(['2× sehari', '8:00 pagi', '8:00 malam', 'Hari 3/7', 'hari 3/7', '4 diberi', '1 terlepas', '9 lagi', 'habis 18 Oct 2026', 'Masa dos 2', 'Mula 20 Oct 2026', '14 dos', 'Diberi 2 kali']),
    ['2× a day', '8:00 am', '8:00 pm', 'Day 3/7', 'day 3/7', '4 given', '1 missed', '9 to go', 'ends 18 Oct 2026', 'Dose time 2', 'Starts 20 Oct 2026', '14 doses', 'Given 2 times']);
  const MALAY = /\b(ubat|hari|sehari|diberi|terlepas|kucing|tambah|simpan|padam|berhenti|masa|mula|sebab|catatan|dos|ikut|arahan|lagi|habis|selesai|pagi|malam)\b/i;
  const segs = h => h.split(/<[^>]*>/).map(x => x.trim()).filter(Boolean);
  let sh = ''; a.run("sheet=h=>{globalThis.SH=h}"); a.run("medForm('', 'a')"); sh = a.run('SH');
  a.run("cid='a';tab='sihat';view='cat'");
  const all = [...segs(sh), ...segs(a.run('focus()')), ...segs(a.run('catv()'))];
  const left = a.json(`${JSON.stringify(all)}.map(trs)`).filter(x => MALAY.test(x) && !/Amoxicillin/.test(x));
  assert.deepEqual(left, []);
});
