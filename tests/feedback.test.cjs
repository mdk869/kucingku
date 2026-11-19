const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./helpers.cjs');

const root = path.join(__dirname, '..');
const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSf-Abc_123/viewform';
const about = a => a.run("ssub='tentang';setv()");

test('the shipped form is the Kucingku feedback form; a report link prefills Masalah and the app version', () => {
  const a = app();
  const base = 'https://docs.google.com/forms/d/e/1FAIpQLSfK5e5iSrBBUDWH5bMCLIxYPe6dWAKIaNkdOt_UXYqnKObJyw/viewform';
  assert.equal(a.run('fbUrl()'), base + '?usp=pp_url&entry.1022943400=' + encodeURIComponent('Kucingku v' + a.run('VER') + ' · BM'));
  assert.equal(a.run("fbUrl('Ralat: x')"), base + '?usp=pp_url&entry.987852967=Masalah&entry.1022943400=' + encodeURIComponent('Kucingku v' + a.run('VER') + ' · BM · Ralat: x'));
  assert.equal(a.run('fbPost()'), base.replace(/viewform$/, 'formResponse'));
});

test('without a configured form, the feedback button explains the form is not ready', () => {
  const a = app();
  a.run("FB.form=''");
  assert.equal(a.run('fbUrl()'), '');
  const html = about(a);
  assert.match(html, /data-action="fbForm"/);
  assert.match(html, /Privasi/);
  a.run("fbForm()");
  assert.deepEqual(a.json('messages'), ['Borang maklum balas belum tersedia. Cuba lagi kemudian.']);
});

test('a form link that cannot be filled in from the app opens in a new tab instead', () => {
  const a = app();
  a.run(`FB.form='${FORM}';FB.ver='entry.123456';FB.jen='bad'`);
  assert.equal(a.run('fbPost()'), '');
  a.run('globalThis.__op=[];open=(u,t)=>__op.push(u)');
  a.run('fbForm()');
  assert.equal(a.json('__op').length, 1);
  assert.match(a.json('__op')[0], /^https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSf-Abc_123\/viewform\?usp=pp_url&entry\.123456=/);
  a.run("setLang('en')");
  assert.match(a.run('fbUrl()'), /%C2%B7%20EN$/);
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
    assert.match(csp, /connect-src 'self' https:\/\/docs\.google\.com;/);
    assert.doesNotMatch(csp.split('script-src ')[1].split(';')[0], /unsafe-inline|unsafe-eval|vercel-insights|va\.vercel/);
  }
});
