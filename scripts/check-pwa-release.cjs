const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lunest-release-test-'));
try {
  const bundleDirectory = path.join(directory, 'dist/_expo/static/js/web');
  fs.mkdirSync(bundleDirectory, { recursive: true });
  const bundle = path.join(bundleDirectory, 'entry-test.js');
  const worker = path.join(directory, 'dist/sw.js');
  fs.writeFileSync(bundle, 'release one');
  fs.writeFileSync(worker, "const CACHE_NAME = 'lunest-pwa-v7';");
  const stamp = () => execFileSync(process.execPath, [path.resolve('scripts/stamp-web-release.cjs')], {cwd: directory});
  stamp(); const first = fs.readFileSync(worker, 'utf8');
  stamp(); assert.equal(fs.readFileSync(worker, 'utf8'), first);
  fs.writeFileSync(bundle, 'release two');
  stamp(); assert.notEqual(fs.readFileSync(worker, 'utf8'), first);
} finally { fs.rmSync(directory, {recursive:true,force:true}); }
const template = fs.readFileSync('app/+html.jsx', 'utf8');
const start = template.indexOf('                    // Keep the active input');
const end = template.indexOf('                    // Check for updates when user returns', start);
assert.ok(start >= 0 && end > start);
let reloads = 0;
const listeners = {};
const document = {activeElement: {tagName:'INPUT'}, addEventListener:(name,fn) => {listeners[name]=fn;}};
vm.runInNewContext(template.slice(start,end), {
  document, navigator:{serviceWorker:{addEventListener:(name,fn) => {listeners[name]=fn;}}},
  window:{location:{reload:()=>reloads++}},setTimeout:fn=>fn(),
});
listeners.controllerchange();assert.equal(reloads,0);
listeners.focusout();assert.equal(reloads,0);
document.activeElement={tagName:'TEXTAREA'};listeners.focusout();assert.equal(reloads,0);
document.activeElement={tagName:'BODY'};listeners.focusout();assert.equal(reloads,1);
listeners.controllerchange();assert.equal(reloads,1);
console.log('PASS: every changed web bundle updates the worker version; active inputs defer update reloads.');
