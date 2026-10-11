const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./helpers.cjs');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const SCHEMES = ['sakura', 'langit', 'pudina', 'lavender', 'aprikot'];
const root = a => a.run("document.documentElement={attrs:{},setAttribute(k,v){this.attrs[k]=v}}");
const attrs = a => a.json('document.documentElement.attrs');

test('theme defaults to the Sakura scheme and follows the system mode', () => {
  const a = app();
  assert.equal(a.json('SET.scheme'), 'sakura');
  assert.equal(a.json('SET.mode'), 'system');
});

test('applyTheme sets scheme and resolved mode on the document element', () => {
  const a = app();
  root(a);
  a.run("SET.mode='light';applyTheme()");
  assert.deepEqual(attrs(a), { 'data-scheme': 'sakura', 'data-mode': 'light' });
  a.run("SET.mode='dark';SET.scheme='langit';applyTheme()");
  assert.deepEqual(attrs(a), { 'data-scheme': 'langit', 'data-mode': 'dark' });
});

test('system mode resolves from the device preference', () => {
  const a = app();
  root(a);
  a.run("matchMedia=()=>({matches:true});SET.mode='system';applyTheme()");
  assert.equal(attrs(a)['data-mode'], 'dark');
  a.run("matchMedia=()=>({matches:false});applyTheme()");
  assert.equal(attrs(a)['data-mode'], 'light');
  a.run("SET.mode='dark';applyTheme()");
  assert.equal(attrs(a)['data-mode'], 'dark', 'explicit dark ignores a light device');
});

test('choices persist in the settings key and never in the data or backups', () => {
  const a = app();
  root(a);
  a.run("setScheme('lavender');setMode('dark')");
  assert.equal(JSON.parse(a.settings()).scheme, 'lavender');
  assert.equal(JSON.parse(a.settings()).mode, 'dark');
  assert.deepEqual(attrs(a), { 'data-scheme': 'lavender', 'data-mode': 'dark' });
  assert.ok(!/lavender|dark/.test(a.storage()));
  assert.ok(!/lavender/.test(a.run('JSON.stringify(S)')));
});

test('saved theme is restored and invalid stored values are ignored', () => {
  const ok = app({ settings: { v: 1, scheme: 'pudina', mode: 'light' } });
  assert.deepEqual([ok.json('SET.scheme'), ok.json('SET.mode')], ['pudina', 'light']);
  const bad = app({ settings: { v: 1, scheme: 'neon', mode: 'auto' } });
  assert.deepEqual([bad.json('SET.scheme'), bad.json('SET.mode')], ['sakura', 'system']);
  const proto = app({ settings: { v: 1, scheme: 'constructor', mode: '__proto__' } });
  assert.deepEqual([proto.json('SET.scheme'), proto.json('SET.mode')], ['sakura', 'system']);
});

test('setters reject unknown values and roll back when saving fails', () => {
  const a = app();
  a.run("setScheme('neon');setMode('auto')");
  assert.deepEqual([a.json('SET.scheme'), a.json('SET.mode')], ['sakura', 'system']);
  assert.equal(a.settings(), null);
  const f = app({ failSave: true });
  f.run("setMode('dark')");
  assert.equal(f.json('SET.mode'), 'system');
  assert.match(f.json('messages.at(-1)'), /Gagal menyimpan/);
});

test('theme settings page lists every scheme and mode and marks the active ones', () => {
  const a = app();
  a.run("view='set';ssub='tema'");
  const page = a.run('setv()');
  for (const k of SCHEMES) assert.match(page, new RegExp(`data-action="setScheme" data-v="${k}"`));
  for (const k of ['system', 'light', 'dark']) assert.match(page, new RegExp(`data-action="setMode" data-v="${k}"`));
  assert.match(page, /class="on" data-action="setScheme" data-v="sakura" aria-pressed="true"/);
  assert.match(page, /class="on" data-action="setMode" data-v="system"/);
  assert.ok(!/onclick=|style="background/.test(page), 'no inline handlers');
});

test('the Setting list shows the active theme and the English labels translate', () => {
  const a = app({ settings: { v: 1, lang: 'en', scheme: 'langit', mode: 'dark' } });
  a.run("view='set';ssub=''");
  const list = a.run('trs(setv())');
  assert.match(list, /Sky · Dark/);
  const words = ['Mod paparan', 'Sistem', 'Cerah', 'Gelap', 'Skema warna', 'Langit', 'Pudina', 'Aprikot', 'Tema ditukar'];
  assert.deepEqual(a.json(`${JSON.stringify(words)}.map(trs)`), ['Display mode', 'System', 'Light', 'Dark', 'Colour scheme', 'Sky', 'Mint', 'Apricot', 'Theme changed']);
});

test('stylesheet defines every scheme in light and dark and a system fallback', () => {
  for (const k of SCHEMES.slice(1)) {
    assert.match(html, new RegExp(`:root\\[data-scheme=${k}\\]\\{`));
    assert.match(html, new RegExp(`:root\\[data-scheme=${k}\\]\\[data-mode=dark\\]\\{`));
  }
  assert.match(html, /:root\[data-mode=dark\]\{/);
  assert.match(html, /@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-mode\]\)\{/);
  assert.ok(!/<html[^>]*data-theme/.test(html));
});

test('the PDF report and gender cards keep their own light palette', () => {
  assert.match(html, /:root,\.rp\{--bg:#FBF5F6/, 'report resets to the light palette');
  assert.match(html, /\.th-j\{[^}]*--btn:var\(--jbtn\)/);
  assert.match(html, /\.kc\.j\{[^}]*--btn:var\(--jbtn\)/);
});
