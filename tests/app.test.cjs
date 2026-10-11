const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, seed, html, source, fs, path } = require('./helpers.cjs');

test('script parses and initial state renders', () => {
  const a = app();
  assert.equal(a.json('S.cats[0].name'), 'Milo');
  assert.match(a.elements.get('#app').innerHTML, /Milo/);
});

test('HTML and generated views have no inline JavaScript handlers', () => {
  const a = app();
  assert.doesNotMatch(html, /\bon(?:click|submit|change|input)=|<script>/);
  assert.doesNotMatch(source, /\bon(?:click|submit|change|input)=|\beval\(/);
  assert.doesNotMatch(html, /id="sh"[^>]*data-action/);
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
  const csp = config.headers[0].headers.find(x => x.key === 'Content-Security-Policy').value;
  assert.doesNotMatch(csp.split('script-src ')[1].split(';')[0], /unsafe-inline|unsafe-eval/);
  assert.match(a.json('home()'), /data-action="openCat"/);
});

test('delegated form submission saves the record and closes the modal', () => {
  const a = app();
  a.run("sheet('form')");
  let prevented = false;
  a.events.submit({ preventDefault() { prevented = true; }, target: { dataset: { submit: 'rec', id: '', type: 'berat' }, date: '2026-10-11', val: '4' } });
  assert.equal(prevented, true);
  assert.equal(a.json('S.recs[0].val'), 4000);
  assert.equal(a.elements.get('#sh').hidden, true);
});

test('backdrop clicks close the modal while clicks inside it leave it open', () => {
  const a = app();
  a.run("sheet('form')");
  a.events.click({ target: { id: '', closest: () => null } });
  assert.equal(a.elements.get('#sh').hidden, false);
  a.events.click({ target: { id: 'sh' } });
  assert.equal(a.elements.get('#sh').hidden, true);
});

test('a successful save survives a fresh app session', () => {
  const a = app();
  a.submit('saveRec', { date: '2026-10-11', val: '4.25' }, "'','berat'");
  assert.equal(a.json('messages.at(-1)'), 'Rekod disimpan');
  assert.equal(app({ raw: a.storage() }).json('S.recs[0].val'), 4250);
});

test('failed saves roll back records, keep the form open and never announce success', () => {
  const a = app({ failSave: true });
  a.run("sheet('form')");
  a.submit('saveRec', { date: '2026-10-11', val: '4' }, "'','berat'");
  assert.equal(a.json('S.recs.length'), 0);
  assert.equal(a.elements.get('#sh').hidden, false);
  assert.match(a.json('messages.at(-1)'), /Gagal menyimpan/);
  assert.equal(a.writes(), 0);
});

test('failed profile and clinic edits restore the persisted snapshot', () => {
  const a = app({ data: { ...seed, vets: [{ id: 'v', name: 'Klinik', main: true }] }, failSave: true });
  a.submit('saveCat', { name: 'Changed', dob: '2024-01-01', brs: '', brx: '' }, "'a'");
  a.submit('saveVet', { name: 'Changed' }, "'v'");
  assert.equal(a.json('S.cats[0].name'), 'Milo');
  assert.equal(a.json('S.vets[0].name'), 'Klinik');
});

test('failed deletion keeps both the cat and its records', () => {
  const data = { ...seed, recs: [{ id: 'r', cat: 'a', type: 'berat', date: '2026-10-10', val: 4000 }] };
  const a = app({ data, failSave: true });
  a.run("delCat('a');_ask()");
  assert.equal(a.json('S.cats.length'), 1);
  assert.equal(a.json('S.recs.length'), 1);
});

test('30 kg boundary persists and weights above it are rejected', () => {
  const a = app();
  a.run("SET.unit='kg'");
  a.submit('saveRec', { date: '2026-10-11', val: '30' }, "'','berat'");
  assert.equal(app({ raw: a.storage() }).json('S.recs[0].val'), 30000);
  a.submit('saveRec', { date: '2026-10-11', val: '30.001' }, "'','berat'");
  assert.equal(a.json('S.recs.length'), 1);
});

test('non-finite and sub-gram weights cannot be stored', () => {
  const a = app();
  a.run("SET.unit='g'");
  for (const val of ['Infinity', '-1', '0', '0.1', 'oops']) a.submit('saveRec', { date: '2026-10-11', val }, "'','berat'");
  assert.equal(a.json('S.recs.length'), 0);
});

test('long profile and record text survives save, reload and backup round trip', () => {
  const a = app();
  a.submit('saveCat', { name: 'A'.repeat(90), note: 'N'.repeat(600), dob: '2024-01-01', brs: '', brx: '' }, "'a'");
  a.submit('saveRec', { date: '2026-10-11', name: 'V'.repeat(120), note: 'R'.repeat(700) }, "'','vaksin'");
  const b = app({ raw: a.storage() });
  assert.equal(b.json('S.cats[0].name.length'), 90);
  assert.equal(b.json('S.cats[0].note.length'), 600);
  assert.equal(b.json('S.recs[0].name.length'), 120);
  assert.equal(b.json('S.recs[0].note.length'), 700);
  assert.deepEqual(b.json('parseBackup(JSON.stringify(S))'), b.json('S'));
});

test('calendar validation rejects impossible dates and accepts a leap day', () => {
  const a = app();
  for (const d of ['2026-02-31', '2025-02-29', '2026-13-01', '2026-00-01']) assert.equal(a.run(`okD('${d}')`), false);
  assert.equal(a.run("okD('2024-02-29')"), true);
});

test('future treatments and weights are rejected but appointments are accepted', () => {
  const a = app();
  for (const type of ['vaksin', 'cacing', 'sihat', 'berat']) a.submit('saveRec', { date: '2027-01-01', name: 'F3', val: '4' }, `'', '${type}'`);
  assert.equal(a.json('S.recs.length'), 0);
  a.submit('saveRec', { date: '2027-01-01', name: 'Pemeriksaan', time: '15:45', cost: '123.45' }, "'','lawatan'");
  assert.equal(a.json('S.recs.length'), 1);
});

test('legacy future treatments do not mark care completed or postpone its next date', () => {
  const a = app({ data: { ...seed, recs: [{ id: 'v', cat: 'a', type: 'vaksin', name: 'F3', date: '2027-01-01' }, { id: 'r', cat: 'a', type: 'vaksin', name: 'Rabies', date: '2027-01-01' }, { id: 'w', cat: 'a', type: 'berat', date: '2027-01-01', val: 4000 }] } });
  assert.equal(a.json('plan(S.cats[0]).v.d'), '2026-10-11');
  assert.equal(a.json("sched(S.cats[0]).find(x=>x.k==='vaksin').ok"), false);
  assert.equal(a.json("sched(S.cats[0]).find(x=>x.k==='rabies').ok"), false);
  assert.equal(a.run("lastW('a')"), undefined);
});

test('existing vaccination dates still produce the expected booster and overdue task', () => {
  const a = app({ data: { ...seed, recs: [{ id: 'v', cat: 'a', type: 'vaksin', name: 'F3', date: '2024-07-01' }, { id: 'd', cat: 'a', type: 'cacing', name: 'Product', date: '2026-01-01' }] } });
  assert.equal(a.json('plan(S.cats[0]).v.d'), '2027-07-01');
  assert.equal(a.json("tasks().find(x=>x.t==='cacing').d") < 0, true);
});

test('appointments without a birth date still appear in the 30-day schedule', () => {
  const a = app({ data: { cats: [{ id: 'a', name: 'Milo' }], recs: [{ id: 'l', cat: 'a', type: 'lawatan', date: '2026-10-12', time: '15:45', name: 'Pemeriksaan' }], vets: [] } });
  assert.match(a.json('jdv()'), /15:45/);
});

test('quick weighing validates the entire batch before adding any records', () => {
  const a = app({ data: { ...seed, cats: [...seed.cats, { id: 'b', name: 'B' }] } });
  a.run("SET.unit='kg'");
  a.submit('saveQW', { date: '2026-10-11', w_a: '4', w_b: '31' });
  assert.equal(a.json('S.recs.length'), 0);
  a.submit('saveQW', { date: '2026-10-11', w_a: '4', w_b: '' });
  assert.equal(a.json('S.recs.length'), 1);
});

test('legacy backups import with a schema version and unchanged text', () => {
  const a = app();
  assert.equal(a.json(`parseBackup(${JSON.stringify(JSON.stringify(seed))}).version`), 2);
});

test('duplicate IDs and orphan records reject the whole import before confirmation', () => {
  const a = app();
  const r = { id: 'r', cat: 'a', type: 'berat', date: '2026-10-10', val: 4000 };
  for (const recs of [[r, r], [{ ...r, cat: 'missing' }], [{ ...r, date: '2026-02-31' }]]) {
    a.run(`impTxt(${JSON.stringify(JSON.stringify({ ...seed, recs }))})`);
    assert.equal(a.json('S.recs.length'), 0);
    assert.equal(a.writes(), 0);
    assert.notEqual(a.elements.get('#sh')?.hidden, false);
    assert.match(a.json('messages.at(-1)'), /tidak sah|berulang/);
  }
});

test('invalid optional dates, photos, costs and clinic references reject import', () => {
  const a = app();
  const r = { id: 'r', cat: 'a', type: 'lawatan', date: '2026-10-10', name: 'Vet' };
  const backups = [
    { ...seed, cats: [{ id: 'a', name: 'A', dob: '2026-02-31' }] },
    { ...seed, cats: [{ id: 'a', name: 'A', photo: 'javascript:alert(1)' }] },
    { ...seed, recs: [{ ...r, cost: 'Infinity' }] },
    { ...seed, recs: [{ ...r, time: '24:00' }] },
    { ...seed, recs: [{ ...r, clinic: 'missing' }] },
    { ...seed, version: 999 },
  ];
  for (const backup of backups) assert.throws(() => a.run(`parseBackup(${JSON.stringify(JSON.stringify(backup))})`));
});

test('confirmed import persists all data and a failed import restores the previous state', () => {
  const replacement = { cats: [{ id: 'b', name: 'B' }], recs: [], vets: [] };
  for (const failSave of [false, true]) {
    const a = app({ failSave });
    a.run(`impTxt(${JSON.stringify(JSON.stringify(replacement))});_ask()`);
    assert.equal(a.json('S.cats[0].id'), failSave ? 'a' : 'b');
    assert.equal(a.json('messages.includes("Import berjaya")'), !failSave);
  }
});

test('unreadable storage is not overwritten and can be replaced by a confirmed valid backup', () => {
  const a = app({ raw: '{broken' });
  assert.match(a.elements.get('#app').innerHTML, /Data storan tidak dapat dibaca/);
  a.submit('saveCat', { name: 'New', brs: '', brx: '' }, "''");
  assert.equal(a.storage(), '{broken');
  assert.equal(a.writes(), 0);
  a.run(`impTxt(${JSON.stringify(JSON.stringify(seed))});_ask()`);
  assert.equal(a.json('storageReadError'), false);
  assert.equal(app({ raw: a.storage() }).json('S.cats[0].name'), 'Milo');
});

test('PDF report includes the full history, appointment time, cost and escaped text', () => {
  const recs = Array.from({ length: 9 }, (_, i) => ({ id: 'v' + i, cat: 'a', type: 'vaksin', date: '2026-01-' + String(i + 1).padStart(2, '0'), name: 'VAC_' + i }));
  recs.push({ id: 'l', cat: 'a', type: 'lawatan', date: '2026-11-01', name: '<script>alert(1)</script>', time: '15:45', cost: 123.45 });
  const a = app({ data: { ...seed, recs } });
  const report = a.json('rpt(S.cats[0])');
  for (let i = 0; i < 9; i++) assert.match(report, new RegExp('VAC_' + i));
  assert.match(report, /15:45/);
  assert.match(report, /123\.45/);
  assert.match(report, /&lt;script&gt;/);
  assert.doesNotMatch(report, /<script>/);
});

test('PDF pagination covers the entire report without splitting a normal table row', () => {
  const a = app();
  const pages=a.json('pdfPageRanges(2500,1000,[{top:950,bottom:1050},{top:1900,bottom:1990}])');
  assert.deepEqual(pages,[{start:0,height:950},{start:950,height:950},{start:1900,height:600}]);
  assert.equal(pages.reduce((sum,page)=>sum+page.height,0),2500);
  const tall=a.json('pdfPageRanges(2500,1000,[{top:0,bottom:2400}])');
  assert.deepEqual(tall,[{start:0,height:1000},{start:1000,height:1000},{start:2000,height:500}]);
});

test('concurrent script loads share a Promise and use integrity verification', async () => {
  const a = app();
  const p = a.run("loadJs('https://example.test/lib.js','sha384-test')");
  assert.equal(a.run("loadJs('https://example.test/lib.js','sha384-test')"), p);
  assert.equal(a.scripts.length, 1);
  assert.equal(a.scripts[0].integrity, 'sha384-test');
  assert.equal(a.scripts[0].crossOrigin, 'anonymous');
  a.scripts[0].onload();
  await p;
});

test('failed script loads remove the stale element and can be retried', async () => {
  const a = app();
  const p = a.run("loadJs('https://example.test/lib.js','sha384-test')");
  const rejected = assert.rejects(p, /Gagal memuat/);
  a.scripts[0].onerror();
  await rejected;
  assert.equal(a.scripts[0].removed, true);
  const retry = a.run("loadJs('https://example.test/lib.js','sha384-test')");
  assert.notEqual(retry, p);
  assert.equal(a.scripts.length, 2);
  a.scripts[1].onload();
  await retry;
});

test('a stalled CDN request times out and permits retry', async () => {
  const a = app();
  const p = a.run("loadJs('https://example.test/lib.js','sha384-test')");
  const rejected = assert.rejects(p, /Gagal memuat/);
  for (const fn of [...a.timers.values()]) fn();
  await rejected;
  assert.equal(a.run('scriptLoads.size'), 0);
});

test('cost and time validation rejects invalid form values before saving', () => {
  const a = app();
  for (const extra of [{ cost: 'Infinity' }, { cost: '-1' }, { cost: '1000001' }, { time: '25:00' }]) a.submit('saveRec', { date: '2026-10-11', name: 'Vet', ...extra }, "'','lawatan'");
  assert.equal(a.json('S.recs.length'), 0);
});
