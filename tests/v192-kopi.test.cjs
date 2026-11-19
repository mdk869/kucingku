const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { app } = require('./helpers.cjs');

// v1.9.2: Belanja kopi pembangun melalui DuitNow QR (Touch 'n Go).

test('the Lagi page shows the Belanja kopi card, and the sheet shows the QR with the recipient name', () => {
  const a = app();
  assert.match(a.json('morev()'), /Suka Kucingku\?[\s\S]*data-action="kopi"/);
  a.run('kopiSheet()');
  const sh = a.elements.get('#sh').innerHTML;
  assert.match(sh, /src="img\/duitnow-qr\.png"/);
  assert.match(sh, /Muhammad Khalis bin Abd Rahim/);
  assert.match(sh, /data-action="kopiSave"/);
});

test('the QR image is shipped, small, and cached for offline use', () => {
  const f = path.join(__dirname, '../img/duitnow-qr.png');
  assert.ok(fs.existsSync(f));
  assert.ok(fs.statSync(f).size < 60 * 1024);
  assert.match(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), /'img\/duitnow-qr\.png'/);
});

test('hidden inside a Play Store (TWA) app, where Google Play does not allow tip links', () => {
  const store = new Map();
  const a = app({ extra: { sessionStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } } });
  a.run("document.referrer='android-app://com.example.kucingku'");
  assert.doesNotMatch(a.json('morev()'), /Suka Kucingku\?/);
  a.run("document.referrer=''");
  assert.doesNotMatch(a.json('morev()'), /Suka Kucingku\?/, 'stays hidden for the whole session');
});

test('English translates the Belanja kopi texts', () => {
  const a = app({ settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  const t = x => a.json(`trs(${JSON.stringify(x)})`);
  assert.equal(t('Belanja kopi pembangun'), 'Buy the developer a coffee');
  assert.equal(t('Simpan gambar QR'), 'Save QR image');
  assert.equal(t('Suka Kucingku?'), 'Enjoying Kucingku?');
});
