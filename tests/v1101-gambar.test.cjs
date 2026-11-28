const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { app } = require('./helpers.cjs');
const fixture = n => fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8');

test('profile form shows a round photo preview with Tukar gambar / Buang', () => {
  const a = app({ data: JSON.parse(fixture('backup-v1.8.json')) });
  a.run("try{catForm('oreo1')}catch(e){}");
  const h = a.elements.get('#sh').innerHTML;
  assert.match(h, /class="pha" id="phav"><img/);
  assert.match(h, /Tukar gambar<input type="file" accept="image\/\*" data-change="pic" class="vh">/);
  assert.match(h, /data-action="picDel">Buang</);
  assert.match(h, /id="phsz">\d+ KB</);
  a.run("try{catForm('mochi2')}catch(e){}");
  const h2 = a.elements.get('#sh').innerHTML;
  assert.match(h2, /Pilih gambar<input/);
  assert.doesNotMatch(h2, /picDel/);
  assert.match(h2, /id="phsz"><\/small>/);
});

test('crop sheet actions are wired and output is a square 400 px photo', () => {
  const a = app();
  for (const k of ['crRot', 'crNo', 'crOk']) assert.equal(a.run(`typeof clickActions.${k}`), 'function', k);
  assert.equal(a.run('PHO'), 400);
  assert.equal(a.run("phKB('data:image/jpeg;base64,'+'A'.repeat(40960))"), '30 KB');
  assert.equal(a.run('crOk()'), undefined, 'no crash when nothing is open');
});

test('crop texts are translated', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  assert.deepEqual(a.json('["Laraskan gambar","Guna gambar","Tukar gambar","Pilih gambar","Buang","Putar","Jadual ubat"].map(trs)'), ['Adjust photo', 'Use photo', 'Change photo', 'Choose photo', 'Remove', 'Rotate', 'Medicine schedule']);
});

test('record lists show the 5 newest with Tunjuk semua, graph keeps all', () => {
  const recs = Array.from({ length: 12 }, (_, i) => ({ id: 'w' + i, cat: 'a', type: 'berat', date: `2026-10-${String(i + 1).padStart(2, '0')}`, val: 3000 + i * 10 }));
  const a = app({ data: { version: 2, bk: 0, cats: [{ id: 'a', name: 'Mochi', sex: 'Jantan' }], vets: [], recs } });
  a.run("cid='a';tab='berat';RALL=null");
  let h = a.run('catv()');
  assert.equal((h.match(/data-action="delRec"/g) || []).length, 5);
  assert.match(h, /data-action="recAll">Tunjuk semua \(12\)</);
  assert.match(h, /3\.11 kg|3110 g/, 'newest weight shown');
  a.run("clickActions.recAll()");
  h = a.run('catv()');
  assert.equal((h.match(/data-action="delRec"/g) || []).length, 12);
  assert.match(h, /Tunjuk 5 terkini/);
  a.run("clickActions.tab({dataset:{tab:'berat'}})");
  assert.equal((a.run('catv()').match(/data-action="delRec"/g) || []).length, 5, 'tab change collapses');
  a.run("tab='vaksin'");
  assert.doesNotMatch(a.run('catv()'), /recAll/, 'no button with 5 or fewer records');
  const en = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  assert.deepEqual(en.json('["Tunjuk semua (12)","Tunjuk 5 terkini"].map(trs)'), ['Show all (12)', 'Show latest 5']);
});

test('vaccine type comes from the sticker name; owners never need to know F3/F4', () => {
  const a = app();
  const det = s => a.json(`vxDet(${JSON.stringify(s)})`);
  assert.equal(det('Felocell 4').n, 'F4');
  assert.equal(det('Felocell 3').n, 'F3');
  assert.equal(det('Purevax RCPCh').n, 'F4');
  assert.equal(det('Purevax RCP').n, 'F3');
  assert.equal(det('Purevax RCPCh FeLV').n, 'F5');
  assert.equal(det('Nobivac Tricat Trio').n, 'F3');
  assert.equal(det('Rabisin').n, 'Rabies');
  assert.equal(det('Purevax RCP Rabies').n, 'F3 + Rabies');
  assert.equal(det('Purevax FeLV').k, 'x');
  assert.equal(det('Ubat entah'), null);
  assert.equal(det(''), null);
  // No sticker: chips decide; default is core.
  assert.deepEqual(a.json("vkVal({brand:'',vko:'1',vk:'c',vkn:''})"), { name: 'Vaksin utama' });
  assert.deepEqual(a.json("vkVal({brand:'',vko:'1',vk:'r',vkn:''})"), { name: 'Rabies' });
  assert.deepEqual(a.json("vkVal({brand:'',vko:'1',vk:'x',vkn:'Bordetella'})"), { name: 'Bordetella', vk: 'x' });
  // Owner pressed Tukar (vko=2): their choice wins over the sticker.
  assert.deepEqual(a.json("vkVal({brand:'Felocell 4',vko:'2',vk:'r',vkn:''})"), { name: 'Rabies' });
  // Schedule: core counts, other vaccines do not.
  assert.equal(a.run("isCore({name:'Vaksin utama'})"), true);
  assert.equal(a.run("isCore({name:'F4'})"), true);
  assert.equal(a.run("isCore({name:'Bordetella',vk:'x'})"), false);
  assert.equal(a.run("isCore({name:'FeLV'})"), false, 'old FeLV-only records no longer count as core');
  assert.equal(a.run("isCore({name:'F3 + FeLV'})"), true);
});

