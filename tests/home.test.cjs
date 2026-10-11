const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const click = (a, dataset) => a.events.click({ preventDefault() {}, target: { closest: () => ({ dataset }) } });
const VETS = [{ id: 'v1', name: 'PetCare Hospital', tel: '03-1234 5678', addr: 'Main Street 1', main: true }];
const world = (extra = {}) => {
  const today = app().run('td()');
  const cats = [
    { id: 'a', name: 'Oreo', sex: 'Jantan', dob: addDays(today, -45), dobx: 'Anggaran' },
    { id: 'b', name: 'Mochi', sex: 'Betina', dob: addDays(today, -600) },
    { id: 'c', name: 'Luna', sex: 'Betina', dob: addDays(today, -45) },
    { id: 'd', name: 'Kiki', sex: 'Betina' },
  ];
  const recs = [
    { id: 'r1', cat: 'a', type: 'berat', date: today, val: 650 }, { id: 'r2', cat: 'a', type: 'berat', date: addDays(today, -1), val: 600 },
    { id: 'r3', cat: 'a', type: 'cacing', date: addDays(today, -3), name: 'Drontal' }, { id: 'r4', cat: 'a', type: 'vaksin', date: addDays(today, -3), name: 'F3' },
    { id: 'r5', cat: 'b', type: 'berat', date: addDays(today, -10), val: 3400 }, { id: 'r6', cat: 'b', type: 'berat', date: addDays(today, -40), val: 3300 },
    { id: 'r7', cat: 'b', type: 'vaksin', date: addDays(today, -300), name: 'Rabies' },
    { id: 'r8', cat: 'a', type: 'lawatan', date: addDays(today, 5), time: '10:30', name: 'Checkup', clinic: 'v1' },
    { id: 'r9', cat: 'a', type: 'lawatan', date: addDays(today, -20), name: 'Flu', clinic: 'v1' },
    { id: 'r10', cat: 'c', type: 'berat', date: addDays(today, -3), val: 600 },
  ];
  const a = app({ data: { version: 2, cats, recs, vets: VETS, bk: 0, ...extra } });
  a.today = today;
  return a;
};
const html = (a, fn) => a.json(fn);

test('the dashboard and its new actions use delegated data-action attributes only', () => {
  const a = world();
  const home = html(a, 'home()');
  assert.doesNotMatch(home, /\bon(?:click|submit|change|input)=/);
  for (const action of ['quickW', 'addRec', 'task', 'openCat', 'catForm', 'go']) assert.match(home, new RegExp('data-action="' + action + '"'));
  assert.doesNotMatch(home, /class="rail"|class="st"|class="qw"/);
});

test('Today\'s focus counts what is due, what is late and what is already done', () => {
  const a = world();
  const f = html(a, 'focus()');
  assert.match(f, /4 perkara hari ini · 1 lewat/);
  assert.match(f, /1 daripada 5 selesai/);
  assert.match(f, /width:20%/);
  const rows = f.match(/<button class="row fr[^"]*"/g);
  assert.equal(rows.length, 5);
  assert.equal(rows.filter(r => r.includes(' dn')).length, 1);
  assert.ok(rows.at(-1).includes(' dn'), 'finished items come last');
  assert.match(f, /<i class="cb">✓<\/i>[\s\S]*Timbang berat Oreo/);
  assert.match(f, /Lewat 2 hari/);
  assert.match(f, /data-action="task" data-id="c" data-type="berat"/);
  assert.match(f, /data-action="openCat" data-id="a" data-tab="berat"/);
});

test('Today\'s focus reports an empty and a fully finished day', () => {
  const today = app().run('td()');
  const empty = app({ data: { version: 2, cats: [{ id: 'a', name: 'Luna' }], recs: [], vets: [], bk: 0 } });
  assert.match(empty.json('focus()'), /Tiada tugasan hari ini/);
  assert.doesNotMatch(empty.json('focus()'), /class="prog"/);
  const done = app({ data: { version: 2, cats: [{ id: 'a', name: 'Oreo', dob: addDays(today, -45) }], recs: ['berat', 'cacing', 'vaksin'].map((type, i) => ({ id: 'r' + i, cat: 'a', type, date: today, ...(type === 'berat' ? { val: 650 } : { name: 'x' }) })), vets: [], bk: 0 } });
  const f = done.json('focus()');
  assert.match(f, /Semua beres hari ini/);
  assert.match(f, /3 daripada 3 selesai/);
  assert.match(f, /width:100%/);
});

