const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// v1.9.5: Sesi vet. Satu borang untuk satu lawatan, beberapa kucing, disalin dari kad vet.

const sh = a => a.elements.get('#sh').innerHTML;
const IMG = 'data:image/jpeg;base64,' + 'A'.repeat(4000); // data lama pratonton yang masih ada gambar
const mk = () => {
  const a0 = app();
  const D = n => a0.run(`addD(td(),${n})`);
  const data = { cats: [{ id: 'm1', name: 'Mochi', dob: D(-90) }, { id: 'm2', name: 'Michan', dob: D(-90) }, { id: 'm3', name: 'Oreo', dob: D(-90) }, { id: 'mm', name: 'Mama', dob: '2022-01-01' }], vets: [{ id: 'v1', name: 'Klinik Bestari', main: true }], recs: ['m1', 'm2', 'm3'].map((c, i) => ({ id: 'r' + i, cat: c, type: 'vaksin', date: D(-28), name: 'F3 (Tricat)' })), bk: 0 };
  const a = app({ data });
  return { a, D };
};
const full = (D, x = {}) => ({ cats: ['m1', 'm2', 'm3'], date: D(0), clinic: 'v1', dv: 'on', vt: 'F3 (Tricat)', brand: 'Felocell 3', batch: 'A123B', dw: 'on', wn: 'Drontal Cat', dt: 'on', w_m1: '1.62', w_m2: '1.48', w_m3: '', nx: D(21), nt: '10:30', cost: '100', note: 'Semua sihat', ...x });

test('＋ Tambah has a Sesi vet button, and the form starts with the chosen cat and shows the dose by records', () => {
  const { a } = mk();
  a.run("TMC='m2';tambah()");
  assert.match(sh(a), /class="tsv" data-action="svForm"/);
  a.run("svForm('m2')");
  const h = sh(a);
  assert.match(h, /data-submit="sv"/);
  assert.match(h, /value="m2" data-change="svUpd" checked/);
  assert.doesNotMatch(h, /value="m1" data-change="svUpd" checked/);
  assert.match(h, /Dos ikut rekod:<\/b> <span>Michan dos ke-2<\/span>/);
  for (const k of ['dv', 'dw', 'dt', 'do']) assert.match(h, new RegExp(`name="${k}" data-change="svUpd"`));
  assert.match(h, /Temujanji seterusnya \(dari kad vet\)/);
  assert.match(h, /Simpan sesi <span>\(1 kucing\)<\/span>/);
});

test('saving a visit makes the usual records for every cat, splits the cost once, and adds the next appointment', () => {
  const { a, D } = mk();
  a.submit('saveSv', full(D));
  const R = a.json('S.recs.filter(r=>r.sv)');
  const by = (c, t) => R.filter(r => r.cat === c && r.type === t);
  for (const c of ['m1', 'm2', 'm3']) {
    assert.equal(by(c, 'vaksin').length, 1);
    assert.equal(by(c, 'cacing').length, 1);
    assert.equal(by(c, 'lawatan').length, 2, 'the visit itself and the next appointment');
  }
  const v = by('m1', 'vaksin')[0];
  assert.equal(v.name, 'F3 (Tricat)');
  assert.equal(v.brand, 'Felocell 3');
  assert.equal(v.batch, 'A123B');
  assert.equal(v.nx, D(21));
  assert.equal(v.clinic, 'v1');
  assert.equal(by('m1', 'berat')[0].val, 1620);
  assert.equal(by('m3', 'berat').length, 0, 'a blank weight is skipped');
  const visits = R.filter(r => r.type === 'lawatan' && r.done === 1);
  assert.equal(visits.length, 3);
  assert.deepEqual(visits.map(r => r.cost), [33.34, 33.33, 33.33], 'RM 100 split evenly, counted once');
  assert.match(visits[0].note, /Vaksin F3 \(Tricat\), Ubat cacing Drontal Cat, Timbang\. Semua sihat/);
  const appt = R.filter(r => r.type === 'lawatan' && !r.done);
  assert.equal(appt[0].date, D(21));
  assert.equal(appt[0].time, '10:30');
  assert.equal(appt[0].name, 'Temujanji vaksin');
  assert.equal(new Set(R.map(r => r.sv)).size, 1);
  assert.equal(a.run('S.imgs===undefined'), true, 'no vet card photos are stored');
  assert.equal(a.json('messages').at(-1), 'Sesi vet disimpan untuk 3 kucing');
});

