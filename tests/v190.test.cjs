const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, seed, source } = require('./helpers.cjs');

// v1.9.0: PDF vet baharu. Seksyen tidak dipotong separuh; jadual dipecah ikut baris dengan tajuk diulang.

test('version is 1.9.0 or later everywhere', () => {
  assert.match(source, /const VER='1\.(9|1\d)\.[0-9]+'/);
  assert.match(require('node:fs').readFileSync(__dirname + '/../sw.js', 'utf8'), /kucingku-1\.(9|1\d)\.[0-9]+/);
});

test('a block that does not fit moves whole to the next page', () => {
  const a = app();
  const pages = a.json('pdfPaginate(1000,1000,[{h:600},{h:500},{h:300}],20)');
  assert.deepEqual(pages, [[{ i: 0 }], [{ i: 1 }, { i: 2 }]]);
});

test('a long table is split by rows only, and the continuation is marked', () => {
  const a = app();
  const rows = Array(30).fill(40);
  const pages = a.json(`pdfPaginate(1000,1000,[{h:300},{h:${50 + 30 * 40 + 2},head:50,tail:2,rows:${JSON.stringify(rows)}}],20)`);
  assert.equal(pages.length, 2);
  const parts = pages.flat().filter(x => x.i === 1);
  assert.equal(parts[0].from, 0); assert.equal(parts[0].cont, false);
  assert.equal(parts[1].from, parts[0].to); assert.equal(parts[1].to, 30); assert.equal(parts[1].cont, true);
  // Every page's content fits: head + rows + tail (+ gap) never exceeds the room.
  const used0 = 300 + 20 + 50 + (parts[0].to - parts[0].from) * 40 + 2;
  assert.ok(used0 <= 1000, 'page 1 overflow ' + used0);
});

test('a heading is never left alone at the bottom of a page', () => {
  const a = app();
  // Room for heading + 1 row only after the first block: the table must start on page 2.
  const pages = a.json('pdfPaginate(1000,1000,[{h:880},{h:252,head:50,tail:2,rows:[40,40,40,40,40]}],20)');
  assert.deepEqual(pages[0], [{ i: 0 }]);
  assert.deepEqual(pages[1], [{ i: 1, from: 0, to: 5, cont: false }]);
});

test('a small table that fits a fresh page is not split across two pages', () => {
  const a = app();
  const pages = a.json('pdfPaginate(1000,1000,[{h:860},{h:172,head:50,tail:2,rows:[40,40,40]}],20)');
  assert.equal(pages.length, 2);
  assert.deepEqual(pages[1], [{ i: 1, from: 0, to: 3, cont: false }]);
});

test('a section taller than a page still covers every row exactly once', () => {
  const a = app();
  const rows = Array(70).fill(40);
  const pages = a.json(`pdfPaginate(900,1000,[{h:${52 + 70 * 40},head:50,tail:2,rows:${JSON.stringify(rows)}}],20)`);
  const parts = pages.flat();
  assert.equal(parts[0].from, 0);
  for (let k = 1; k < parts.length; k++) assert.equal(parts[k].from, parts[k - 1].to);
  assert.equal(parts[parts.length - 1].to, 70);
});

test('continued tables repeat the column headings and say (sambungan)', () => {
  const recs = Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i, cat: 'a', type: 'cacing', date: '2026-0' + (i + 1) + '-01', name: 'DW_' + i }));
  const a = app({ data: { ...seed, recs } });
  const html = a.json("(()=>{const D=rptData(S.cats[0]);const k=D.secs.findIndex(s=>s.t==='Ubat cacing / kutu');return secHtml(D.secs[k],3,6,true)})()");
  assert.match(html, /\(sambungan\)/);
  assert.match(html, /<th>Tarikh<\/th>/);
  assert.match(html, /DW_2/); assert.doesNotMatch(html, /DW_3/);
});

test('report has summary cards, page number and vet notes box; vaccines beyond 4 continue in a list', () => {
  const recs = Array.from({ length: 6 }, (_, i) => ({ id: 'v' + i, cat: 'a', type: 'vaksin', date: '2025-0' + (i + 1) + '-01', name: 'VAC_' + i }));
  recs.push({ id: 'w1', cat: 'a', type: 'berat', date: '2026-01-01', val: 900 }, { id: 'w2', cat: 'a', type: 'berat', date: '2026-02-01', val: 1200 });
  const a = app({ data: { ...seed, recs } });
  const html = a.json('rpt(S.cats[0])');
  for (const t of ['Berat terkini', 'Vaksin terakhir', 'Ubat cacing terakhir', 'Seterusnya', 'Catatan doktor haiwan', 'Halaman 1 / 1', 'Rekod berat'])
    assert.ok(html.includes(t), t);
  for (let i = 0; i < 6; i++) assert.match(html, new RegExp('VAC_' + i));
  const D = a.json('rptData(S.cats[0]).secs.map(s=>s.t||"")');
  assert.ok(D.includes('Vaksin'), 'older vaccines continue as their own list section');
});

test('English PDF translates the new labels and the page number', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  assert.equal(a.json('trs("Halaman 2 / 3")'), 'Page 2 of 3');
  assert.equal(a.json('trs("Catatan doktor haiwan")'), "Vet's notes");
  assert.equal(a.json('trs("(sambungan)")'), '(continued)');
});
