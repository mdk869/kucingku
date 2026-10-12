const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./helpers.cjs');

const root = path.join(__dirname, '..');
const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSf-Abc_123/viewform';
const about = a => a.run("ssub='tentang';setv()");

test('the shipped form is the Kucingku feedback form with the app version prefilled', () => {
  const a = app();
  assert.equal(a.run('fbUrl()'), 'https://docs.google.com/forms/d/e/1FAIpQLSfK5e5iSrBBUDWH5bMCLIxYPe6dWAKIaNkdOt_UXYqnKObJyw/viewform?usp=pp_url&entry.103926294=' + encodeURIComponent('Kucingku v' + a.run('VER') + ' · BM'));
});

test('without a configured form the About page shows a button that explains the form is not ready', () => {
  const a = app();
  a.run("FB.form=''");
  assert.equal(a.run('fbUrl()'), '');
  const html = about(a);
  assert.match(html, /Maklum balas &amp; sokongan/);
  assert.match(html, /data-action="feedback"/);
  assert.match(html, /Privasi/);
  a.run("clickActions.feedback()");
  assert.deepEqual(a.json('messages'), ['Borang maklum balas belum tersedia. Cuba lagi kemudian.']);
});

test('a configured Google Form opens in a new tab and prefills the app version and language', () => {
  const a = app();
  a.run(`FB.form='${FORM}';FB.ver='entry.123456'`);
  const url = a.run('fbUrl()');
  assert.equal(url, FORM + '?usp=pp_url&entry.123456=' + encodeURIComponent('Kucingku v' + a.run('VER') + ' · BM'));
  a.run("setLang('en')");
  assert.match(a.run('fbUrl()'), /%C2%B7%20EN$/);
  const html = about(a);
  assert.match(html, /<a class="btn ic" href="https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSf-Abc_123\/viewform\?usp=pp_url&amp;entry\.123456=/);
  assert.match(html, /target="_blank" rel="noopener"/);
  assert.doesNotMatch(html, /data-action="feedback"/);
});

test('short links and forms without a version field are used as they are', () => {
  const a = app();
  a.run("FB.form='https://forms.gle/AbC123xyz'");
  assert.equal(a.run('fbUrl()'), 'https://forms.gle/AbC123xyz');
  a.run(`FB.form='${FORM}';FB.ver='bad'`);
  assert.equal(a.run('fbUrl()'), FORM);
});

test('only Google Forms links are accepted for feedback', () => {
  const a = app();
  for (const bad of ['javascript:alert(1)', 'http://docs.google.com/forms/d/e/x/viewform', 'https://evil.example/forms/d/e/x/viewform', 'https://docs.google.com/forms/d/e/x/viewform"><script>']) {
    a.run(`FB.form=${JSON.stringify(bad)}`);
    assert.equal(a.run('fbUrl()'), '', bad);
  }
});

test('Vercel Web Analytics loads from the same origin and the CSP allows only same-origin beacons', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<script src="\/_vercel\/insights\/script\.js" defer><\/script>/);
  const header = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).headers[0].headers.find(x => x.key === 'Content-Security-Policy').value;
  const meta = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  for (const csp of [header, meta]) {
    assert.match(csp, /connect-src 'self';/);
    assert.doesNotMatch(csp.split('script-src ')[1].split(';')[0], /unsafe-inline|unsafe-eval|vercel-insights|va\.vercel/);
  }
});