test("the vet's next date wins over the app's own count, with no duplicate in Jadual", () => {
  const { a, D } = mk();
  a.submit('saveSv', full(D, { dw: '', dt: '', cost: '', nt: '' }));
  const p = a.json("plan(cat('m1')).v");
  assert.equal(p.d, D(21));
  assert.equal(p.vet, 1);
  const t = a.json("tasks().filter(x=>x.c.id==='m1')");
  assert.equal(t.filter(x => x.t === 'vaksin').length, 0, 'the appointment covers it');
  assert.equal(t.filter(x => x.t === 'lawatan').length, 1, 'only the appointment, not today\'s visit');
  assert.match(a.json("vxBox(cat('m1'))"), /Seterusnya:<\/span> .*Dari kad vet<\/span> · dos ke-3/);
});

test('without a vet date the app keeps counting by itself', () => {
  const { a, D } = mk();
  a.submit('saveSv', full(D, { nx: '', nt: '' }));
  const p = a.json("plan(cat('m1')).v");
  assert.equal(p.d, D(28));
  assert.equal(p.vet, undefined);
  assert.equal(a.json("S.recs.filter(r=>r.type==='lawatan'&&!r.done&&r.sv)").length, 0);
});

test('the visit form checks its fields', () => {
  const { a, D } = mk();
  const msg = x => { a.submit('saveSv', full(D, x)); return a.json('messages').at(-1); };
  assert.equal(msg({ cats: [] }), 'Pilih sekurang-kurangnya seekor kucing');
  assert.equal(msg({ dv: '', dw: '', dt: '', do: '' }), 'Tanda sekurang-kurangnya satu perkara yang dibuat');
  assert.equal(msg({ vt: 'lain', vtx: '' }), 'Masukkan nama vaksin');
  assert.equal(msg({ wn: '' }), 'Masukkan nama ubat cacing');
  assert.equal(msg({ do: 'on', on: '' }), 'Tulis rawatan lain yang diberi');
  assert.equal(msg({ w_m1: '45000' }), 'Berat Mochi mesti antara 1 g hingga 30 kg');
  assert.equal(msg({ nx: D(0) }), 'Tarikh temujanji mesti selepas tarikh sesi');
  assert.equal(msg({ date: D(3) }), 'Masukkan tarikh sesi yang sah, hari ini atau sebelumnya');
  assert.equal(a.json('S.recs.length'), 3, 'nothing saved while invalid');
  a.submit('saveSv', full(D, { vt: 'lain', vtx: 'F5', dw: '', dt: '' }));
  assert.equal(a.json("S.recs.find(r=>r.sv&&r.type==='vaksin').name"), 'F5');
});

test('the visit form has no photo field', () => {
  const { a } = mk();
  a.run("svForm('m1')");
  assert.doesNotMatch(sh(a), /type="file"/);
  assert.doesNotMatch(sh(a), /Gambar kad vet/);
});

