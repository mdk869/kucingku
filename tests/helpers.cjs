const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const seed = { cats: [{ id: 'a', name: 'Milo', dob: '2024-01-01' }], recs: [], vets: [], bk: 0 };

// Run the real app script with deterministic time and isolated browser adapters.
function app({ data = seed, failSave = false, raw, failRead = false, settings: initialSettings = null, ua = 'Android Mobile', media = () => true, standalone, extra = {} } = {}) {
  let stored = raw === undefined ? JSON.stringify(data) : raw, settings = initialSettings === null ? null : JSON.stringify(initialSettings);
  let writes = 0;
  const other = new Map();
  const elements = new Map(), scripts = [], timers = new Map(), events = {};
  const element = () => ({ hidden: true, innerHTML: '', textContent: '', insertAdjacentHTML(_, text) { this.innerHTML = text + this.innerHTML; } });
  const document = {
    addEventListener(name, handler) { events[name] = handler; },
    querySelector(selector) { if (!elements.has(selector)) elements.set(selector, element()); return elements.get(selector); },
    createElement() { return { remove() { this.removed = true; } }; },
    head: { appendChild(script) { scripts.push(script); } },
  };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-11T04:00:00Z'])); }
    static now() { return +new Date('2026-10-11T04:00:00Z'); }
  }
  const context = vm.createContext({
    Date: Clock, Blob, URL, document, navigator: { userAgent: ua, standalone }, screen: { width: 400, height: 800 },
    matchMedia: query => ({ matches: media(query) }), ...extra, scrollTo() {},
    setTimeout(fn) { const id = timers.size + 1; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
    FormData: class { constructor(values) { return new Map(Object.entries(values).filter(([key]) => key !== 'dataset')); } },
    localStorage: {
      getItem(key) { if (failRead) throw new Error('SecurityError'); if (key.startsWith('kucingku-install')) return other.get(key) ?? null; return key === 'kucingku-settings-v1' ? settings : stored; },
      removeItem(key) { other.delete(key); },
      setItem(key, value) { if (failSave) throw new Error('QuotaExceededError'); if (key.startsWith('kucingku-install')) { other.set(key, value); return; } if (key === 'kucingku-settings-v1') settings = value; else { stored = value; writes++; } },
    },
  });
  vm.runInContext(source, context);
  vm.runInContext("globalThis.messages=[];toast=m=>messages.push(m);cid='a';", context);
  const run = code => vm.runInContext(code, context);
  const json = code => JSON.parse(JSON.stringify(run(code)));
  const submit = (fn, values, args = '') => run(`${fn}({preventDefault(){},target:${JSON.stringify(values)}}${args ? ',' + args : ''})`);
  return { run, json, submit, scripts, timers, elements, events, storage: () => stored, settings: () => settings, writes: () => writes };
}


module.exports = { app, seed, html, source, fs, path };