test('vaccine form saves the detected type and keeps vk through backup', () => {
  const a = app({ data: { version: 2, bk: 0, cats: [{ id: 'a', name: 'Mochi', sex: 'Jantan', dob: '2026-08-01' }], vets: [], recs: [] } });
  a.run("cid='a'");
  a.submit('saveRec', { date: '2026-10-10', brand: 'Felocell 4', vko: '', vk: 'c', vkn: '', vkh: '', batch: '855336', nx: '2026-11-07', note: '' }, "'','vaksin'");
  let r = a.json("S.recs[0]");
  assert.equal(r.name, 'F4'); assert.equal(r.brand, 'Felocell 4'); assert.equal(r.vk, undefined); assert.equal(r.vko, undefined);
  a.submit('saveRec', { date: '2026-10-10', brand: '', vko: '1', vk: 'x', vkn: 'Bordetella', vkh: '' }, "'','vaksin'");
  r = a.json("S.recs.find(x=>x.name==='Bordetella')");
  assert.equal(r.vk, 'x');
  const b = app({ raw: a.storage() });
  assert.equal(b.json("S.recs.find(x=>x.name==='Bordetella').vk"), 'x');
  b.run("cid='a';recForm(S.recs.find(x=>x.name==='Bordetella').id)");
  const h = b.elements.get('#sh').innerHTML;
  assert.match(h, /value="x" data-change="vkUpd" checked/);
  assert.match(h, /name="vkn" maxlength="60" placeholder="cth. FeLV" value="Bordetella"/);
  const en = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  assert.deepEqual(en.json('["F4 · vaksin utama","Selsema kucing, panleukopenia + Chlamydia","Tak pasti? Pilih Vaksin utama.","F3 + Rabies · vaksin utama + rabies"].map(trs)'), ['F4 · core vaccine', 'Cat flu, panleukopenia + Chlamydia', 'Not sure? Choose Core vaccine.', 'F3 + Rabies · core vaccine + rabies']);
});

test('Today\'s focus: one row per appointment group; tap opens Isi Sesi vet / Tanda selesai / Tukar tarikh / Batal', () => {
  const today = app().run('td()');
  const cats = ['m', 'o', 'c'].map((id, i) => ({ id, name: ['Mochi', 'Oreo', 'Michan'][i], sex: 'Jantan', dob: '2026-07-01' }));
  const recs = cats.map((c, i) => ({ id: 'ap' + i, cat: c.id, type: 'lawatan', date: today, time: '15:00', clinic: 'v1', name: 'Vaksin & pemeriksaan' }));
  const a = app({ data: { version: 2, bk: 0, cats, vets: [{ id: 'v1', name: 'The Animal Clinic Ijok', main: true }], recs } });
  let f = a.run('focus()');
  assert.equal((f.match(/data-action="apOpen"/g) || []).length, 1, 'three cats, one appointment row');
  assert.match(f, /<b>Temujanji vet<\/b><span class="mute">Mochi, Oreo, Michan · 15:00/);
  assert.match(a.run('apptCard()'), /data-action="apOpen" data-id="ap0"[^>]*>.*Selesai/);
  a.run("apOpen('ap0')");
  const h = a.elements.get('#sh').innerHTML;
  for (const s of ['Isi Sesi vet', 'Tanda selesai sahaja', 'Tukar tarikh', 'Batal temujanji', 'Michan']) assert.match(h, new RegExp(s));
  // Isi Sesi vet: cats, date and clinic filled in; saving marks the whole group done.
  a.run('apSv()');
  const sv = a.elements.get('#sh').innerHTML;
  assert.match(sv, /value="m" data-change="svUpd" checked/); assert.match(sv, /value="c" data-change="svUpd" checked/);
  assert.match(sv, /name="ap" value="ap0"/);
  a.submit('saveSv', { cats: ['m', 'o', 'c'], date: today, clinic: 'v1', ap: 'ap0', dw: 'on', wn: 'Vermixel Cat' });
  assert.deepEqual(a.json("S.recs.filter(r=>r.id.startsWith('ap')).map(r=>r.done)"), [1, 1, 1]);
  assert.doesNotMatch(a.run('focus()'), /apOpen/);
  assert.match(a.run('apptCard()'), /Tiada temujanji akan datang/);
});