test('a rabies shot recorded today is shown as Vaksin rabies', () => {
  const today = app().run('td()');
  const a = app({ data: { version: 2, cats: [{ id: 'a', name: 'Oreo', dob: addDays(today, -45) }], recs: [{ id: 'r1', cat: 'a', type: 'vaksin', date: today, name: 'Rabies' }], vets: [], bk: 0 } });
  assert.match(a.json('focus()'), /Vaksin rabies Oreo/);
});

test('"Akan datang" only lists items from tomorrow onwards', () => {
  const a = world();
  const upcoming = html(a, 'home()').split('<h2>Akan datang</h2>')[1];
  assert.ok(upcoming.includes('class="row"'));
  assert.doesNotMatch(upcoming, /class="pill[^"]*">(?:Hari ini|Lewat)/);
});

test('Next appointment picks the earliest upcoming visit and links the clinic', () => {
  const a = world();
  const c = html(a, 'apptCard()');
  assert.match(c, /Temujanji seterusnya/);
  assert.match(c, /Checkup/);
  assert.match(c, /Oreo/);
  assert.match(c, /5 hari lagi/);
  assert.match(c, /10:30/);
  assert.match(c, /PetCare Hospital/);
  assert.match(c, /href="tel:03-12345678"/);
  assert.match(c, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=PetCare%20Hospital%20Main%20Street%201"/);
  assert.match(c, /data-action="openCat" data-id="a" data-tab="lawatan"/);
});

test('Next appointment ignores past visits, orders by time and highlights today', () => {
  const today = app().run('td()');
  const visit = (id, date, time, name) => ({ id, cat: 'a', type: 'lawatan', date, ...(time ? { time } : {}), name });
  const a = app({ data: { version: 2, cats: [{ id: 'a', name: 'Oreo' }], vets: [], bk: 0, recs: [visit('p', addDays(today, -1), '09:00', 'Past'), visit('t3', today, undefined, 'Anytime'), visit('t2', today, '15:00', 'Afternoon'), visit('t1', today, '09:00', 'Morning')] } });
  const c = a.json('apptCard()');
  assert.match(c, /Morning/);
  assert.match(c, /pill hot">Hari ini/);
  assert.doesNotMatch(c, /Past/);
  assert.doesNotMatch(c, /href="tel:|google\.com\/maps/, 'no clinic, no call or map buttons');
  assert.match(c, /Lihat/);
});

test('Next appointment shows an add button when nothing is booked', () => {
  const a = app();
  const c = a.json('apptCard()');
  assert.match(c, /Tiada temujanji akan datang/);
  assert.match(c, /data-action="addAppt"/);
});

test('cat cards show age, latest weight with trend and a plain status', () => {
  const a = world();
  const cards = html(a, 'catCards(tasks())');
  const card = name => cards.split('<button class="kc2').slice(1).find(x => x.includes(`<b class="kn">${name}</b>`));
  assert.equal((cards.match(/<button class="kc2/g) || []).length, 5, 'four cats and an add card');
  assert.match(card('Oreo'), /650 g[\s\S]*▲ 50 g[\s\S]*pill ok">Terkini/);
  assert.match(card('Oreo'), /^ j"/, 'male cards use the blue theme');
  assert.match(card('Mochi'), /3\.4 kg[\s\S]*class="up">▲ 100 g[\s\S]*pill hot">2 hari ini/);
  assert.match(card('Luna'), /pill bad">1 lewat/);
  assert.match(card('Kiki'), /Belum ditimbang[\s\S]*pill warn">Isi tarikh lahir/);
  assert.match(cards, /data-action="catForm"[\s\S]*Tambah kucing/);
  assert.match(cards, /data-action="go" data-view="cats">Lihat semua/);
  const down = world();
  down.run("S.recs.push({id:'x',cat:'b',type:'berat',date:td(),val:3000})");
  assert.match(down.json('catCards(tasks())'), /class="dn2">▼ 400 g/);
});

test('quick actions: call the main clinic, or offer to add one', () => {
  assert.match(world().json('qactions()'), /href="tel:03-12345678"[\s\S]*Telefon vet[\s\S]*PetCare Hospital/);
  const none = app({ data: { version: 2, cats: [{ id: 'a', name: 'Oreo' }], recs: [], vets: [], bk: 0 } });
  assert.match(none.json('qactions()'), /data-action="vetForm"[\s\S]*Tambah vet/);
  const noPhone = app({ data: { version: 2, cats: [{ id: 'a', name: 'Oreo' }], recs: [], vets: [{ id: 'v', name: 'No Phone', main: true }], bk: 0 } });
  assert.doesNotMatch(noPhone.json('qactions()'), /href="tel:/);
  assert.match(noPhone.json('qactions()'), /Tambah vet/);
});

test('Add record walks through cat, record type and form with delegated events', () => {
  const a = world();
  click(a, { action: 'addRec' });
  assert.match(a.elements.get('#sh').innerHTML, /Pilih kucing/);
  assert.equal((a.elements.get('#sh').innerHTML.match(/data-action="recType"/g) || []).length, 4);
  click(a, { action: 'recType', id: 'b' });
  const types = a.elements.get('#sh').innerHTML;
  assert.match(types, /Jenis rekod/);
  assert.match(types, /Mochi/);
  assert.deepEqual([...types.matchAll(/data-tab="(\w+)"/g)].map(m => m[1]), ['berat', 'vaksin', 'cacing', 'lawatan', 'sihat']);
  click(a, { action: 'pickRec', id: 'b', tab: 'lawatan' });
  assert.deepEqual(a.json('[cid,tab]'), ['b', 'lawatan']);
  assert.match(a.elements.get('#sh').innerHTML, /data-submit="rec"[\s\S]*Sebab lawatan/);
  assert.equal(a.elements.get('#sh').hidden, false);
});

test('with one cat Add record skips the cat chooser', () => {
  const a = app({ data: { version: 2, cats: [{ id: 'a', name: 'Oreo' }], recs: [], vets: [], bk: 0 } });
  click(a, { action: 'addRec' });
  assert.match(a.elements.get('#sh').innerHTML, /Jenis rekod/);
  assert.doesNotMatch(a.elements.get('#sh').innerHTML, /Pilih kucing/);
});

test('Add appointment asks which cat when there are several and opens the visit form', () => {
  const a = world();
  click(a, { action: 'addAppt' });
  assert.match(a.elements.get('#sh').innerHTML, /Pilih kucing/);
  click(a, { action: 'pickRec', id: 'c', tab: 'lawatan' });
  assert.deepEqual(a.json('[cid,tab]'), ['c', 'lawatan']);
  const one = app({ data: { version: 2, cats: [{ id: 'a', name: 'Oreo' }], recs: [], vets: [], bk: 0 } });
  click(one, { action: 'addAppt' });
  assert.match(one.elements.get('#sh').innerHTML, /Tarikh akan datang dipaparkan sebagai temujanji/);
});

test('recording today\'s weight moves the task from pending to done', () => {
  const a = world();
  a.run("cid='c'");
  a.submit('saveRec', { date: a.today, val: '620' }, "'','berat'");
  const f = a.json('focus()');
  assert.match(f, /3 perkara hari ini/);
  assert.match(f, /2 daripada 5 selesai|2 daripada 6 selesai/);
  assert.match(f, /dn"[\s\S]*Timbang berat Luna/);
  assert.doesNotMatch(f, /Lewat 2 hari/);
});

test('the dashboard renders for every view without throwing and the backup nudge follows the setting', () => {
  const a = world();
  for (const v of ['home', 'cats', 'jd', 'more', 'vet', 'set']) { click(a, { action: 'go', view: v }); assert.ok(a.elements.get('#app').innerHTML.length > 50, v); }
  click(a, { action: 'go', view: 'home' });
  assert.match(a.elements.get('#app').innerHTML, /Buat backup data/);
  a.run('SET.bk=0');
  click(a, { action: 'go', view: 'home' });
  assert.doesNotMatch(a.elements.get('#app').innerHTML, /Buat backup data/);
});