test('backups keep the vet-card fields and drop broken ones', () => {
  const a = app();
  const T = a.run('td()');
  const out = a.json(`clean(${JSON.stringify({ cats: [{ id: 'm1', name: 'M' }], vets: [], bk: 0, recs: [{ id: 'a', cat: 'm1', type: 'vaksin', date: T, name: 'F3', brand: 'Felocell 3', batch: 'B1', nx: '2099-01-01', sv: 's1', img: 'i1' }, { id: 'b', cat: 'm1', type: 'vaksin', date: T, name: 'F3', nx: '2000-01-01', img: 'ghost' }, { id: 'c', cat: 'm1', type: 'lawatan', date: T, name: 'Sesi vet', done: 1, sv: 's1', img: 'i1' }], imgs: { i1: IMG, i2: IMG, bad: 'x' } })})`);
  const [x, y, z] = out.recs;
  assert.equal(x.brand, 'Felocell 3');
  assert.equal(x.batch, 'B1');
  assert.equal(x.nx, '2099-01-01');
  assert.equal(x.sv, 's1');
  assert.equal(y.nx, undefined, 'a next date before the vaccine is dropped');
  assert.equal(z.done, 1);
  assert.equal(out.imgs, undefined, 'old preview photos are dropped');
  assert.equal(x.img, undefined);
  assert.equal(z.img, undefined);
});

test('the single Vaksin form also takes brand, batch and the next date from the vet', () => {
  const { a, D } = mk();
  a.run("cid='mm';tab='vaksin';recForm()");
  assert.match(sh(a), /name="brand"/);
  assert.match(sh(a), /name="nx" type="date"/);
  a.submit('saveRec', { date: D(0), name: 'F3 (Tricat)', brand: 'Purevax RCP', batch: '', nx: D(365), note: '' });
  const r = a.json("S.recs.find(r=>r.cat==='mm')");
  assert.equal(r.brand, 'Purevax RCP');
  assert.equal(r.batch, undefined);
  assert.equal(r.nx, D(365));
  a.submit('saveRec', { date: D(0), name: 'F3', nx: D(0) });
  assert.equal(a.json('messages').at(-1), 'Tarikh seterusnya mesti selepas tarikh vaksin');
});

test('English translates the vet visit texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('Sesi vet'), 'Vet visit');
  assert.equal(t('Sesi vet disimpan untuk 3 kucing'), 'Vet visit saved for 3 cats');
  assert.equal(t('(1 kucing)'), '(1 cat)');
  assert.equal(t('Mochi dos ke-2 · Michan dos ke-2'), 'Mochi dose 2 · Michan dose 2');
  assert.equal(t('Temujanji seterusnya (dari kad vet)'), 'Next appointment (from the vet card)');
  assert.equal(t('Dari kad vet'), 'From the vet card');
});

test('Home shows every cat booked for the same appointment, and the calendar gets one event for them', () => {
  const { a, D } = mk();
  a.submit('saveSv', full(D, { cats: ['m1', 'm2'], dw: '', dt: '', cost: '' }));
  const h = a.json('apptCard()');
  assert.equal((h.match(/class="row" data-action="openCat"/g) || []).length, 2, 'both cats listed');
  assert.match(h, /Mochi[\s\S]*Michan/);
  const ids = a.json("S.recs.filter(r=>r.type==='lawatan'&&!r.done).map(r=>r.id)");
  assert.match(h, new RegExp(`data-action="calOne" data-id="${ids.join(',')}"`));
  a.run('globalThis.__ev=[];icsSave=(e)=>__ev.push(...e)');
  a.run(`calOne(${JSON.stringify(ids.join(','))})`);
  const ev = a.json('__ev');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].title, 'Vet: Temujanji vaksin (Mochi, Michan)');
  assert.equal(ev[0].time, '10:30');
});

test('appointments at a different time or clinic stay separate on Home', () => {
  const { a, D } = mk();
  a.run(`S.recs.push({id:'x1',cat:'m1',type:'lawatan',date:'${D(5)}',time:'10:00',name:'Pemeriksaan',clinic:'v1'},{id:'x2',cat:'m2',type:'lawatan',date:'${D(5)}',time:'11:00',name:'Pemeriksaan',clinic:'v1'})`);
  const h = a.json('apptCard()');
  assert.equal((h.match(/class="row" data-action="openCat"/g) || []).length, 1, 'only the 10:00 one');
  assert.match(h, /data-action="calOne" data-id="x1"/);
});
