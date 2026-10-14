const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./helpers.cjs');

// Fixed clock in helpers: 2026-10-11
const data = () => ({
  version: 2, bk: 0,
  cats: [{ id: 'a', name: 'Milo', sex: 'Jantan', dob: '2026-06-01' }, { id: 'b', name: 'Luna', sex: 'Betina', dob: '2025-01-01' }],
  vets: [{ id: 'v1', name: 'Klinik Sayang', tel: '082 123 456', addr: 'Jalan Satok, Kuching', main: true }],
  recs: [
    { id: 'r1', cat: 'a', type: 'vaksin', date: '2026-10-05', name: 'F3', cost: 85 },
    { id: 'r2', cat: 'a', type: 'cacing', date: '2026-10-01', name: 'Drontal', cost: 20.5 },
    { id: 'r3', cat: 'b', type: 'lawatan', date: '2026-09-20', name: 'Demam', cost: 120 },
    { id: 'r4', cat: 'b', type: 'sihat', date: '2025-12-01', name: 'Selsema', cost: 30 },
    { id: 'r5', cat: 'a', type: 'berat', date: '2026-10-10', val: 900, cost: 99 },
    { id: 'r6', cat: 'a', type: 'lawatan', date: '2026-10-20', time: '23:30', name: 'Check, "up"; ok', note: 'Bawa buku\nBawa kad', clinic: 'v1', cost: 200 },
    { id: 'r7', cat: 'b', type: 'lawatan', date: '2026-10-25', name: 'Tanpa masa' },
    { id: 'r8', cat: 'b', type: 'lawatan', date: '2026-08-01', name: 'Lama' },
    { id: 'r10', cat: 'a', type: 'sihat', date: '2026-10-03', name: 'Sifar', cost: 0 },
  ],
});
const click = (a, action, v) => a.events.click({ preventDefault() {}, target: { closest: () => ({ dataset: { action, v } }) } });
const A = (opts = {}) => app({ data: data(), ...opts });

// ---------- Perbelanjaan
test('only past, positive, non-weight costs count as expenses', () => {
  const a = A();
  assert.deepEqual(a.json('costs().map(r=>r.id).sort()'), ['r1', 'r2', 'r3', 'r4']);
});

test('money is formatted as RM with thousands separators and two decimals', () => {
  const a = A();
  assert.deepEqual(a.json('[0,5,1234.5,1000000].map(money)'), ['RM 0.00', 'RM 5.00', 'RM 1,234.50', 'RM 1,000,000.00']);
});

test('period totals: this month, this year, all time and previous period', () => {
  const a = A();
  assert.equal(a.json("rsum(costs().filter(r=>inP(r,'bulan')))"), 105.5);
  assert.equal(a.json("rsum(costs().filter(r=>inP(r,'tahun')))"), 225.5);
  assert.equal(a.json("rsum(costs().filter(r=>inP(r,'semua')))"), 255.5);
  assert.equal(a.json("rsum(costs().filter(prevP('bulan')))"), 120);
  assert.equal(a.json("rsum(costs().filter(prevP('tahun')))"), 30);
  assert.equal(a.json("prevP('semua')"), null);
  assert.equal(a.json('rsum([{cost:0.1},{cost:0.2}])'), 0.3, 'no floating point drift');
});

test('previous month wraps across the year boundary', () => {
  const a = A();
  a.run("Date.now=()=>+new Date('2027-01-15T04:00:00Z')");
  a.run("globalThis.__R=[{date:'2026-12-31',cost:5},{date:'2026-11-30',cost:7}]");
  assert.equal(a.json("globalThis.__R.filter(prevP('bulan')).length"), 1);
});