test('appointment: Tanda selesai, Tukar tarikh and Batal work on the whole group', () => {
  const today = app().run('td()');
  const cats = [{ id: 'm', name: 'Mochi' }, { id: 'o', name: 'Oreo' }];
  const mk = () => app({ data: { version: 2, bk: 0, cats, vets: [], recs: cats.map((c, i) => ({ id: 'ap' + i, cat: c.id, type: 'lawatan', date: today, name: 'Temujanji vet' })) } });
  let a = mk(); a.run("apOpen('ap0');apDone()");
  assert.deepEqual(a.json("S.recs.map(r=>r.done)"), [1, 1]);
  a = mk(); a.run("apOpen('ap0');apDate()");
  const nd = a.run("addD(td(),7)");
  a.submit('saveApDate', { date: nd, time: '10:30' });
  assert.deepEqual(a.json("S.recs.map(r=>r.date+' '+r.time)"), [nd + ' 10:30', nd + ' 10:30']);
  a = mk(); a.run("apOpen('ap1');apDel()"); a.run('clickActions.confirm()');
  assert.equal(a.json('S.recs.length'), 0);
});

test('vaccine record: next date from the vet becomes an appointment, kept in step with edits', () => {
  const a = app({ data: { version: 2, bk: 0, cats: [{ id: 'a', name: 'Mochi', dob: '2026-07-01' }], vets: [{ id: 'v1', name: 'Klinik' }], recs: [] } });
  a.run("cid='a'");
  a.submit('saveRec', { date: '2026-10-10', brand: 'Felocell 4', vko: '', vk: 'c', vkn: '', vkh: '', nx: '2026-11-07', nt: '15:00', clinic: 'v1', note: '' }, "'','vaksin'");
  let v = a.json("S.recs.find(r=>r.type==='vaksin')"), ap = a.json("S.recs.find(r=>r.type==='lawatan')");
  assert.equal(v.ap, ap.id); assert.equal(ap.date, '2026-11-07'); assert.equal(ap.time, '15:00'); assert.equal(ap.clinic, 'v1'); assert.equal(ap.name, 'Temujanji vaksin');
  assert.match(a.run('apptCard()'), /Temujanji vaksin/);
  a.run("recForm(S.recs.find(r=>r.type==='vaksin').id)");
  assert.match(a.elements.get('#sh').innerHTML, /name="nt" type="time" value="15:00"/);
  a.submit('saveRec', { date: '2026-10-10', brand: 'Felocell 4', vko: '', vk: 'c', vkn: '', vkh: '', nx: '2026-11-14', nt: '', clinic: 'v1', note: '' }, `'${v.id}','vaksin'`);
  assert.equal(a.json("S.recs.filter(r=>r.type==='lawatan').length"), 1, 'edit moves, does not duplicate');
  assert.equal(a.json("S.recs.find(r=>r.type==='lawatan').date"), '2026-11-14');
  a.submit('saveRec', { date: '2026-10-10', brand: 'Felocell 4', vko: '', vk: 'c', vkn: '', vkh: '', nx: '', nt: '', note: '' }, `'${v.id}','vaksin'`);
  assert.equal(a.json("S.recs.filter(r=>r.type==='lawatan').length"), 0, 'clearing the date removes the appointment');
  const b = app({ raw: a.storage() }); assert.equal(b.json("S.recs.length"), 1);
  const en = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  assert.deepEqual(en.json('["9 selesai hari ini","Isi Sesi vet","Tanda selesai sahaja","Temujanji seterusnya (pilihan)"].map(trs)'), ['9 done today', 'Fill in vet visit', 'Just mark as done', 'Next appointment (optional)']);
});
