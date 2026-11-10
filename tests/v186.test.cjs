const test = require('node:test');
const assert = require('node:assert/strict');
const { app, fs, path } = require('./helpers.cjs');

const root = path.join(__dirname, '..');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
const browserTab = q => !q.includes('display-mode');

test('the install screen shows app screenshots before the install steps (iPhone and Android)', () => {
  for (const ua of [IPHONE, undefined]) {
    const a = app({ ua, media: browserTab });
    a.run('render()');
    const html = a.elements.get('#app').innerHTML;
    assert.match(html, /Pasang Kucingku untuk mula/);
    const pv = html.indexOf('class="pv"'), steps = html.indexOf('class="sts"');
    assert.ok(pv > 0, 'preview shown');
    assert.ok(steps > pv, 'steps come after the preview');
    assert.equal((html.match(/class="pvi"/g) || []).length, 4);
  }
});

test('the one-tap Android install button still sits right under the screenshots', () => {
  const a = app({ media: browserTab });
  a.run("bip={prompt(){},userChoice:Promise.resolve({outcome:'dismissed'})};render()");
  const html = a.elements.get('#app').innerHTML;
  assert.ok(html.indexOf('class="pv"') < html.indexOf('data-action="ixGo"'));
});

test('every screenshot file exists, is small, and has a caption used as alt text', () => {
  const a = app();
  const pv = a.json('PV');
  assert.equal(pv.length, 4);
  for (const [f, caption] of pv) {
    const file = path.join(root, 'img', `pratonton-${f}.webp`);
    assert.ok(fs.existsSync(file), file);
    assert.ok(fs.statSync(file).size < 40 * 1024, `${f} under 40 KB`);
    assert.ok(caption.length > 5);
  }
});

test('the installed app and the "already installed" screen do not show the preview', () => {
  const installed = app({ standalone: true });
  installed.run('render()');
  assert.doesNotMatch(installed.elements.get('#app').innerHTML, /class="pv"/);
  const done = app({ media: browserTab });
  done.run('ixDone=true;render()');
  assert.doesNotMatch(done.elements.get('#app').innerHTML, /class="pv"/);
});

test('the preview captions are translated in English', () => {
  const a = app({ media: browserTab, settings: { v: 1, lang: 'en', bk: 30, unit: 'auto' } });
  for (const [, c] of a.json('PV')) assert.notEqual(a.run(`trs(${JSON.stringify(c)})`), c, c);
  assert.notEqual(a.run("trs('Juga: graf berat, PDF untuk vet, perbelanjaan dan kalendar.')"), 'Juga: graf berat, PDF untuk vet, perbelanjaan dan kalendar.');
});