test('the six-month chart ends at the current month and wraps years', () => {
  const a = A();
  assert.deepEqual(a.json('months6().map(m=>m.k)'), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
});

test('expense screen shows totals, breakdowns and recent records', () => {
  const a = A();
  a.run("view='exp'");
  const page = a.run('expv()');
  assert.match(page, /RM 105\.50/);
  assert.match(page, /Mengikut jenis/);
  assert.match(page, /Mengikut kucing/);
  assert.match(page, /RM 85\.00/);
  assert.match(page, /Bulan lalu RM 120\.00/);
  assert.ok(!/Sifar|Tanpa masa/.test(page), 'zero costs and upcoming visits are hidden');
  assert.ok(!/onclick=/.test(page));
  assert.equal((page.match(/class="ec/g) || []).length, 6);
  const byCat = page.split('Mengikut kucing')[1].split('<h2>')[0];
  assert.ok(byCat.includes('aria-label="Milo"') && !byCat.includes('aria-label="Luna"'), 'cats without costs in the period are left out');
});

test('period switch changes the totals and rejects unknown values', () => {
  const a = A();
  a.run("view='exp'");
  click(a, 'expP', 'semua');
  assert.equal(a.json('expP'), 'semua');
  assert.match(a.run('expv()'), /RM 255\.50/);
  click(a, 'expP', 'x');
  assert.equal(a.json('expP'), 'semua');
});

test('empty expense state explains how to record costs', () => {
  const a = app();
  assert.match(a.run('expv()'), /Belum ada kos direkodkan/);
  assert.equal(a.json('monthCost()'), 0);
});

test('a period without costs still renders the chart and a friendly note', () => {
  const a = A();
  a.run("expP='tahun';S.recs=S.recs.filter(r=>r.id==='r4'||r.type==='berat');Date.now=()=>+new Date('2027-03-01T04:00:00Z')");
  const page = a.run('expv()');
  assert.match(page, /RM 0\.00/);
  assert.match(page, /Tiada kos dalam tempoh ini/);
  assert.equal((page.match(/class="ec/g) || []).length, 6);
});

test('English labels for the expense and calendar screens', () => {
  const a = A({ settings: { v: 1, lang: 'en' } });
  const words = ['Perbelanjaan', 'Bulan ini', 'Mengikut jenis', 'Kalendar', 'Export kalendar (.ics)', '1 rekod', '3 rekod', '1 acara', '4 acara', 'Tiada acara akan datang untuk di-export'];
  assert.deepEqual(a.json(`${JSON.stringify(words)}.map(trs)`), ['Expenses', 'This month', 'By type', 'Calendar', 'Export calendar (.ics)', '1 record', '3 records', '1 event', '4 events', 'No upcoming events to export']);
});

test('Lagi lists Perbelanjaan and Kalendar and keeps the tab highlighted on them', () => {
  const a = A();
  const more = a.run('morev()');
  assert.match(more, /data-view="exp"/);
  assert.match(more, /data-view="cal"/);
  assert.match(more, /RM 105\.50/);
});

// ---------- Kalendar (.ics)
const lines = text => text.split('\r\n');

test('ics helpers escape text and fold long lines on UTF-8 byte boundaries', () => {
  const a = A();
  assert.equal(a.json('icsEsc("a,b;c\\\\d\\ne")'), 'a\\,b\\;c\\\\d\\ne');
  const long = a.json('icsFold("DESCRIPTION:" + "Kucing sihat 🐱 ".repeat(30))');
  for (const l of long.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75, l.length + ' chars');
  assert.equal(long.split('\r\n').slice(1).every(l => l.startsWith(' ')), true);
});

test('calendar contains upcoming appointments with escaped details, reminders and stable UIDs', () => {
  const a = A();
  const text = a.run('icsText(calEvents({a:true}))');
  const L = lines(text);
  assert.equal(L[0], 'BEGIN:VCALENDAR');
  assert.equal(L.at(-2), 'END:VCALENDAR');
  assert.equal(L.at(-1), '');
  assert.equal(text.includes('\n') && !/[^\r]\n/.test(text), true, 'CRLF only');
  assert.equal(L.filter(l => l === 'BEGIN:VEVENT').length, 2);
  assert.ok(L.includes('UID:r6@kucingku'));
  assert.ok(L.includes('UID:r7@kucingku'));
  assert.ok(!text.includes('UID:r8@kucingku'), 'past appointment excluded');
  assert.ok(L.includes('DTSTART:20261020T233000'));
  assert.ok(L.includes('DTEND:20261021T003000'), 'one hour later across midnight');
  assert.ok(L.includes('DTSTART;VALUE=DATE:20261025'));
  assert.ok(L.includes('DTEND;VALUE=DATE:20261026'));
  assert.ok(text.includes('SUMMARY:Vet: Check\\, "up"\\; ok (Milo)'));
  assert.ok(text.includes('LOCATION:Klinik Sayang\\, Jalan Satok\\, Kuching'));
  assert.ok(text.includes('Bawa buku\\nBawa kad'));
  assert.ok(text.includes('TRIGGER:-P1D') && text.includes('TRIGGER:-PT1H'));
  assert.ok(text.includes('TRIGGER:-PT15H') && text.includes('TRIGGER:PT8H'), 'all-day appointment reminders');
  assert.equal(L.filter(l => l === 'BEGIN:VALARM').length, 4);
});

test('care schedule events carry stable per-cat UIDs, never fall in the past and respect the options', () => {
  const a = A();
  const evs = a.json('calEvents({t:true})');
  const uids = evs.map(e => e.uid);
  assert.ok(uids.includes('a-vaksin@kucingku') && uids.includes('a-cacing@kucingku') && uids.includes('b-vaksin@kucingku'));
  assert.ok(uids.includes('a-rabies@kucingku'));
  assert.ok(evs.every(e => e.date >= '2026-10-11'), 'overdue tasks move to today');
  assert.ok(evs.every(e => e.title.includes(' · ')));
  assert.equal(a.json('calEvents({a:false,t:false}).length'), 0);
  assert.equal(a.json('calEvents({a:true}).length'), 2);
});

test('rabies reminder disappears once a rabies shot is recorded', () => {
  const a = A();
  a.run("S.recs.push({id:'rr',cat:'a',type:'vaksin',date:'2026-10-02',name:'Rabies'})");
  assert.ok(!a.json('calEvents({t:true}).map(e=>e.uid)').includes('a-rabies@kucingku'));
});

test('calendar text follows the chosen language', () => {
  const en = A({ settings: { v: 1, lang: 'en' } });
  assert.match(en.run('icsText(calEvents({t:true}))'), /DESCRIPTION:[^\r]*Estimate\. Confirm with your vet\./);
});

test('saving a calendar hands a text/calendar blob to the download service', async () => {
  const a = A();
  a.run("globalThis.__saved=[];getDl=async()=>({save:async x=>{__saved.push(x)}})");
  await a.run("icsSave(calEvents({a:true}),'k.ics')");
  const saved = a.json('__saved.map(x=>({filename:x.filename,type:x.data.type,size:x.data.size}))');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].filename, 'k.ics');
  assert.match(saved[0].type, /^text\/calendar/);
  assert.ok(saved[0].size > 100);
  assert.equal(a.json('messages.at(-1)'), 'Muat turun kalendar dimulakan');
});

test('a host that rejects .ics gets a .txt copy; a declined prompt stays silent; empty exports explain themselves', async () => {
  const a = A();
  a.run("globalThis.__n=[];getDl=async()=>({save:async x=>{__n.push(x.filename);if(x.filename.endsWith('.ics'))throw {code:'rejected_extension'}}})");
  await a.run("icsSave(calEvents({a:true}),'k.ics')");
  assert.deepEqual(a.json('__n'), ['k.ics', 'k.ics.txt']);
  const d = A();
  d.run("getDl=async()=>({save:async()=>{throw {code:'declined'}}})");
  await d.run("icsSave(calEvents({a:true}),'k.ics')");
  assert.ok(!/gagal|dimulakan/.test(d.json('messages.join("|")')));
  const e = A();
  await e.run("icsSave([],'k.ics')");
  assert.equal(e.json('messages.at(-1)'), 'Tiada acara akan datang untuk di-export');
  const f = A();
  f.run("getDl=async()=>({save:async()=>{throw new Error('x')}})");
  await f.run("icsSave(calEvents({a:true}),'k.ics')");
  assert.equal(f.json('messages.at(-1)'), 'Export kalendar gagal');
});

test('single appointment export only accepts real upcoming-or-past visits', async () => {
  const a = A();
  a.run("globalThis.__s=[];getDl=async()=>({save:async x=>{__s.push(x.filename)}})");
  await a.run("calOne('r6')");
  await a.run("calOne('r1')");
  await a.run("calOne('nope')");
  assert.deepEqual(a.json('__s'), ['kucingku-temujanji-2026-10-20.ics']);
});

test('calendar screen toggles options and ignores unknown keys; Home appointment card offers Kalendar', () => {
  const a = A();
  a.run("view='cal'");
  assert.match(a.run('calv()'), /Temujanji vet[\s\S]*2 acara/);
  a.run("calTog('a')");
  assert.equal(a.json('calO.a'), false);
  a.run("calTog('zzz')");
  assert.deepEqual(a.json('calO'), { a: false, t: true });
  assert.match(a.run('apptCard()'), /data-action="calOne" data-id="r6"/);
  assert.ok(!/onclick=/.test(a.run('calv()') + a.run('apptCard()')));
});
